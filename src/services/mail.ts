import nodemailer from 'nodemailer'
import type { EmailPreview } from '../types.js'

interface MailConfig {
  smtpHost: string | null
  smtpPort: number | null
  encryption: string | null
  fromEmail: string | null
  fromName: string | null
  smtpUser: string | null
  smtpPassword: string | null
}

/**
 * Deliver an email. Returns EmailPreview if in mock mode (smtpHost empty), null otherwise.
 */
export async function deliverMail(
  to: string,
  subject: string,
  body: string,
  config: MailConfig
): Promise<EmailPreview | null> {
  const isMock = !config.smtpHost || config.smtpHost.trim() === ''

  if (isMock) {
    console.log('\n[Mock Email]')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body:\n${body}`)
    return { to, subject, body }
  }

  const secure = config.encryption === 'ssl'
  const transportOpts = {
    host: config.smtpHost!,
    port: config.smtpPort ?? 465,
    secure,
    auth: {
      user: config.smtpUser ?? '',
      pass: config.smtpPassword ?? '',
    },
  }
  const transporter = nodemailer.createTransport(transportOpts)

  await transporter.sendMail({
    from: `"${config.fromName ?? '资源导航系统'}" <${config.fromEmail ?? config.smtpUser}>`,
    to,
    subject,
    text: body,
  })

  return null
}
