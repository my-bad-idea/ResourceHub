import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const dbPath = path.resolve('data', 'smoke-test.db')
fs.rmSync(dbPath, { force: true })

process.env.DB_PATH = dbPath
process.env.JWT_SECRET = 'smoke-test-secret'
process.env.NODE_ENV = 'test'

const { buildApp } = await import('../dist/app.js')
const app = await buildApp()

const localeCopy = {
  'zh-Hans': {
    validationError: '请求参数校验失败',
    invalidSenderEmail: '发件人邮箱格式不正确',
    emailDomainNotAllowed: '邮箱域名不在白名单',
    registerSuccess: '注册成功',
    registerSubject: '欢迎注册，您的初始密码',
    registerPasswordLabel: '初始密码：',
    forgotMessage: '若邮箱已注册，重置链接已发送',
    forgotSubject: '密码重置请求',
    resetInvalid: '重置令牌无效',
    resetUsed: '重置令牌已使用',
    resetExpired: '重置令牌已过期',
    adminResetMessage: '密码已重置',
    adminResetSubject: '管理员已重置您的密码',
    adminResetPasswordLabel: '新密码：',
    testMailMessage: '测试邮件已发送',
    testMailSubject: '邮件服务测试',
    permissionDenied: '权限不足',
    missingToken: '缺少 Authorization header',
  },
  'zh-Hant': {
    validationError: '請求參數驗證失敗',
    invalidSenderEmail: '寄件者信箱格式不正確',
    emailDomainNotAllowed: '信箱網域不在白名單內',
    registerSuccess: '註冊成功',
    registerSubject: '歡迎註冊，您的初始密碼',
    registerPasswordLabel: '初始密碼：',
    forgotMessage: '若信箱已註冊，重設連結已寄出',
    forgotSubject: '密碼重設請求',
    resetInvalid: '重設令牌無效',
    resetUsed: '重設令牌已使用',
    resetExpired: '重設令牌已過期',
    adminResetMessage: '密碼已重設',
    adminResetSubject: '管理員已重設您的密碼',
    adminResetPasswordLabel: '新密碼：',
    testMailMessage: '測試郵件已寄出',
    testMailSubject: '郵件服務測試',
    permissionDenied: '權限不足',
    missingToken: '缺少 Authorization header',
  },
  en: {
    validationError: 'Request validation failed',
    invalidSenderEmail: 'Sender email format is invalid',
    emailDomainNotAllowed: 'Email domain is not allowed',
    registerSuccess: 'Registration successful',
    registerSubject: 'Welcome! Your initial password',
    registerPasswordLabel: 'Initial password:',
    forgotMessage: 'If the email is registered, a reset link has been sent',
    forgotSubject: 'Password reset request',
    resetInvalid: 'Reset token is invalid',
    resetUsed: 'Reset token has already been used',
    resetExpired: 'Reset token has expired',
    adminResetMessage: 'Password has been reset',
    adminResetSubject: 'An administrator reset your password',
    adminResetPasswordLabel: 'New password:',
    testMailMessage: 'Test email sent',
    testMailSubject: 'Email service test',
    permissionDenied: 'Permission denied',
    missingToken: 'Missing Authorization header',
  },
  ja: {
    validationError: 'リクエストの検証に失敗しました',
    invalidSenderEmail: '送信者メールアドレスの形式が正しくありません',
    emailDomainNotAllowed: 'メールドメインが許可リストにありません',
    registerSuccess: '登録に成功しました',
    registerSubject: '登録完了のお知らせと初期パスワード',
    registerPasswordLabel: '初期パスワード:',
    forgotMessage: '登録済みの場合、再設定リンクを送信しました',
    forgotSubject: 'パスワード再設定のご案内',
    resetInvalid: '再設定トークンが無効です',
    resetUsed: '再設定トークンはすでに使用されています',
    resetExpired: '再設定トークンの有効期限が切れています',
    adminResetMessage: 'パスワードを再設定しました',
    adminResetSubject: '管理者がパスワードを再設定しました',
    adminResetPasswordLabel: '新しいパスワード:',
    testMailMessage: 'テストメールを送信しました',
    testMailSubject: 'メールサービスのテスト',
    permissionDenied: '権限がありません',
    missingToken: 'Authorization ヘッダーがありません',
  },
}

