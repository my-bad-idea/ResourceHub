import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { users, resources, emailConfig } from '../db/schema.js'
import { eq, ne, and } from 'drizzle-orm'
import { deliverMail } from '../services/mail.js'
import {
  getAdminResetPasswordMail,
  getRequestLocale,
  localizeFields,
  localizeText,
} from '../i18n.js'

function sendError(
  reply: FastifyReply,
  locale: ReturnType<typeof getRequestLocale>,
  status: number,
  error: string,
  code: string,
  fields?: Record<string, string>
) {
  const body: Record<string, unknown> = { success: false, error: localizeText(locale, error), code }
  if (fields) body.fields = localizeFields(locale, fields)
  reply.code(status).send(body)
}

function validateUsername(v: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]{2,19}$/.test(v)
}

function validatePassword(v: string): boolean {
  return v.length >= 8 && v.length <= 64 && /[a-zA-Z]/.test(v) && /[0-9]/.test(v)
}

function validateEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function validateDisplayName(v: string): boolean {
  return typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= 30
}

function generateTempPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const rand = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return rand(upper, 4) + rand(digits, 4) + rand(lower, 4)
}

function formatUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
  }
}

function getEmailRow() {
  return db.select().from(emailConfig).where(eq(emailConfig.id, 'default')).get()
}

const usersRoutes: FastifyPluginAsync = async (fastify) => {

  // GET / — admin: list all users (no passwordHash)
  fastify.get('/', { preHandler: fastify.requireAdmin }, async (_req, reply) => {
    const rows = db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    }).from(users).all()
    reply.send({ success: true, data: rows })
  })

  // POST / — admin: create user directly with provided password, no email sent
  fastify.post('/', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const { username, displayName, email, password, role } = req.body as {
      username: string
      displayName: string
      email: string
      password: string
      role?: 'admin' | 'user'
    }

    const fields: Record<string, string> = {}
    if (!username || !validateUsername(username)) fields.username = '用户名格式不正确（3-20字符，字母/数字/下划线，不能以数字开头）'
    if (!displayName || !validateDisplayName(displayName)) fields.displayName = '显示名称须为1-30字符'
    if (!email || !validateEmail(email)) fields.email = '邮箱格式不正确'
    if (!password || !validatePassword(password)) fields.password = '密码须为8-64字符，且同时包含字母和数字'
    if (Object.keys(fields).length > 0) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', fields)
    }

    const existingUsername = db.select().from(users).where(eq(users.username, username)).get()
    if (existingUsername) return sendError(reply, locale, 422, '用户名已被占用', 'USERNAME_TAKEN')

    const existingEmail = db.select().from(users).where(eq(users.email, email)).get()
    if (existingEmail) return sendError(reply, locale, 422, '邮箱已被注册', 'EMAIL_TAKEN')

    const passwordHash = await bcrypt.hash(password, 10)
    const now = Math.floor(Date.now() / 1000)
    const id = uuidv4()
    db.insert(users).values({
      id,
      username,
      displayName,
      email,
      role: role === 'admin' ? 'admin' : 'user',
      status: 'active',
      passwordHash,
      createdAt: now,
    }).run()

    const newUser = db.select().from(users).where(eq(users.id, id)).get()!
    reply.code(201).send({ success: true, data: formatUser(newUser) })
  })

  // PUT /:id — admin: edit user fields
  fastify.put('/:id', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const { id } = req.params as { id: string }
    const user = db.select().from(users).where(eq(users.id, id)).get()
    if (!user) return sendError(reply, locale, 404, '用户不存在', 'USER_NOT_FOUND')

    const { displayName, email, role, status } = req.body as {
      displayName?: string
      email?: string
      role?: 'admin' | 'user'
      status?: 'active' | 'disabled'
    }

    const updates: Partial<typeof users.$inferInsert> = {}

    if (displayName !== undefined) {
      if (!validateDisplayName(displayName)) {
        return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', { displayName: '显示名称须为1-30字符' })
      }
      updates.displayName = displayName
    }

    if (email !== undefined) {
      if (!validateEmail(email)) {
        return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', { email: '邮箱格式不正确' })
      }
      const dup = db.select().from(users)
        .where(and(eq(users.email, email), ne(users.id, id)))
        .get()
      if (dup) return sendError(reply, locale, 422, '邮箱已被注册', 'EMAIL_TAKEN')
      updates.email = email
    }

    if (role !== undefined) updates.role = role
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length > 0) {
      db.update(users).set(updates).where(eq(users.id, id)).run()
    }

    const updated = db.select().from(users).where(eq(users.id, id)).get()!
    reply.send({ success: true, data: formatUser(updated) })
  })

  // DELETE /:id — admin: transfer resources to admin then delete user
  fastify.delete('/:id', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const { id } = req.params as { id: string }

    if (id === req.user.userId) {
      return sendError(reply, locale, 422, '不能删除自身账号', 'CANNOT_DELETE_SELF')
    }

    const user = db.select().from(users).where(eq(users.id, id)).get()
    if (!user) return sendError(reply, locale, 404, '用户不存在', 'USER_NOT_FOUND')

    // Transfer user's resources to the performing admin to avoid FK constraint
    db.update(resources).set({ ownerId: req.user.userId }).where(eq(resources.ownerId, id)).run()
    db.delete(users).where(eq(users.id, id)).run()

    reply.send({ success: true, data: { message: localizeText(locale, '删除成功') } })
  })

  // POST /:id/reset-password — admin: auto-generate and send new password
  fastify.post('/:id/reset-password', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const { id } = req.params as { id: string }
    const user = db.select().from(users).where(eq(users.id, id)).get()
    if (!user) return sendError(reply, locale, 404, '用户不存在', 'USER_NOT_FOUND')

    const newPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(newPassword, 10)
    db.update(users).set({ passwordHash }).where(eq(users.id, id)).run()

    const mailConfig = getEmailRow()
    const { subject, body } = getAdminResetPasswordMail(locale, user.displayName, newPassword)
    const preview = await deliverMail(user.email, subject, body, {
      smtpHost: mailConfig?.smtpHost ?? '',
      smtpPort: mailConfig?.smtpPort ?? 465,
      encryption: mailConfig?.encryption ?? 'ssl',
      fromEmail: mailConfig?.fromEmail ?? '',
      fromName: mailConfig?.fromName ?? '资源导航系统',
      smtpUser: mailConfig?.smtpUser ?? '',
      smtpPassword: mailConfig?.smtpPassword ?? '',
    })

    const response: Record<string, unknown> = {
      success: true,
      data: { message: localizeText(locale, '密码已重置') },
    }
    if (preview) response.emailPreview = preview
    reply.send(response)
  })
}

export default usersRoutes
