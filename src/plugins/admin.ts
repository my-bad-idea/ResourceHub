import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { getRequestLocale, localizeText } from '../i18n.js'

const adminPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply)
    if (reply.sent) return

    if (request.user.role !== 'admin') {
      const locale = getRequestLocale(request)
      reply.code(403).send({
        success: false,
        error: localizeText(locale, '权限不足'),
        code: 'PERMISSION_DENIED',
      })
    }
  })
}

export default fp(adminPlugin)
