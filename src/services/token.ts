import { randomBytes } from 'crypto'
import { db } from '../db/index.js'
import { resetTokens, systemConfig } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

export function createResetToken(email: string): string {
  const config = db.select().from(systemConfig).where(eq(systemConfig.id, 'default')).get()
  const expiryMinutes = config?.resetTokenExpiry ?? 60
  const expiresAt = Math.floor(Date.now() / 1000) + expiryMinutes * 60
  const token = generateResetToken()

  db.insert(resetTokens).values({ token, email, expiresAt, used: false }).run()
  return token
}

export function validateResetToken(token: string): { valid: boolean; error?: string; email?: string } {
  const row = db.select().from(resetTokens).where(eq(resetTokens.token, token)).get()
  if (!row) return { valid: false, error: 'RESET_TOKEN_INVALID' }
  if (row.used) return { valid: false, error: 'RESET_TOKEN_USED' }
  if (row.expiresAt <= Math.floor(Date.now() / 1000)) return { valid: false, error: 'RESET_TOKEN_EXPIRED' }
  return { valid: true, email: row.email }
}

export function markTokenUsed(token: string): void {
  db.update(resetTokens).set({ used: true }).where(eq(resetTokens.token, token)).run()
}
