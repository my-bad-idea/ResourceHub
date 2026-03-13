import { join } from 'path'
import { fileURLToPath } from 'url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import staticPlugin from '@fastify/static'
import { runMigrations, seedDemoAdminAndData } from './db/migrate.js'
import { ensureRsaKeyPair } from './services/rsa.js'
import authPlugin from './plugins/auth.js'
import adminPlugin from './plugins/admin.js'
import authRoutes from './routes/auth.js'
import categoriesRoutes from './routes/categories.js'
import tagsRoutes from './routes/tags.js'
import resourcesRoutes from './routes/resources.js'
import usersRoutes from './routes/users.js'
import configRoutes from './routes/config.js'

const PORT = parseInt(process.env.PORT ?? '3000', 10)
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'
const NODE_ENV = process.env.NODE_ENV ?? 'development'

export async function buildApp() {
  runMigrations()
  ensureRsaKeyPair()

  if (process.env.SEED_DEMO === '1') {
    await seedDemoAdminAndData()
  }

  const fastify = Fastify({
    logger: NODE_ENV === 'development' ? { level: 'info' } : false,
  })

  await fastify.register(cors, {
    origin: NODE_ENV === 'development' ? true : false,
    credentials: true,
  })

  await fastify.register(jwt, { secret: JWT_SECRET })

  await fastify.register(staticPlugin, {
    root: join(process.cwd(), 'public'),
    prefix: '/',
  })

  await fastify.register(authPlugin)
  await fastify.register(adminPlugin)

  await fastify.register(authRoutes,       { prefix: '/api/auth' })
  await fastify.register(categoriesRoutes, { prefix: '/api/categories' })
  await fastify.register(tagsRoutes,       { prefix: '/api/tags' })
  await fastify.register(resourcesRoutes,  { prefix: '/api/resources' })
  await fastify.register(usersRoutes,      { prefix: '/api/users' })
  await fastify.register(configRoutes,     { prefix: '/api/config' })

  return fastify
}

export async function startServer() {
  const fastify = await buildApp()
  await fastify.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`Server listening at http://0.0.0.0:${PORT}`)
  return fastify
}

const entryPath = process.argv[1]
const isMain = entryPath && fileURLToPath(import.meta.url) === entryPath

if (isMain) {
  startServer().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
