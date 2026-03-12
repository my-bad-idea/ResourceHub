import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { resources, resourceTags, favorites, visitHistory, visitHourly, categories, users } from '../db/schema.js'
import { eq, and, or, sql, inArray, like, asc, desc } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

// ── Helpers ──────────────────────────────────────────────────────────────────

function sendError(reply: FastifyReply, status: number, error: string, code: string) {
  reply.code(status).send({ success: false, error, code })
}

function validateUrl(v: string): boolean {
  return /^https?:\/\//.test(v)
}

/** Try to extract userId/role from Bearer token without throwing on failure. */
function parseOptionalUser(
  fastify: { jwt: { verify: <T>(token: string) => T } },
  req: FastifyRequest
): { userId: string | null; role: 'admin' | 'user' | null } {
  try {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) {
      const p = fastify.jwt.verify<{ userId: string; role: string }>(auth.slice(7))
      const user = db.select({
        id: users.id,
        role: users.role,
        status: users.status,
      }).from(users).where(eq(users.id, p.userId)).get()
      if (!user || user.status === 'disabled') {
        return { userId: null, role: null }
      }
      return { userId: user.id, role: user.role }
    }
  } catch {}
  return { userId: null, role: null }
}

function getVisitHourBucket(timestamp: number): number {
  return Math.floor(timestamp / 3600) * 3600
}

/** Build visibility WHERE condition based on auth level. Returns undefined for admin (no filter). */
function buildVisibilityCond(userId: string | null, role: string | null): SQL | undefined {
  if (role === 'admin') return undefined
  if (userId) {
    return or(
      and(eq(resources.visibility, 'public'), eq(resources.enabled, true)),
      eq(resources.ownerId, userId)
    ) as SQL
  }
  return and(eq(resources.visibility, 'public'), eq(resources.enabled, true)) as SQL
}

/** Batch-load tags for a set of resource IDs. */
function batchFetchTags(resourceIds: string[]): Map<string, string[]> {
  if (resourceIds.length === 0) return new Map()
  const rows = db.select().from(resourceTags)
    .where(inArray(resourceTags.resourceId, resourceIds))
    .all()
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const arr = map.get(row.resourceId) ?? []
    arr.push(row.tag)
    map.set(row.resourceId, arr)
  }
  return map
}

/** Batch-load categories for a set of category IDs. */
function batchFetchCategories(categoryIds: (string | null)[]): Map<string, { name: string; color: string }> {
  const validIds = [...new Set(categoryIds.filter((id): id is string => id !== null))]
  if (validIds.length === 0) return new Map()
  const rows = db.select().from(categories).where(inArray(categories.id, validIds)).all()
  return new Map(rows.map((c) => [c.id, { name: c.name, color: c.color }]))
}

/** Get the set of resource IDs favorited by a user. */
function fetchFavoritedSet(userId: string | null): Set<string> {
  if (!userId) return new Set()
  const rows = db.select({ resourceId: favorites.resourceId })
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .all()
  return new Set(rows.map((f) => f.resourceId))
}

/** Build the full API resource object from a DB row + lookup maps. */
function buildResourceResponse(
  resource: typeof resources.$inferSelect,
  categoryMap: Map<string, { name: string; color: string }>,
  tagMap: Map<string, string[]>,
  favoritedSet: Set<string>
) {
  const cat = resource.categoryId ? categoryMap.get(resource.categoryId) : null
  return {
    id: resource.id,
    name: resource.name,
    url: resource.url,
    categoryId: resource.categoryId,
    categoryName: cat?.name ?? null,
    categoryColor: cat?.color ?? null,
    visibility: resource.visibility,
    logoUrl: resource.logoUrl,
    description: resource.description,
    enabled: resource.enabled,
    ownerId: resource.ownerId,
    visitCount: resource.visitCount || 0,
    tags: tagMap.get(resource.id) ?? [],
    isFavorited: favoritedSet.has(resource.id),
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  }
}

