import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

const adminPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.authenticate(request, reply)
    if (reply.sent) return

    if (request.user.role !== 'admin') {
      reply.code(403).send({ success: false, error: '权限不足', code: 'PERMISSION_DENIED' })
    }
  })
}

export default fp(adminPlugin)
