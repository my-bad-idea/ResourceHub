import { generateKeyPairSync, privateDecrypt, constants } from 'crypto'
import { db } from '../db/index.js'
import { rsaKeys } from '../db/schema.js'
import { eq } from 'drizzle-orm'

type RsaKeyRow = typeof rsaKeys.$inferSelect

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

export function getOrCreateKeyPair(): RsaKeyRow {
  const existing = db.select().from(rsaKeys).where(eq(rsaKeys.id, 'current')).get()
  if (existing) return existing

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  const row: RsaKeyRow = {
    id: 'current',
    publicKey,
    privateKey,
    createdAt: nowSeconds(),
  }

  db.insert(rsaKeys).values(row).run()
  return row
}

export function ensureRsaKeyPair(): void {
  getOrCreateKeyPair()
}

export function getPublicKey(): string {
  const row = getOrCreateKeyPair()
  return row.publicKey
}

export function decryptWithPrivateKey(ciphertextBase64: string): string {
  const row = getOrCreateKeyPair()
  const buffer = Buffer.from(ciphertextBase64, 'base64')

  const decrypted = privateDecrypt(
    {
      key: row.privateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer,
  )

  return decrypted.toString('utf8')
}

