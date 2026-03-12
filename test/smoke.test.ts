import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const dbPath = path.resolve('data', 'smoke-test.db')
fs.rmSync(dbPath, { force: true })

process.env.DB_PATH = dbPath
process.env.JWT_SECRET = 'smoke-test-secret'
process.env.NODE_ENV = 'test'

const { buildApp } = await import('../src/app.ts')
const app = await buildApp()

function db() {
  return new Database(dbPath)
}

async function request(method: string, url: string, payload?: unknown, token?: string) {
  const response = await app.inject({
    method,
    url,
    payload: payload === undefined ? undefined : JSON.stringify(payload),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  })

  return {
    statusCode: response.statusCode,
    body: response.json(),
  }
}

function extractTempPassword(body: string) {
  const match = body.match(/初始密码：(.+)/)
  assert.ok(match, 'email preview should include temp password')
  return match[1].trim()
}

function extractResetToken(body: string) {
  const match = body.match(/token=([a-f0-9]+)/)
  assert.ok(match, 'email preview should include reset token')
  return match[1]
}

async function main() {
  try {
    let response = await request('GET', '/api/auth/init-status')
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.initialized, false)

    response = await request('POST', '/api/auth/setup', {
      username: 'admin',
      displayName: '管理员',
      email: 'admin@example.com',
      password: 'Admin1234',
      confirmPassword: 'Admin1234',
    })
    assert.equal(response.statusCode, 200)

    response = await request('POST', '/api/auth/setup', {
      username: 'admin2',
      displayName: '管理员2',
      email: 'admin2@example.com',
      password: 'Admin1234',
      confirmPassword: 'Admin1234',
    })
    assert.equal(response.statusCode, 403)
    assert.equal(response.body.code, 'SYSTEM_ALREADY_INITIALIZED')

    response = await request('POST', '/api/auth/login', { username: 'admin', password: 'Admin1234' })
    assert.equal(response.statusCode, 200)
    const adminToken = response.body.data.token as string
    const adminUser = response.body.data.user
    const adminId = adminUser.id as string

    response = await request('GET', '/api/auth/me', undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.username, 'admin')

    response = await request('PUT', '/api/config/system', {
      siteTitle: 'Smoke ResourceHub',
      siteSubtitle: 'Smoke Subtitle',
      tokenExpiry: 120,
      resetTokenExpiry: 30,
      enableRegister: true,
      restrictEmailDomain: true,
      emailDomainWhitelist: 'example.com,corp.com',
    }, adminToken)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.siteTitle, 'Smoke ResourceHub')

    response = await request('POST', '/api/auth/register', {
      username: 'blocked_user',
      displayName: 'Blocked User',
      email: 'blocked@outside.net',
    })
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'EMAIL_DOMAIN_NOT_ALLOWED')

    response = await request('POST', '/api/auth/register', {
      username: 'alice_user',
      displayName: 'Alice',
      email: 'alice@example.com',
    })
    assert.equal(response.statusCode, 200)
    assert.ok(response.body.emailPreview)
    const alicePassword = extractTempPassword(response.body.emailPreview.body)

    response = await request('POST', '/api/auth/login', { username: 'alice_user', password: alicePassword })
    assert.equal(response.statusCode, 200)
    let aliceToken = response.body.data.token as string
    const aliceId = response.body.data.user.id as string

    response = await request('POST', '/api/categories', { name: 'Smoke Category' }, adminToken)
    assert.equal(response.statusCode, 201)
    const categoryId = response.body.data.id as string

    response = await request('POST', '/api/resources', {
      name: 'Smoke Resource',
      url: 'https://example.com/smoke',
      categoryId,
      visibility: 'public',
      description: 'smoke resource',
      tags: ['smoke', 'resource'],
      enabled: true,
    }, adminToken)
    assert.equal(response.statusCode, 201)
    const resourceId = response.body.data.id as string

    response = await request('POST', `/api/resources/${resourceId}/favorite`, undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.isFavorited, true)

    response = await request('GET', '/api/resources/favorites', undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.length, 1)

    for (let i = 0; i < 205; i += 1) {
      response = await request('POST', `/api/resources/${resourceId}/visit`, undefined, adminToken)
      assert.equal(response.statusCode, 200)
    }

    response = await request('GET', '/api/resources/history', undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.length, 200)

    response = await request('PUT', `/api/resources/${resourceId}`, {
      description: 'updated description',
      tags: ['smoke', 'updated'],
    }, adminToken)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.description, 'updated description')

    response = await request('POST', '/api/resources', {
      name: 'Alice Private Resource',
      url: 'https://example.com/alice-private',
      visibility: 'private',
      tags: ['alice'],
      enabled: true,
    }, aliceToken)
    assert.equal(response.statusCode, 201)
    const aliceResourceId = response.body.data.id as string

    response = await request('POST', '/api/users', {
      username: 'bob_admin_created',
      displayName: 'Bob',
      email: 'bob@example.com',
      password: 'Bobpass123',
      role: 'user',
    }, adminToken)
    assert.equal(response.statusCode, 201)
    const bobId = response.body.data.id as string

    response = await request('POST', `/api/users/${bobId}/reset-password`, undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.ok(response.body.emailPreview)

    response = await request('GET', '/api/users', undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.ok(response.body.data.some((user: { id: string }) => user.id === bobId))

    response = await request('POST', '/api/auth/forgot-password', { email: 'nobody@example.com' })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.message, '若邮箱已注册，重置链接已发送')

    response = await request('POST', '/api/auth/forgot-password', { email: 'alice@example.com' })
    assert.equal(response.statusCode, 200)
    assert.ok(response.body.emailPreview)
    const resetToken = extractResetToken(response.body.emailPreview.body)

    response = await request('POST', '/api/auth/reset-password', {
      token: 'badtoken',
      newPassword: 'Newpass123',
      confirmPassword: 'Newpass123',
    })
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'RESET_TOKEN_INVALID')

    response = await request('POST', '/api/auth/reset-password', {
      token: resetToken,
      newPassword: 'Newpass123',
      confirmPassword: 'Newpass123',
    })
    assert.equal(response.statusCode, 200)

    response = await request('POST', '/api/auth/reset-password', {
      token: resetToken,
      newPassword: 'Newpass123',
      confirmPassword: 'Newpass123',
    })
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'RESET_TOKEN_USED')

    response = await request('POST', '/api/auth/forgot-password', { email: 'alice@example.com' })
    assert.equal(response.statusCode, 200)
    const expiredToken = extractResetToken(response.body.emailPreview.body)
    const sqlite = db()
    sqlite.prepare('update reset_tokens set expires_at = ? where token = ?').run(0, expiredToken)
    sqlite.close()

    response = await request('POST', '/api/auth/reset-password', {
      token: expiredToken,
      newPassword: 'Another123',
      confirmPassword: 'Another123',
    })
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'RESET_TOKEN_EXPIRED')

    response = await request('POST', '/api/auth/login', { username: 'alice_user', password: 'Newpass123' })
    assert.equal(response.statusCode, 200)
    aliceToken = response.body.data.token as string

    response = await request('PUT', '/api/auth/me/password', {
      currentPassword: 'Wrong1234',
      newPassword: 'Other1234',
      confirmPassword: 'Other1234',
    }, aliceToken)
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'WRONG_PASSWORD')

    response = await request('PUT', '/api/auth/me/password', {
      currentPassword: 'Newpass123',
      newPassword: 'Newpass123',
      confirmPassword: 'Newpass123',
    }, aliceToken)
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'SAME_PASSWORD')

    response = await request('PUT', '/api/auth/me/password', {
      currentPassword: 'Newpass123',
      newPassword: 'Finalpass123',
      confirmPassword: 'Finalpass123',
    }, aliceToken)
    assert.equal(response.statusCode, 200)

    response = await request('PUT', '/api/config/email', {
      smtpHost: '',
      smtpPort: 465,
      encryption: 'ssl',
      fromName: 'Smoke Mailer',
      fromEmail: 'noreply@example.com',
      smtpUser: 'mailer@example.com',
      smtpPassword: '***',
    }, adminToken)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.fromEmail, 'noreply@example.com')

    response = await request('POST', '/api/config/email/test', undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.ok(response.body.emailPreview)

    response = await request('DELETE', '/api/tags/smoke', undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.ok(response.body.data.affectedResources >= 1)

    response = await request('DELETE', `/api/users/${aliceId}`, undefined, adminToken)
    assert.equal(response.statusCode, 200)

    response = await request('GET', '/api/resources', undefined, adminToken)
    assert.equal(response.statusCode, 200)
    const transferredResource = response.body.data.find((resource: { id: string }) => resource.id === aliceResourceId)
    assert.ok(transferredResource)
    assert.equal(transferredResource.ownerId, adminId)

    response = await request('DELETE', `/api/categories/${categoryId}`, undefined, adminToken)
    assert.equal(response.statusCode, 200)
    assert.ok(response.body.data.affectedResources >= 1)

    response = await request('DELETE', `/api/resources/${resourceId}`, undefined, adminToken)
    assert.equal(response.statusCode, 200)

    console.log('Smoke checks passed')
  } finally {
    await app.close()
    fs.rmSync(dbPath, { force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
