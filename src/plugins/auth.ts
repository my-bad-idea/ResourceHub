import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ success: false, error: '缺少 Authorization header', code: 'TOKEN_MISSING' })
      return
    }

    const token = authHeader.slice(7)
    try {
      const payload = fastify.jwt.verify<{ userId: string; role: 'admin' | 'user' }>(token)
      // Check user is still active
      const user = db.select().from(users).where(eq(users.id, payload.userId)).get()
      if (!user) {
        reply.code(401).send({ success: false, error: 'token 无效或已过期', code: 'TOKEN_INVALID' })
        return
      }
      if (user.status === 'disabled') {
        reply.code(403).send({ success: false, error: '账号已被禁用', code: 'ACCOUNT_DISABLED' })
        return
      }
      request.user = { userId: payload.userId, role: payload.role }
    } catch {
      reply.code(401).send({ success: false, error: 'token 无效或已过期', code: 'TOKEN_INVALID' })
    }
  })
}

export default fp(authPlugin)
