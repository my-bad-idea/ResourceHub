import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/index.js'
import { users, systemConfig, emailConfig, initialized } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { seedMockData } from '../db/migrate.js'
import { createResetToken, validateResetToken, markTokenUsed } from '../services/token.js'
import { deliverMail } from '../services/mail.js'
import {
  getForgotPasswordMail,
  getRegisterMail,
  getRequestLocale,
  getResetTokenErrorMessage,
  localizeFields,
  localizeText,
} from '../i18n.js'

// ── Validators ──────────────────────────────────────────────────────────────

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

function sendError(
  reply: FastifyReply,
  locale: string,
  status: number,
  error: string,
  code: string,
  fields?: Record<string, string>
) {
  const body: Record<string, unknown> = { success: false, error: localizeText(locale as any, error), code }
  if (fields) body.fields = localizeFields(locale as any, fields)
  reply.code(status).send(body)
}

// ── Helper: get email config for mail delivery ───────────────────────────────

function getEmailConfig() {
  return db.select().from(emailConfig).where(eq(emailConfig.id, 'default')).get()
}

function getSystemConfig() {
  return db.select().from(systemConfig).where(eq(systemConfig.id, 'default')).get()
}

function formatUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

const authRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /init-status
  fastify.get('/init-status', async (_req, reply) => {
    const row = db.select().from(initialized).where(eq(initialized.id, 'default')).get()
    reply.send({ success: true, data: { initialized: row?.done ?? false } })
  })

  // POST /setup
  fastify.post('/setup', async (req, reply) => {
    const locale = getRequestLocale(req)
    const row = db.select().from(initialized).where(eq(initialized.id, 'default')).get()
    if (row?.done) {
      return sendError(reply, locale, 403, '系统已初始化', 'SYSTEM_ALREADY_INITIALIZED')
    }

    const body = req.body as Record<string, unknown>
    const { username, displayName, email, password, confirmPassword } = body as {
      username: string; displayName: string; email: string; password: string; confirmPassword: string
    }

    const fields: Record<string, string> = {}
    if (!username || !validateUsername(username)) fields.username = '用户名格式不正确（3-20字符，字母/数字/下划线，不能以数字开头）'
    if (!displayName || !validateDisplayName(displayName)) fields.displayName = '显示名称须为1-30字符'
    if (!email || !validateEmail(email)) fields.email = '邮箱格式不正确'
    if (!password || !validatePassword(password)) fields.password = '密码须为8-64字符，且同时包含字母和数字'
    if (password !== confirmPassword) fields.confirmPassword = '两次密码不一致'
    if (Object.keys(fields).length > 0) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', fields)
    }

    const adminId = uuidv4()
    const passwordHash = await bcrypt.hash(password, 10)
    const now = Math.floor(Date.now() / 1000)

    db.insert(users).values({
      id: adminId,
      username,
      displayName,
      email,
      role: 'admin',
      status: 'active',
      passwordHash,
      createdAt: now,
    }).run()

    // Upsert system_config and email_config defaults
    db.insert(systemConfig).values({ id: 'default' }).onConflictDoNothing().run()
    db.insert(emailConfig).values({ id: 'default' }).onConflictDoNothing().run()

    seedMockData(adminId)

    db.update(initialized).set({ done: true }).where(eq(initialized.id, 'default')).run()

    reply.send({ success: true, data: { message: localizeText(locale, '初始化完成') } })
  })

  // POST /login
  fastify.post('/login', async (req, reply) => {
    const locale = getRequestLocale(req)
    const { username, password } = req.body as { username: string; password: string }

    const user = db.select().from(users).where(eq(users.username, username)).get()
    if (!user) return sendError(reply, locale, 401, '用户名或密码错误', 'INVALID_CREDENTIALS')

    if (user.status === 'disabled') return sendError(reply, locale, 403, '账号已被禁用', 'ACCOUNT_DISABLED')

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return sendError(reply, locale, 401, '用户名或密码错误', 'INVALID_CREDENTIALS')

    const config = getSystemConfig()
    const tokenExpiry = config?.tokenExpiry ?? 60

    const token = fastify.jwt.sign({ userId: user.id, role: user.role }, { expiresIn: tokenExpiry * 60 })

    reply.send({ success: true, data: { token, user: formatUser(user) } })
  })

  // POST /register
  fastify.post('/register', async (req, reply) => {
    const locale = getRequestLocale(req)
    const config = getSystemConfig()
    if (!config?.enableRegister) {
      return sendError(reply, locale, 403, '注册功能已关闭', 'REGISTER_DISABLED')
    }

    const { username, displayName, email } = req.body as { username: string; displayName: string; email: string }

    const fields: Record<string, string> = {}
    if (!username || !validateUsername(username)) fields.username = '用户名格式不正确'
    if (!displayName || !validateDisplayName(displayName)) fields.displayName = '显示名称须为1-30字符'
    if (!email || !validateEmail(email)) fields.email = '邮箱格式不正确'
    if (Object.keys(fields).length > 0) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', fields)
    }

    // Email domain restriction
    if (config.restrictEmailDomain && config.emailDomainWhitelist) {
      const domain = email.split('@')[1]
      const whitelist = config.emailDomainWhitelist.split(',').map(d => d.trim())
      if (!whitelist.includes(domain)) {
        return sendError(reply, locale, 422, '邮箱域名不在白名单', 'EMAIL_DOMAIN_NOT_ALLOWED')
      }
    }

    const existingUsername = db.select().from(users).where(eq(users.username, username)).get()
    if (existingUsername) return sendError(reply, locale, 422, '用户名已被占用', 'USERNAME_TAKEN')

    const existingEmail = db.select().from(users).where(eq(users.email, email)).get()
    if (existingEmail) return sendError(reply, locale, 422, '邮箱已被注册', 'EMAIL_TAKEN')

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 10)
    const now = Math.floor(Date.now() / 1000)

    const newUser = {
      id: uuidv4(),
      username,
      displayName,
      email,
      role: 'user' as const,
      status: 'active' as const,
      passwordHash,
      createdAt: now,
    }
    db.insert(users).values(newUser).run()

    const mailConfig = getEmailConfig()
    const mailCopy = getRegisterMail(locale, displayName, username, tempPassword)
    const { subject, body } = mailCopy
    const preview = await deliverMail(email, subject, body, {
      smtpHost: mailConfig?.smtpHost ?? '',
      smtpPort: mailConfig?.smtpPort ?? 465,
      encryption: mailConfig?.encryption ?? 'ssl',
      fromEmail: mailConfig?.fromEmail ?? '',
      fromName: mailConfig?.fromName ?? '资源导航系统',
      smtpUser: mailConfig?.smtpUser ?? '',
      smtpPassword: mailConfig?.smtpPassword ?? '',
    })

    const response: Record<string, unknown> = { success: true, data: { message: localizeText(locale, '注册成功') } }
    if (preview) response.emailPreview = preview
    reply.send(response)
  })

  // POST /forgot-password
  fastify.post('/forgot-password', async (req, reply) => {
    const locale = getRequestLocale(req)
    const { email } = req.body as { email: string }

    const defaultResponse = { success: true, data: { message: localizeText(locale, '若邮箱已注册，重置链接已发送') } }

    if (!email || !validateEmail(email)) {
      return reply.send(defaultResponse)
    }

    const user = db.select().from(users).where(eq(users.email, email)).get()
    if (!user) {
      return reply.send(defaultResponse)
    }

    const token = createResetToken(email)
    const host = req.headers.host ?? 'localhost:3000'
    const resetLink = `http://${host}/#/reset-password?token=${token}`

    const config = getSystemConfig()
    const expiryMinutes = config?.resetTokenExpiry ?? 60

    const { subject, body } = getForgotPasswordMail(locale, user.displayName, resetLink, expiryMinutes)

    const mailConfig = getEmailConfig()
    const preview = await deliverMail(email, subject, body, {
      smtpHost: mailConfig?.smtpHost ?? '',
      smtpPort: mailConfig?.smtpPort ?? 465,
      encryption: mailConfig?.encryption ?? 'ssl',
      fromEmail: mailConfig?.fromEmail ?? '',
      fromName: mailConfig?.fromName ?? '资源导航系统',
      smtpUser: mailConfig?.smtpUser ?? '',
      smtpPassword: mailConfig?.smtpPassword ?? '',
    })

    const response: Record<string, unknown> = { ...defaultResponse }
    if (preview) response.emailPreview = preview
    reply.send(response)
  })

  // POST /reset-password
  fastify.post('/reset-password', async (req, reply) => {
    const locale = getRequestLocale(req)
    const { token, newPassword, confirmPassword } = req.body as {
      token: string; newPassword: string; confirmPassword: string
    }

    const result = validateResetToken(token)
    if (!result.valid) {
      return sendError(reply, locale, 422, getResetTokenErrorMessage(locale, result.error!), result.error!)
    }

    if (newPassword !== confirmPassword) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', { confirmPassword: '两次密码不一致' })
    }
    if (!validatePassword(newPassword)) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', { newPassword: '密码须为8-64字符，且同时包含字母和数字' })
    }

    const user = db.select().from(users).where(eq(users.email, result.email!)).get()
    if (!user) return sendError(reply, locale, 422, getResetTokenErrorMessage(locale, 'RESET_TOKEN_INVALID'), 'RESET_TOKEN_INVALID')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run()
    markTokenUsed(token)

    reply.send({ success: true, data: { message: localizeText(locale, '密码已重置') } })
  })

  // GET /me
  fastify.get('/me', { preHandler: fastify.authenticate }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const user = db.select().from(users).where(eq(users.id, req.user.userId)).get()
    if (!user) return sendError(reply, locale, 401, 'token 无效', 'TOKEN_INVALID')
    reply.send({ success: true, data: formatUser(user) })
  })

  // PUT /me
  fastify.put('/me', { preHandler: fastify.authenticate }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const { displayName, email } = req.body as { displayName?: string; email?: string }

    const fields: Record<string, string> = {}
    if (displayName !== undefined && !validateDisplayName(displayName)) fields.displayName = '显示名称须为1-30字符'
    if (email !== undefined && !validateEmail(email)) fields.email = '邮箱格式不正确'
    if (Object.keys(fields).length > 0) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', fields)
    }

    if (email) {
      const existing = db.select().from(users).where(eq(users.email, email)).get()
      if (existing && existing.id !== req.user.userId) {
        return sendError(reply, locale, 422, '邮箱已被注册', 'EMAIL_TAKEN')
      }
    }

    const updates: Partial<typeof users.$inferInsert> = {}
    if (displayName !== undefined) updates.displayName = displayName
    if (email !== undefined) updates.email = email

    db.update(users).set(updates).where(eq(users.id, req.user.userId)).run()

    const updated = db.select().from(users).where(eq(users.id, req.user.userId)).get()!
    reply.send({ success: true, data: formatUser(updated) })
  })

  // PUT /me/password
  fastify.put('/me/password', { preHandler: fastify.authenticate }, async (req, reply) => {
    const locale = getRequestLocale(req)
    const { currentPassword, newPassword, confirmPassword } = req.body as {
      currentPassword: string; newPassword: string; confirmPassword: string
    }

    const user = db.select().from(users).where(eq(users.id, req.user.userId)).get()
    if (!user) return sendError(reply, locale, 401, 'token 无效', 'TOKEN_INVALID')

    const match = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!match) return sendError(reply, locale, 422, '当前密码错误', 'WRONG_PASSWORD')

    const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash)
    if (sameAsOld) return sendError(reply, locale, 422, '新旧密码不能相同', 'SAME_PASSWORD')

    if (newPassword !== confirmPassword) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', { confirmPassword: '两次密码不一致' })
    }
    if (!validatePassword(newPassword)) {
      return sendError(reply, locale, 422, '请求参数校验失败', 'VALIDATION_ERROR', { newPassword: '密码须为8-64字符，且同时包含字母和数字' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run()

    reply.send({ success: true, data: { message: localizeText(locale, '密码已修改') } })
  })
}

export default authRoutes