function db() {
  return new Database(dbPath)
}

async function request(method, url, payload, tokenOrOptions) {
  const options = typeof tokenOrOptions === 'string' || tokenOrOptions === undefined
    ? { token: tokenOrOptions, locale: 'zh-Hans' }
    : { locale: 'zh-Hans', ...tokenOrOptions }

  const response = await app.inject({
    method,
    url,
    payload: payload === undefined ? undefined : JSON.stringify(payload),
    headers: {
      ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
      'accept-language': options.locale,
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
  })

  return {
    statusCode: response.statusCode,
    body: response.json(),
  }
}

function extractTempPassword(body) {
  const match = body.match(/(?:初始密码|初始密碼|Initial password|初期パスワード)[:：]\s*(.+)/)
  assert.ok(match, 'email preview should include temp password')
  return match[1].trim()
}

function extractResetToken(body) {
  const match = body.match(/token=([a-f0-9]+)/)
  assert.ok(match, 'email preview should include reset token')
  return match[1]
}

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
  const adminToken = response.body.data.token
  const adminId = response.body.data.user.id

  for (const locale of Object.keys(localeCopy)) {
    response = await request('PUT', '/api/config/email', {
      fromEmail: 'not-an-email',
    }, { token: adminToken, locale })
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'VALIDATION_ERROR')
    assert.equal(response.body.error, localeCopy[locale].validationError)
    assert.equal(response.body.fields.fromEmail, localeCopy[locale].invalidSenderEmail)
  }

  response = await request('GET', '/api/auth/me', undefined, { locale: 'ja' })
  assert.equal(response.statusCode, 401)
  assert.equal(response.body.code, 'TOKEN_MISSING')
  assert.equal(response.body.error, localeCopy.ja.missingToken)

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

  for (const locale of Object.keys(localeCopy)) {
    response = await request('POST', '/api/auth/register', {
      username: `blocked_${locale.replace(/[^a-zA-Z]/g, '_')}`,
      displayName: 'Blocked User',
      email: 'blocked@outside.net',
    }, { locale })
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'EMAIL_DOMAIN_NOT_ALLOWED')
    assert.equal(response.body.error, localeCopy[locale].emailDomainNotAllowed)
  }

  const localeRegistrations = {
    'zh-Hans': { username: 'alice_user', displayName: 'Alice', email: 'alice@example.com' },
    'zh-Hant': { username: 'locale_hant_user', displayName: 'Alice Hant', email: 'alice.hant@example.com' },
    en: { username: 'locale_en_user', displayName: 'Alice En', email: 'alice.en@example.com' },
    ja: { username: 'locale_ja_user', displayName: 'Alice Ja', email: 'alice.ja@example.com' },
  }

  let alicePassword = ''
  for (const locale of Object.keys(localeRegistrations)) {
    const user = localeRegistrations[locale]
    response = await request('POST', '/api/auth/register', user, { locale })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.message, localeCopy[locale].registerSuccess)
    assert.ok(response.body.emailPreview)
    assert.equal(response.body.emailPreview.subject, localeCopy[locale].registerSubject)
    assert.ok(response.body.emailPreview.body.includes(localeCopy[locale].registerPasswordLabel))
    if (locale === 'zh-Hans') {
      alicePassword = extractTempPassword(response.body.emailPreview.body)
    }
  }

  response = await request('POST', '/api/auth/login', { username: 'alice_user', password: alicePassword })
  assert.equal(response.statusCode, 200)
  let aliceToken = response.body.data.token
  const aliceId = response.body.data.user.id

  response = await request('POST', '/api/categories', { name: 'Smoke Category' }, adminToken)
  assert.equal(response.statusCode, 201)
  const categoryId = response.body.data.id

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
  const resourceId = response.body.data.id

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
  const aliceResourceId = response.body.data.id

  response = await request('POST', '/api/users', {
    username: 'bob_admin_created',
    displayName: 'Bob',
    email: 'bob@example.com',
    password: 'Bobpass123',
    role: 'user',
  }, adminToken)
  assert.equal(response.statusCode, 201)
  const bobId = response.body.data.id

  response = await request('GET', '/api/users', undefined, { token: aliceToken, locale: 'en' })
  assert.equal(response.statusCode, 403)
  assert.equal(response.body.code, 'PERMISSION_DENIED')
  assert.equal(response.body.error, localeCopy.en.permissionDenied)

  for (const locale of ['en', 'zh-Hant', 'ja']) {
    response = await request('POST', `/api/users/${bobId}/reset-password`, undefined, { token: adminToken, locale })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.message, localeCopy[locale].adminResetMessage)
    assert.ok(response.body.emailPreview)
    assert.equal(response.body.emailPreview.subject, localeCopy[locale].adminResetSubject)
    assert.ok(response.body.emailPreview.body.includes(localeCopy[locale].adminResetPasswordLabel))
  }

  response = await request('GET', '/api/users', undefined, adminToken)
  assert.equal(response.statusCode, 200)
  assert.ok(response.body.data.some((user) => user.id === bobId))

  for (const locale of Object.keys(localeCopy)) {
    response = await request('POST', '/api/auth/forgot-password', { email: 'nobody@example.com' }, { locale })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.message, localeCopy[locale].forgotMessage)
  }

  for (const locale of Object.keys(localeCopy)) {
    response = await request('POST', '/api/auth/forgot-password', { email: 'alice@example.com' }, { locale })
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.data.message, localeCopy[locale].forgotMessage)
    assert.ok(response.body.emailPreview)
    assert.equal(response.body.emailPreview.subject, localeCopy[locale].forgotSubject)
  }

  response = await request('POST', '/api/auth/forgot-password', { email: 'alice@example.com' }, { locale: 'zh-Hans' })
  assert.equal(response.statusCode, 200)
  assert.ok(response.body.emailPreview)
  const resetToken = extractResetToken(response.body.emailPreview.body)

  for (const locale of Object.keys(localeCopy)) {
    response = await request('POST', '/api/auth/reset-password', {
      token: 'badtoken',
      newPassword: 'Newpass123',
      confirmPassword: 'Newpass123',
    }, { locale })
    assert.equal(response.statusCode, 422)
    assert.equal(response.body.code, 'RESET_TOKEN_INVALID')
    assert.equal(response.body.error, localeCopy[locale].resetInvalid)
  }

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
  }, { locale: 'en' })
  assert.equal(response.statusCode, 422)
  assert.equal(response.body.code, 'RESET_TOKEN_USED')
  assert.equal(response.body.error, localeCopy.en.resetUsed)

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
  }, { locale: 'ja' })
  assert.equal(response.statusCode, 422)
  assert.equal(response.body.code, 'RESET_TOKEN_EXPIRED')
  assert.equal(response.body.error, localeCopy.ja.resetExpired)

  response = await request('POST', '/api/auth/login', { username: 'alice_user', password: 'Newpass123' })
  assert.equal(response.statusCode, 200)
  aliceToken = response.body.data.token

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

  response = await request('POST', '/api/config/email/test', undefined, { token: adminToken, locale: 'zh-Hant' })
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.data.message, localeCopy['zh-Hant'].testMailMessage)
  assert.ok(response.body.emailPreview)
  assert.equal(response.body.emailPreview.subject, localeCopy['zh-Hant'].testMailSubject)

  response = await request('DELETE', '/api/tags/smoke', undefined, adminToken)
  assert.equal(response.statusCode, 200)
  assert.ok(response.body.data.affectedResources >= 1)

  response = await request('DELETE', `/api/users/${aliceId}`, undefined, adminToken)
  assert.equal(response.statusCode, 200)

  response = await request('GET', '/api/resources', undefined, adminToken)
  assert.equal(response.statusCode, 200)
  const transferredResource = response.body.data.find((resource) => resource.id === aliceResourceId)
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
  const { sqlite } = await import('../dist/db/index.js')
  sqlite.close()
}
