import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { categories, resources } from '../db/schema.js'
import { eq, ne, and, or, sql } from 'drizzle-orm'

const COLOR_POOL = ['#5856D6', '#FF9500', '#34C759', '#FF3B30', '#0071E3', '#FF2D55', '#AF52DE', '#00C7BE']

function sendError(reply: FastifyReply, status: number, error: string, code: string) {
  reply.code(status).send({ success: false, error, code })
}

function parseOptionalUser(
  fastify: { jwt: { verify: <T>(token: string) => T } },
  req: FastifyRequest
): { userId: string | null; role: string | null } {
  try {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) {
      const p = fastify.jwt.verify<{ userId: string; role: string }>(auth.slice(7))
      return { userId: p.userId, role: p.role }
    }
  } catch {}
  return { userId: null, role: null }
}

function buildVisibilityCond(userId: string | null, role: string | null) {
  if (role === 'admin') return undefined
  if (userId) {
    return or(
      and(eq(resources.visibility, 'public'), eq(resources.enabled, true)),
      eq(resources.ownerId, userId)
    )
  }
  return and(eq(resources.visibility, 'public'), eq(resources.enabled, true))
}

function countResources(catId: string, visCond: ReturnType<typeof buildVisibilityCond>): number {
  const where = visCond
    ? and(eq(resources.categoryId, catId), visCond)
    : eq(resources.categoryId, catId)
  const row = db.select({ count: sql<number>`count(*)` }).from(resources).where(where).get()
  return row?.count ?? 0
}

const categoriesRoutes: FastifyPluginAsync = async (fastify) => {

  // GET / — public, resourceCount follows visibility rules
  fastify.get('/', async (req, reply) => {
    const { userId, role } = parseOptionalUser(fastify as any, req)
    const visCond = buildVisibilityCond(userId, role)
    const rows = db.select().from(categories).all()
    const data = rows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      resourceCount: countResources(cat.id, visCond),
      createdAt: cat.createdAt,
    }))
    reply.send({ success: true, data })
  })

  // POST / — authenticate (any logged-in user)
  fastify.post('/', { preHandler: fastify.authenticate }, async (req, reply) => {
    const { name } = req.body as { name?: string }
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR')
    }

    const existing = db.select().from(categories).where(eq(categories.name, name)).get()
    if (existing) return sendError(reply, 422, '类别名称已存在', 'CATEGORY_NAME_TAKEN')

    const color = COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]
    const now = Math.floor(Date.now() / 1000)
    const id = uuidv4()
    db.insert(categories).values({ id, name, color, createdAt: now }).run()

    const newCat = db.select().from(categories).where(eq(categories.id, id)).get()!
    reply.code(201).send({ success: true, data: { ...newCat, resourceCount: 0 } })
  })

  // PUT /:id — admin
  fastify.put('/:id', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const cat = db.select().from(categories).where(eq(categories.id, id)).get()
    if (!cat) return sendError(reply, 404, '类别不存在', 'CATEGORY_NOT_FOUND')

    const { name, color } = req.body as { name?: string; color?: string }
    const updates: Partial<typeof categories.$inferInsert> = {}

    if (name !== undefined) {
      const dup = db.select().from(categories)
        .where(and(eq(categories.name, name), ne(categories.id, id)))
        .get()
      if (dup) return sendError(reply, 422, '类别名称已存在', 'CATEGORY_NAME_TAKEN')
      updates.name = name
    }
    if (color !== undefined) updates.color = color

    if (Object.keys(updates).length > 0) {
      db.update(categories).set(updates).where(eq(categories.id, id)).run()
    }

    const updated = db.select().from(categories).where(eq(categories.id, id)).get()!
    const resourceCount = countResources(id, undefined)
    reply.send({ success: true, data: { ...updated, resourceCount } })
  })

  // DELETE /:id — admin
  fastify.delete('/:id', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const cat = db.select().from(categories).where(eq(categories.id, id)).get()
    if (!cat) return sendError(reply, 404, '类别不存在', 'CATEGORY_NOT_FOUND')

    const countRow = db.select({ count: sql<number>`count(*)` }).from(resources)
      .where(eq(resources.categoryId, id)).get()
    const affectedResources = countRow?.count ?? 0

    db.delete(categories).where(eq(categories.id, id)).run()
    reply.send({ success: true, data: { message: '删除成功', affectedResources } })
  })
}

export default categoriesRoutes
