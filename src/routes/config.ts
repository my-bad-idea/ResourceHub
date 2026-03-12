import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { systemConfig, emailConfig, users } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { deliverMail } from '../services/mail.js'

function sendError(reply: FastifyReply, status: number, error: string, code: string, fields?: Record<string, string>) {
  const body: Record<string, unknown> = { success: false, error, code }
  if (fields) body.fields = fields
  reply.code(status).send(body)
}

function getEmailRow() {
  return db.select().from(emailConfig).where(eq(emailConfig.id, 'default')).get()
}

function maskEmail(row: typeof emailConfig.$inferSelect) {
  return { ...row, smtpPassword: '***' }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidUrl(value: string): boolean {
  return /^https?:\/\//.test(value)
}

function isValidDomain(value: string): boolean {
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
}

function validateSystemConfig(body: Record<string, unknown>) {
  const fields: Record<string, string> = {}
  const updates: Partial<typeof systemConfig.$inferInsert> = {}

  if (body.siteTitle !== undefined) {
    const siteTitle = String(body.siteTitle).trim()
    if (!siteTitle || siteTitle.length > 50) {
      fields.siteTitle = '站点标题须为 1-50 字符'
    } else {
      updates.siteTitle = siteTitle
    }
  }

  if (body.siteSubtitle !== undefined) {
    const siteSubtitle = String(body.siteSubtitle).trim()
    if (siteSubtitle.length > 100) {
      fields.siteSubtitle = '站点副标题最多 100 字符'
    } else {
      updates.siteSubtitle = siteSubtitle
    }
  }

  if (body.logoUrl !== undefined) {
    const logoUrl = String(body.logoUrl).trim()
    if (logoUrl !== '' && !isValidUrl(logoUrl)) {
      fields.logoUrl = 'Logo URL 格式不正确'
    } else {
      updates.logoUrl = logoUrl
    }
  }

  if (body.tokenExpiry !== undefined) {
    const tokenExpiry = Number(body.tokenExpiry)
    if (!Number.isInteger(tokenExpiry) || tokenExpiry < 5 || tokenExpiry > 43200) {
      fields.tokenExpiry = 'Token 有效期须为 5-43200 分钟的整数'
    } else {
      updates.tokenExpiry = tokenExpiry
    }
  }

  if (body.resetTokenExpiry !== undefined) {
    const resetTokenExpiry = Number(body.resetTokenExpiry)
    if (!Number.isInteger(resetTokenExpiry) || resetTokenExpiry < 5 || resetTokenExpiry > 43200) {
      fields.resetTokenExpiry = '重置链接有效期须为 5-43200 分钟的整数'
    } else {
      updates.resetTokenExpiry = resetTokenExpiry
    }
  }

  if (body.enableRegister !== undefined) {
    updates.enableRegister = Boolean(body.enableRegister)
  }

  let restrictEmailDomain = body.restrictEmailDomain
  if (restrictEmailDomain !== undefined) {
    updates.restrictEmailDomain = Boolean(restrictEmailDomain)
    restrictEmailDomain = Boolean(restrictEmailDomain)
  }

  if (body.emailDomainWhitelist !== undefined) {
    const rawWhitelist = String(body.emailDomainWhitelist)
    const whitelist = rawWhitelist.split(',').map((item) => item.trim()).filter(Boolean)
    if (whitelist.some((domain) => !isValidDomain(domain))) {
      fields.emailDomainWhitelist = '邮箱域名白名单格式不正确'
    } else {
      updates.emailDomainWhitelist = whitelist.join(',')
    }
  }

  const nextRestrict = updates.restrictEmailDomain ?? undefined
  const nextWhitelist = updates.emailDomainWhitelist ?? undefined
  if (nextRestrict === true && nextWhitelist !== undefined && nextWhitelist === '') {
    fields.emailDomainWhitelist = '启用邮箱域名限制时，白名单不能为空'
  }

  return { fields, updates }
}

function validateEmailConfig(body: Record<string, unknown>) {
  const fields: Record<string, string> = {}
  const updates: Partial<typeof emailConfig.$inferInsert> = {}

  if (body.smtpHost !== undefined) {
    updates.smtpHost = String(body.smtpHost).trim()
  }

  if (body.smtpPort !== undefined) {
    const smtpPort = Number(body.smtpPort)
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      fields.smtpPort = 'SMTP 端口须为 1-65535 的整数'
    } else {
      updates.smtpPort = smtpPort
    }
  }

  if (body.encryption !== undefined) {
    const encryption = String(body.encryption)
    if (!['ssl', 'tls', 'none'].includes(encryption)) {
      fields.encryption = '加密方式必须为 ssl、tls 或 none'
    } else {
      updates.encryption = encryption as 'ssl' | 'tls' | 'none'
    }
  }

  if (body.fromEmail !== undefined) {
    const fromEmail = String(body.fromEmail).trim()
    if (fromEmail !== '' && !isValidEmail(fromEmail)) {
      fields.fromEmail = '发件人邮箱格式不正确'
    } else {
      updates.fromEmail = fromEmail
    }
  }

  if (body.fromName !== undefined) {
    const fromName = String(body.fromName).trim()
    if (fromName.length > 50) {
      fields.fromName = '发件人名称最多 50 字符'
    } else {
      updates.fromName = fromName
    }
  }

  if (body.smtpUser !== undefined) {
    updates.smtpUser = String(body.smtpUser).trim()
  }

  if (body.smtpPassword !== undefined && body.smtpPassword !== '***') {
    updates.smtpPassword = String(body.smtpPassword)
  }

  return { fields, updates }
}

const configRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/system', async (_req, reply) => {
    const row = db.select().from(systemConfig).where(eq(systemConfig.id, 'default')).get()
    reply.send({
      success: true,
      data: {
        siteTitle: row?.siteTitle ?? '资源导航系统',
        siteSubtitle: row?.siteSubtitle ?? '登录以访问企业资源导航',
        logoUrl: row?.logoUrl ?? '',
        enableRegister: row?.enableRegister ?? true,
      },
    })
  })

  fastify.get('/system/full', { preHandler: fastify.requireAdmin }, async (_req, reply) => {
    const row = db.select().from(systemConfig).where(eq(systemConfig.id, 'default')).get()
    reply.send({ success: true, data: row })
  })

  fastify.put('/system', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const { fields, updates } = validateSystemConfig(body)

    if (Object.keys(fields).length > 0) {
      return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR', fields)
    }

    if (Object.keys(updates).length > 0) {
      db.update(systemConfig).set(updates).where(eq(systemConfig.id, 'default')).run()
    }

    const updated = db.select().from(systemConfig).where(eq(systemConfig.id, 'default')).get()
    reply.send({ success: true, data: updated })
  })

  fastify.get('/email', { preHandler: fastify.requireAdmin }, async (_req, reply) => {
    const row = getEmailRow()
    if (!row) return reply.send({ success: true, data: null })
    reply.send({ success: true, data: maskEmail(row) })
  })

  fastify.put('/email', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const body = req.body as Record<string, unknown>
    const { fields, updates } = validateEmailConfig(body)

    if (Object.keys(fields).length > 0) {
      return sendError(reply, 422, '请求参数校验失败', 'VALIDATION_ERROR', fields)
    }

    if (Object.keys(updates).length > 0) {
      db.update(emailConfig).set(updates).where(eq(emailConfig.id, 'default')).run()
    }

    const updated = getEmailRow()
    if (!updated) return reply.send({ success: true, data: null })
    reply.send({ success: true, data: maskEmail(updated) })
  })

  fastify.post('/email/test', { preHandler: fastify.requireAdmin }, async (req, reply) => {
    const admin = db.select().from(users).where(eq(users.id, req.user.userId)).get()
    if (!admin) return sendError(reply, 401, 'token 无效', 'TOKEN_INVALID')

    const mailConfig = getEmailRow()
    const subject = '邮件服务测试'
    const body = `您好 ${admin.displayName}，\n\n这是一封测试邮件，确认邮件服务配置正常。`
    const preview = await deliverMail(admin.email, subject, body, {
      smtpHost: mailConfig?.smtpHost ?? '',
      smtpPort: mailConfig?.smtpPort ?? 465,
      encryption: mailConfig?.encryption ?? 'ssl',
      fromEmail: mailConfig?.fromEmail ?? '',
      fromName: mailConfig?.fromName ?? '资源导航系统',
      smtpUser: mailConfig?.smtpUser ?? '',
      smtpPassword: mailConfig?.smtpPassword ?? '',
    })

    const response: Record<string, unknown> = { success: true, data: { message: '测试邮件已发送' } }
    if (preview) response.emailPreview = preview
    reply.send(response)
  })
}

export default configRoutes
