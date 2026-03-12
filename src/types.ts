import type { FastifyReply, FastifyRequest } from 'fastify'

export interface JwtPayload {
  userId: string
  role: 'admin' | 'user'
}

export interface EmailPreview {
  to: string
  subject: string
  body: string
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