/** Check whether a resource is visible to a given user (for single-resource access). */
function isVisible(
  resource: typeof resources.$inferSelect,
  userId: string | null,
  role: string | null
): boolean {
  if (role === 'admin') return true
  if (!userId) return resource.visibility === 'public' && resource.enabled
  return (resource.visibility === 'public' && resource.enabled) || resource.ownerId === userId
}

// ── Route plugin ──────────────────────────────────────────────────────────────

const resourcesRoutes: FastifyPluginAsync = async (fastify) => {

  // ── GET / — resource list (optional auth, visibility-aware) ─────────────────
  fastify.get('/', async (req, reply) => {
    const { userId, role } = parseOptionalUser(fastify as any, req)
    const query = req.query as Record<string, string>
    const q = query.q?.trim() || ''
    const category = query.category?.trim() || ''
    const tagsParam = query.tags?.trim() || ''
    const sort = query.sort || 'hot'

    const tagList = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : []

    const sortMap: Record<string, SQL> = {
      createdAt: desc(resources.createdAt) as SQL,
      updatedAt: desc(resources.updatedAt) as SQL,
    }
    const orderCol = sortMap[sort] ?? sortMap.updatedAt

    const conditions: SQL[] = []
    const visCond = buildVisibilityCond(userId, role)
    if (visCond) conditions.push(visCond)
    if (category) conditions.push(eq(resources.categoryId, category) as SQL)
    if (q) {
      conditions.push(or(
        like(resources.name, `%${q}%`),
        like(resources.description, `%${q}%`),
        like(resources.url, `%${q}%`),
        sql`EXISTS (SELECT 1 FROM resource_tags rt WHERE rt.resource_id = ${resources.id} AND rt.tag LIKE ${'%' + q + '%'})`
      ) as SQL)
    }
    for (const tag of tagList) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM resource_tags rt WHERE rt.resource_id = ${resources.id} AND rt.tag = ${tag})` as SQL
      )
    }

    const rows = conditions.length > 0
      ? db.select().from(resources).where(and(...conditions)).orderBy(orderCol).all()
      : db.select().from(resources).orderBy(orderCol).all()

    const ids = rows.map((r) => r.id)
    const tagMap = batchFetchTags(ids)
    const categoryMap = batchFetchCategories(rows.map((r) => r.categoryId))
    const favoritedSet = fetchFavoritedSet(userId)

    const data = rows
      .map((r) => buildResourceResponse(r, categoryMap, tagMap, favoritedSet))
      .sort((a, b) => {
        if (sort === 'createdAt') return (b.createdAt || 0) - (a.createdAt || 0)
        if (sort === 'updatedAt') return (b.updatedAt || 0) - (a.updatedAt || 0)
        return (b.visitCount || 0) - (a.visitCount || 0) || (b.updatedAt || 0) - (a.updatedAt || 0)
      })
    reply.send({ success: true, data })
  })

  // ── GET /analytics — global hourly visit summary ───────────────────────────
  fastify.get('/analytics', async (_req, reply) => {
    const now = Math.floor(Date.now() / 1000)
    const recent30Threshold = now - 30 * 24 * 3600
    const recent24Threshold = now - 24 * 3600

    const hourlyRows = db.select({
      visitHour: visitHourly.visitHour,
      visitCount: visitHourly.visitCount,
    }).from(visitHourly).all()

    const totalVisits = hourlyRows.reduce((sum, row) => sum + (row.visitCount || 0), 0)
    const monthlyVisits = hourlyRows.reduce(
      (sum, row) => sum + (row.visitHour >= recent30Threshold ? row.visitCount : 0),
      0
    )
    const dailyVisits = hourlyRows.reduce(
      (sum, row) => sum + (row.visitHour >= recent24Threshold ? row.visitCount : 0),
      0
    )

    reply.send({
      success: true,
      data: {
        totalVisits,
        monthlyVisits,
        dailyVisits,
      },
    })
  })

  // ── POST /analytics/visit — record homepage visit ─────────────────────────
  fastify.post('/analytics/visit', async (_req, reply) => {
    const now = Math.floor(Date.now() / 1000)
    const visitHour = getVisitHourBucket(now)

    db.insert(visitHourly)
      .values({ visitHour, visitCount: 1 })
      .onConflictDoUpdate({
        target: [visitHourly.visitHour],
        set: { visitCount: sql`${visitHourly.visitCount} + 1` },
      })
      .run()

    reply.send({ success: true, data: { ok: true } })
  })

  // ── POST / — create resource ────────────────────────────────────────────────
  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const { name, url, categoryId, visibility, logoUrl, description, tags, enabled } = body as {
      name: string
      url: string
      categoryId?: string
      visibility?: 'public' | 'private'
      logoUrl?: string
      description?: string
      tags?: string[]
      enabled?: boolean
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
      return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
    }
    if (!url || !validateUrl(url)) {
      return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
    }
    if (logoUrl && logoUrl !== '' && !validateUrl(logoUrl)) {
      return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
    }
    if (description !== undefined && description.length > 200) {
      return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
    }
    if (tags !== undefined) {
      if (!Array.isArray(tags) || tags.length > 10) {
        return sendError(reply, 422, '标签最多 10 个', 'VALIDATION_ERROR')
      }
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length < 1 || tag.length > 20 || /\s/.test(tag)) {
          return sendError(reply, 422, '标签格式不正确（1-20字符，不可含空格）', 'VALIDATION_ERROR')
        }
      }
    }

    // Validate categoryId if provided
    if (categoryId) {
      const cat = db.select().from(categories).where(eq(categories.id, categoryId)).get()
      if (!cat) return sendError(reply, 422, '类别不存在', 'CATEGORY_NOT_FOUND')
    }

    const now = Math.floor(Date.now() / 1000)
    const id = uuidv4()
    db.insert(resources).values({
      id,
      name: name.trim(),
      url,
      categoryId: categoryId ?? null,
      visibility: visibility ?? 'public',
      logoUrl: logoUrl ?? '',
      description: description ?? '',
      enabled: enabled ?? true,
      ownerId: req.user.userId,
      visitCount: 0,
      createdAt: now,
      updatedAt: now,
    }).run()

    // Insert tags (deduplicated)
    const uniqueTags = [...new Set(tags ?? [])]
    for (const tag of uniqueTags) {
      db.insert(resourceTags).values({ resourceId: id, tag }).onConflictDoNothing().run()
    }

    const resource = db.select().from(resources).where(eq(resources.id, id)).get()!
    const tagMap = batchFetchTags([id])
    const categoryMap = batchFetchCategories([resource.categoryId])
    const favoritedSet = fetchFavoritedSet(req.user.userId)

    reply.code(201).send({
      success: true,
      data: buildResourceResponse(resource, categoryMap, tagMap, favoritedSet),
    })
  })

  // ── GET /favorites — user's favorite resources ──────────────────────────────
  fastify.get('/favorites', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user.userId

    const favRows = db.select().from(favorites)
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt))
      .all()

    if (favRows.length === 0) {
      return reply.send({ success: true, data: [] })
    }

    const resourceIds = favRows.map((f) => f.resourceId)
    const resourceRows = db.select().from(resources)
      .where(inArray(resources.id, resourceIds))
      .all()

    const resourceMap = new Map(resourceRows.map((r) => [r.id, r]))
    const tagMap = batchFetchTags(resourceIds)
    const categoryMap = batchFetchCategories(resourceRows.map((r) => r.categoryId))
    const favoritedSet = new Set(resourceIds)

    // Return in favorites order (createdAt desc)
    const data = resourceIds
      .map((id) => resourceMap.get(id))
      .filter((r): r is typeof resources.$inferSelect => r !== undefined)
      .map((r) => buildResourceResponse(r, categoryMap, tagMap, favoritedSet))

    reply.send({ success: true, data })
  })

  // ── GET /history — user's visit history ────────────────────────────────────
  fastify.get('/history', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user.userId

    const histRows = db.select().from(visitHistory)
      .where(eq(visitHistory.userId, userId))
      .orderBy(desc(visitHistory.visitedAt))
      .all()

    if (histRows.length === 0) {
      return reply.send({ success: true, data: [] })
    }

    const resourceIds = histRows.map((h) => h.resourceId)
    const uniqueIds = [...new Set(resourceIds)]
    const resourceRows = db.select().from(resources)
      .where(inArray(resources.id, uniqueIds))
      .all()

    const resourceMap = new Map(resourceRows.map((r) => [r.id, r]))
    const tagMap = batchFetchTags(uniqueIds)
    const categoryMap = batchFetchCategories(resourceRows.map((r) => r.categoryId))
    const favoritedSet = fetchFavoritedSet(userId)

    // Return in history order (visitedAt desc), same resource can appear multiple times
    const data = resourceIds
      .map((id) => resourceMap.get(id))
      .filter((r): r is typeof resources.$inferSelect => r !== undefined)
      .map((r) => buildResourceResponse(r, categoryMap, tagMap, favoritedSet))

    reply.send({ success: true, data })
  })

  // ── GET /mine — resources created by current user ──────────────────────────
  fastify.get('/mine', { preHandler: fastify.authenticate }, async (req, reply) => {
    const userId = req.user.userId

    const rows = db.select().from(resources)
      .where(eq(resources.ownerId, userId))
      .orderBy(desc(resources.createdAt))
      .all()

    const ids = rows.map((r) => r.id)
    const tagMap = batchFetchTags(ids)
    const categoryMap = batchFetchCategories(rows.map((r) => r.categoryId))
    const favoritedSet = fetchFavoritedSet(userId)

    const data = rows.map((r) => buildResourceResponse(r, categoryMap, tagMap, favoritedSet))
    reply.send({ success: true, data })
  })

  // ── PUT /:id — edit resource (owner or admin) ───────────────────────────────
  fastify.put('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user

    const resource = db.select().from(resources).where(eq(resources.id, id)).get()
    if (!resource) return sendError(reply, 404, '资源不存在', 'RESOURCE_NOT_FOUND')
    if (role !== 'admin' && resource.ownerId !== userId) {
      return sendError(reply, 403, '权限不足', 'PERMISSION_DENIED')
    }

    const body = req.body as Record<string, unknown>
    const updates: Partial<typeof resources.$inferInsert> = {}

    if (body.name !== undefined) {
      const name = body.name as string
      if (!name || name.trim().length < 1 || name.trim().length > 50) {
        return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
      }
      updates.name = name.trim()
    }
    if (body.url !== undefined) {
      if (!validateUrl(body.url as string)) {
        return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
      }
      updates.url = body.url as string
    }
    if (body.logoUrl !== undefined) {
      const rawLogoUrl = body.logoUrl
      if (rawLogoUrl !== null && typeof rawLogoUrl !== 'string') {
        return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
      }
      const logoUrl = typeof rawLogoUrl === 'string' ? rawLogoUrl : ''
      if (logoUrl !== '' && !validateUrl(logoUrl)) {
        return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
      }
      updates.logoUrl = logoUrl
    }
    if (body.description !== undefined) {
      if ((body.description as string).length > 200) {
        return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
      }
      updates.description = body.description as string
    }
    if (body.categoryId !== undefined) {
      const catId = body.categoryId as string | null
      if (catId) {
        const cat = db.select().from(categories).where(eq(categories.id, catId)).get()
        if (!cat) return sendError(reply, 422, '类别不存在', 'CATEGORY_NOT_FOUND')
      }
      updates.categoryId = catId
    }
    if (body.visibility !== undefined) updates.visibility = body.visibility as 'public' | 'private'
    if (body.enabled !== undefined) updates.enabled = body.enabled as boolean

    // Validate and replace tags if provided
    let newTags: string[] | undefined
    if (body.tags !== undefined) {
      const tags = body.tags as string[]
      if (!Array.isArray(tags) || tags.length > 10) {
        return sendError(reply, 422, '标签最多 10 个', 'VALIDATION_ERROR')
      }
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length < 1 || tag.length > 20 || /\s/.test(tag)) {
          return sendError(reply, 422, '标签格式不正确（1-20字符，不可含空格）', 'VALIDATION_ERROR')
        }
      }
      newTags = [...new Set(tags)]
    }

    updates.updatedAt = Math.floor(Date.now() / 1000)

    if (Object.keys(updates).length > 0) {
      db.update(resources).set(updates).where(eq(resources.id, id)).run()
    }

    // Full replace tags if provided
    if (newTags !== undefined) {
      db.delete(resourceTags).where(eq(resourceTags.resourceId, id)).run()
      for (const tag of newTags) {
        db.insert(resourceTags).values({ resourceId: id, tag }).onConflictDoNothing().run()
      }
    }

    const updated = db.select().from(resources).where(eq(resources.id, id)).get()!
    const tagMap = batchFetchTags([id])
    const categoryMap = batchFetchCategories([updated.categoryId])
    const favoritedSet = fetchFavoritedSet(userId)

    reply.send({ success: true, data: buildResourceResponse(updated, categoryMap, tagMap, favoritedSet) })
  })

  // ── DELETE /:id — delete resource (owner or admin) ─────────────────────────
  fastify.delete('/:id', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user

    const resource = db.select().from(resources).where(eq(resources.id, id)).get()
    if (!resource) return sendError(reply, 404, '资源不存在', 'RESOURCE_NOT_FOUND')
    if (role !== 'admin' && resource.ownerId !== userId) {
      return sendError(reply, 403, '权限不足', 'PERMISSION_DENIED')
    }

    db.delete(resources).where(eq(resources.id, id)).run()
    reply.send({ success: true, data: { message: '删除成功' } })
  })

  // ── POST /:id/visit — record a visit ────────────────────────────────────────
  fastify.post('/:id/visit', async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = parseOptionalUser(fastify as any, req)

    const resource = db.select().from(resources).where(eq(resources.id, id)).get()
    if (!resource || !isVisible(resource, userId, role)) {
      return sendError(reply, 404, '资源不存在', 'RESOURCE_NOT_FOUND')
    }

    const now = Math.floor(Date.now() / 1000)
    db.update(resources)
      .set({ visitCount: sql`${resources.visitCount} + 1` })
      .where(eq(resources.id, id))
      .run()

    if (userId) {
      db.insert(visitHistory).values({ userId, resourceId: id, visitedAt: now }).run()

      // Cap visit history at 200 per user
      const histRows = db.select({ id: visitHistory.id })
        .from(visitHistory)
        .where(eq(visitHistory.userId, userId))
        .orderBy(asc(visitHistory.id))
        .all()
      if (histRows.length > 200) {
        const toDelete = histRows.slice(0, histRows.length - 200).map((r) => r.id)
        db.delete(visitHistory).where(inArray(visitHistory.id, toDelete)).run()
      }
    }

    const updatedResource = db.select({ visitCount: resources.visitCount }).from(resources).where(eq(resources.id, id)).get()
    reply.send({ success: true, data: { visitCount: updatedResource?.visitCount || 0 } })
  })

  // ── POST /:id/favorite — toggle favorite ────────────────────────────────────
  fastify.post('/:id/favorite', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const { userId, role } = req.user

    const resource = db.select().from(resources).where(eq(resources.id, id)).get()
    if (!resource || !isVisible(resource, userId, role)) {
      return sendError(reply, 404, '资源不存在', 'RESOURCE_NOT_FOUND')
    }

    const existing = db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.resourceId, id)))
      .get()

    if (existing) {
      db.delete(favorites)
        .where(and(eq(favorites.userId, userId), eq(favorites.resourceId, id)))
        .run()
      return reply.send({ success: true, data: { isFavorited: false } })
    } else {
      const now = Math.floor(Date.now() / 1000)
      db.insert(favorites).values({ userId, resourceId: id, createdAt: now }).run()
      return reply.send({ success: true, data: { isFavorited: true } })
    }
  })
}

export default resourcesRoutes
