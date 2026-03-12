import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { resourceTags } from '../db/schema.js'
import { eq, sql, desc } from 'drizzle-orm'
import { getRequestLocale, localizeText } from '../i18n.js'

function sendError(
  reply: FastifyReply,
  locale: ReturnType<typeof getRequestLocale>,
  status: number,
  error: string,
  code: string
) {
  reply.code(status).send({ success: false, error: localizeText(locale, error), code })
}

const tagsRoutes: FastifyPluginAsync = async (fastify) => {

  // GET / — public, count across all resources (no visibility filter)
  fastify.get('/', async (_req, reply) => {
    const rows = db
      .select({ tag: resourceTags.tag, count: sql<number>`count(*)`.as('count') })
      .from(resourceTags)
      .groupBy(resourceTags.tag)
      .orderBy(desc(sql`count(*)`))
      .all()
    reply.send({ success: true, data: rows })
  })

  // DELETE /:tag — admin
  fastify.delete('/:tag', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const { tag } = req.params as { tag: string }

    const countRow = db
      .select({ count: sql<number>`count(distinct resource_id)` })
      .from(resourceTags)
      .where(eq(resourceTags.tag, tag))
      .get()
    const affectedResources = countRow?.count ?? 0

    db.delete(resourceTags).where(eq(resourceTags.tag, tag)).run()
    reply.send({
      success: true,
      data: { message: localizeText(locale, '删除成功'), affectedResources },
    })
  })
}

export default tagsRoutes
