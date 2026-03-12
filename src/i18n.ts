import type { FastifyRequest } from 'fastify'

export type AppLocale = 'zh-Hans' | 'zh-Hant' | 'en' | 'ja'

export const DEFAULT_LOCALE: AppLocale = 'zh-Hans'

const SUPPORTED_LOCALES = new Set<AppLocale>(['zh-Hans', 'zh-Hant', 'en', 'ja'])

const STATIC_TRANSLATIONS: Record<Exclude<AppLocale, 'zh-Hans'>, Record<string, string>> = {
  'zh-Hant': {
    '权限不足': '權限不足',
    '缺少 Authorization header': '缺少 Authorization header',
    'token 无效或已过期': 'token 無效或已過期',
    '账号已被禁用': '帳號已被停用',
    '系统已初始化': '系統已初始化',
    '用户名格式不正确（3-20字符，字母/数字/下划线，不能以数字开头）': '使用者名稱格式不正確（3-20 字元，字母/數字/底線，且不能以數字開頭）',
    '显示名称须为1-30字符': '顯示名稱須為 1-30 字元',
    '邮箱格式不正确': '信箱格式不正確',
    '密码须为8-64字符，且同时包含字母和数字': '密碼須為 8-64 字元，且同時包含字母與數字',
    '两次密码不一致': '兩次密碼不一致',
    '请求参数校验失败': '請求參數驗證失敗',
    '初始化完成': '初始化完成',
    '用户名或密码错误': '使用者名稱或密碼錯誤',
    '注册功能已关闭': '註冊功能已關閉',
    '用户名格式不正确': '使用者名稱格式不正確',
    '邮箱域名不在白名单': '信箱網域不在白名單內',
    '用户名已被占用': '使用者名稱已被占用',
    '邮箱已被注册': '信箱已被註冊',
    '注册成功': '註冊成功',
    '若邮箱已注册，重置链接已发送': '若信箱已註冊，重設連結已寄出',
    '重置令牌无效': '重設令牌無效',
    '密码已重置': '密碼已重設',
    'token 无效': 'token 無效',
    '当前密码错误': '目前密碼錯誤',
    '新旧密码不能相同': '新舊密碼不能相同',
    '密码已修改': '密碼已修改',
    '类别名称已存在': '類別名稱已存在',
    '类别不存在': '類別不存在',
    '删除成功': '刪除成功',
    '站点标题须为 1-50 字符': '站點標題須為 1-50 字元',
    '站点副标题最多 100 字符': '站點副標題最多 100 字元',
    'Logo URL 格式不正确': 'Logo URL 格式不正確',
    'Token 有效期须为 5-43200 分钟的整数': 'Token 有效期須為 5-43200 分鐘的整數',
    '重置链接有效期须为 5-43200 分钟的整数': '重設連結有效期須為 5-43200 分鐘的整數',
    '邮箱域名白名单格式不正确': '信箱網域白名單格式不正確',
    '启用邮箱域名限制时，白名单不能为空': '啟用信箱網域限制時，白名單不能為空',
    'SMTP 端口须为 1-65535 的整数': 'SMTP 埠號須為 1-65535 的整數',
    '加密方式必须为 ssl、tls 或 none': '加密方式必須為 ssl、tls 或 none',
    '发件人邮箱格式不正确': '寄件者信箱格式不正確',
    '发件人名称最多 50 字符': '寄件者名稱最多 50 字元',
    '测试邮件已发送': '測試郵件已寄出',
    '标签最多 10 个': '標籤最多 10 個',
    '标签格式不正确（1-20字符，不可含空格）': '標籤格式不正確（1-20 字元，不可含空格）',
    '资源不存在': '資源不存在',
    '用户不存在': '使用者不存在',
    '不能删除自身账号': '不能刪除自己的帳號',
  },
  en: {
    '权限不足': 'Permission denied',
    '缺少 Authorization header': 'Missing Authorization header',
    'token 无效或已过期': 'Token is invalid or expired',
    '账号已被禁用': 'Account is disabled',
    '系统已初始化': 'System has already been initialized',
    '用户名格式不正确（3-20字符，字母/数字/下划线，不能以数字开头）': 'Username format is invalid (3-20 characters, letters, numbers, underscores, not starting with a number)',
    '显示名称须为1-30字符': 'Display name must be 1-30 characters',
    '邮箱格式不正确': 'Email format is invalid',
    '密码须为8-64字符，且同时包含字母和数字': 'Password must be 8-64 characters and include both letters and numbers',
    '两次密码不一致': 'Passwords do not match',
    '请求参数校验失败': 'Request validation failed',
    '初始化完成': 'Initialization completed',
    '用户名或密码错误': 'Incorrect username or password',
    '注册功能已关闭': 'Registration is disabled',
    '用户名格式不正确': 'Username format is invalid',
    '邮箱域名不在白名单': 'Email domain is not allowed',
    '用户名已被占用': 'Username is already taken',
    '邮箱已被注册': 'Email is already registered',
    '注册成功': 'Registration successful',
    '若邮箱已注册，重置链接已发送': 'If the email is registered, a reset link has been sent',
    '重置令牌无效': 'Reset token is invalid',
    '密码已重置': 'Password has been reset',
    'token 无效': 'Token is invalid',
    '当前密码错误': 'Current password is incorrect',
    '新旧密码不能相同': 'New password must differ from the current password',
    '密码已修改': 'Password has been changed',
    '类别名称已存在': 'Category name already exists',
    '类别不存在': 'Category does not exist',
    '删除成功': 'Deleted successfully',
    '站点标题须为 1-50 字符': 'Site title must be 1-50 characters',
    '站点副标题最多 100 字符': 'Site subtitle can be up to 100 characters',
    'Logo URL 格式不正确': 'Logo URL format is invalid',
    'Token 有效期须为 5-43200 分钟的整数': 'Token expiry must be an integer between 5 and 43200 minutes',
    '重置链接有效期须为 5-43200 分钟的整数': 'Reset link expiry must be an integer between 5 and 43200 minutes',
    '邮箱域名白名单格式不正确': 'Email domain allowlist format is invalid',
    '启用邮箱域名限制时，白名单不能为空': 'Email domain allowlist cannot be empty when domain restriction is enabled',
    'SMTP 端口须为 1-65535 的整数': 'SMTP port must be an integer between 1 and 65535',
    '加密方式必须为 ssl、tls 或 none': 'Encryption must be ssl, tls, or none',
    '发件人邮箱格式不正确': 'Sender email format is invalid',
    '发件人名称最多 50 字符': 'Sender name can be up to 50 characters',
    '测试邮件已发送': 'Test email sent',
    '标签最多 10 个': 'You can use up to 10 tags',
    '标签格式不正确（1-20字符，不可含空格）': 'Tag format is invalid (1-20 characters, no spaces)',
    '资源不存在': 'Resource does not exist',
    '用户不存在': 'User does not exist',
    '不能删除自身账号': 'You cannot delete your own account',
  },
  ja: {
    '权限不足': '権限がありません',
    '缺少 Authorization header': 'Authorization ヘッダーがありません',
    'token 无效或已过期': 'token が無効か期限切れです',
    '账号已被禁用': 'アカウントは無効化されています',
    '系统已初始化': 'システムはすでに初期化されています',
    '用户名格式不正确（3-20字符，字母/数字/下划线，不能以数字开头）': 'ユーザー名の形式が正しくありません（3〜20 文字、英数字とアンダースコア、数字始まり不可）',
    '显示名称须为1-30字符': '表示名は 1〜30 文字である必要があります',
    '邮箱格式不正确': 'メール形式が正しくありません',
    '密码须为8-64字符，且同时包含字母和数字': 'パスワードは 8〜64 文字で、英字と数字を含める必要があります',
    '两次密码不一致': '確認用パスワードが一致しません',
    '请求参数校验失败': 'リクエストの検証に失敗しました',
    '初始化完成': '初期化が完了しました',
    '用户名或密码错误': 'ユーザー名またはパスワードが正しくありません',
    '注册功能已关闭': '登録機能は無効です',
    '用户名格式不正确': 'ユーザー名の形式が正しくありません',
    '邮箱域名不在白名单': 'メールドメインが許可リストにありません',
    '用户名已被占用': 'ユーザー名はすでに使用されています',
    '邮箱已被注册': 'メールアドレスはすでに登録されています',
    '注册成功': '登録に成功しました',
    '若邮箱已注册，重置链接已发送': '登録済みの場合、再設定リンクを送信しました',
    '重置令牌无效': '再設定トークンが無効です',
    '密码已重置': 'パスワードを再設定しました',
    'token 无效': 'token が無効です',
    '当前密码错误': '現在のパスワードが正しくありません',
    '新旧密码不能相同': '新しいパスワードは現在のものと異なる必要があります',
    '密码已修改': 'パスワードを変更しました',
    '类别名称已存在': 'カテゴリ名はすでに存在します',
    '类别不存在': 'カテゴリが存在しません',
    '删除成功': '削除しました',
    '站点标题须为 1-50 字符': 'サイトタイトルは 1〜50 文字である必要があります',
    '站点副标题最多 100 字符': 'サイトサブタイトルは 100 文字以内である必要があります',
    'Logo URL 格式不正确': 'Logo URL の形式が正しくありません',
    'Token 有效期须为 5-43200 分钟的整数': 'Token の有効期限は 5〜43200 分の整数である必要があります',
    '重置链接有效期须为 5-43200 分钟的整数': '再設定リンクの有効期限は 5〜43200 分の整数である必要があります',
    '邮箱域名白名单格式不正确': 'メールドメイン許可リストの形式が正しくありません',
    '启用邮箱域名限制时，白名单不能为空': 'ドメイン制限を有効にする場合、許可リストは空にできません',
    'SMTP 端口须为 1-65535 的整数': 'SMTP ポートは 1〜65535 の整数である必要があります',
    '加密方式必须为 ssl、tls 或 none': '暗号化方式は ssl、tls、none のいずれかである必要があります',
    '发件人邮箱格式不正确': '送信者メールアドレスの形式が正しくありません',
    '发件人名称最多 50 字符': '送信者名は 50 文字以内である必要があります',
    '测试邮件已发送': 'テストメールを送信しました',
    '标签最多 10 个': 'タグは最大 10 個までです',
    '标签格式不正确（1-20字符，不可含空格）': 'タグ形式が正しくありません（1〜20 文字、空白不可）',
    '资源不存在': 'リソースが存在しません',
    '用户不存在': 'ユーザーが存在しません',
    '不能删除自身账号': '自分自身のアカウントは削除できません',
  },
}

const RESET_TOKEN_ERROR_MESSAGES: Record<Exclude<AppLocale, 'zh-Hans'>, Record<string, string>> = {
  'zh-Hant': {
    RESET_TOKEN_INVALID: '重設令牌無效',
    RESET_TOKEN_USED: '重設令牌已使用',
    RESET_TOKEN_EXPIRED: '重設令牌已過期',
  },
  en: {
    RESET_TOKEN_INVALID: 'Reset token is invalid',
    RESET_TOKEN_USED: 'Reset token has already been used',
    RESET_TOKEN_EXPIRED: 'Reset token has expired',
  },
  ja: {
    RESET_TOKEN_INVALID: '再設定トークンが無効です',
    RESET_TOKEN_USED: '再設定トークンはすでに使用されています',
    RESET_TOKEN_EXPIRED: '再設定トークンの有効期限が切れています',
  },
}

export function normalizeLocale(candidate?: string | null): AppLocale {
  if (!candidate) return DEFAULT_LOCALE
  const normalized = String(candidate).trim()
  if (!normalized) return DEFAULT_LOCALE

  const firstToken = normalized.split(',')[0]!.trim()
  const languageToken = firstToken.split(';')[0]!.trim().toLowerCase()

  if (SUPPORTED_LOCALES.has(firstToken as AppLocale)) return firstToken as AppLocale
  if (SUPPORTED_LOCALES.has(normalized as AppLocale)) return normalized as AppLocale
  if (languageToken === 'zh-hant' || languageToken.startsWith('zh-tw') || languageToken.startsWith('zh-hk') || languageToken.startsWith('zh-mo')) return 'zh-Hant'
  if (languageToken === 'zh-hans' || languageToken.startsWith('zh-cn') || languageToken.startsWith('zh-sg') || languageToken === 'zh') return 'zh-Hans'
  if (languageToken.startsWith('en')) return 'en'
  if (languageToken.startsWith('ja')) return 'ja'
  return DEFAULT_LOCALE
}

export function getRequestLocale(req: Pick<FastifyRequest, 'headers'>): AppLocale {
  const headerValue = req.headers['accept-language']
  if (Array.isArray(headerValue)) return normalizeLocale(headerValue[0] ?? null)
  return normalizeLocale(headerValue ?? null)
}

export function localizeText(locale: AppLocale, sourceText: string): string {
  if (locale === 'zh-Hans') return sourceText
  return STATIC_TRANSLATIONS[locale][sourceText] ?? sourceText
}

export function localizeFields(locale: AppLocale, fields?: Record<string, string>) {
  if (!fields) return undefined
  const localized: Record<string, string> = {}
  Object.entries(fields).forEach(([key, value]) => {
    localized[key] = localizeText(locale, value)
  })
  return localized
}

export function getResetTokenErrorMessage(locale: AppLocale, code: string) {
  if (locale === 'zh-Hans') return '重置令牌无效'
  return RESET_TOKEN_ERROR_MESSAGES[locale][code] || localizeText(locale, '重置令牌无效')
}

export function getRegisterMail(locale: AppLocale, displayName: string, username: string, tempPassword: string) {
  if (locale === 'zh-Hant') {
    return {
      subject: '歡迎註冊，您的初始密碼',
      body: `您好 ${displayName}，\n\n您的帳號已建立成功。\n\n使用者名稱：${username}\n初始密碼：${tempPassword}\n\n請登入後儘快修改密碼。`,
    }
  }
  if (locale === 'en') {
    return {
      subject: 'Welcome! Your initial password',
      body: `Hello ${displayName},\n\nYour account has been created successfully.\n\nUsername: ${username}\nInitial password: ${tempPassword}\n\nPlease sign in and change it as soon as possible.`,
    }
  }
  if (locale === 'ja') {
    return {
      subject: '登録完了のお知らせと初期パスワード',
      body: `こんにちは ${displayName} さん\n\nアカウントの作成が完了しました。\n\nユーザー名: ${username}\n初期パスワード: ${tempPassword}\n\nログイン後、できるだけ早くパスワードを変更してください。`,
    }
  }
  return {
    subject: '欢迎注册，您的初始密码',
    body: `您好 ${displayName}，\n\n您的账号已创建成功。\n\n用户名：${username}\n初始密码：${tempPassword}\n\n请登录后及时修改密码。`,
  }
}

export function getForgotPasswordMail(locale: AppLocale, displayName: string, resetLink: string, expiryMinutes: number) {
  if (locale === 'zh-Hant') {
    return {
      subject: '密碼重設請求',
      body: `您好 ${displayName}，\n\n您請求重設密碼。請點擊以下連結完成重設（${expiryMinutes} 分鐘內有效）：\n\n${resetLink}\n\n若非本人操作，請忽略此郵件。`,
    }
  }
  if (locale === 'en') {
    return {
      subject: 'Password reset request',
      body: `Hello ${displayName},\n\nYou requested a password reset. Use the link below to continue (valid for ${expiryMinutes} minutes):\n\n${resetLink}\n\nIf this was not you, you can ignore this email.`,
    }
  }
  if (locale === 'ja') {
    return {
      subject: 'パスワード再設定のご案内',
      body: `こんにちは ${displayName} さん\n\nパスワード再設定のリクエストを受け付けました。以下のリンクから続行してください（有効期限 ${expiryMinutes} 分）。\n\n${resetLink}\n\n心当たりがない場合は、このメールを無視してください。`,
    }
  }
  return {
    subject: '密码重置请求',
    body: `您好 ${displayName}，\n\n您请求重置密码。请点击以下链接完成重置（${expiryMinutes} 分钟内有效）：\n\n${resetLink}\n\n若非本人操作，请忽略此邮件。`,
  }
}

export function getAdminResetPasswordMail(locale: AppLocale, displayName: string, newPassword: string) {
  if (locale === 'zh-Hant') {
    return {
      subject: '管理員已重設您的密碼',
      body: `您好 ${displayName}，\n\n管理員已重設您的帳號密碼。\n\n新密碼：${newPassword}\n\n請登入後儘快修改密碼。`,
    }
  }
  if (locale === 'en') {
    return {
      subject: 'An administrator reset your password',
      body: `Hello ${displayName},\n\nAn administrator has reset your account password.\n\nNew password: ${newPassword}\n\nPlease sign in and change it as soon as possible.`,
    }
  }
  if (locale === 'ja') {
    return {
      subject: '管理者がパスワードを再設定しました',
      body: `こんにちは ${displayName} さん\n\n管理者があなたのアカウントのパスワードを再設定しました。\n\n新しいパスワード: ${newPassword}\n\nログイン後、できるだけ早く変更してください。`,
    }
  }
  return {
    subject: '管理员已重置您的密码',
    body: `您好 ${displayName}，\n\n管理员已重置您的账号密码。\n\n新密码：${newPassword}\n\n请登录后及时修改密码。`,
  }
}

export function getTestMail(locale: AppLocale, displayName: string) {
  if (locale === 'zh-Hant') {
    return {
      subject: '郵件服務測試',
      body: `您好 ${displayName}，\n\n這是一封測試郵件，用來確認郵件服務配置正常。`,
    }
  }
  if (locale === 'en') {
    return {
      subject: 'Email service test',
      body: `Hello ${displayName},\n\nThis is a test email to confirm the email service is configured correctly.`,
    }
  }
  if (locale === 'ja') {
    return {
      subject: 'メールサービスのテスト',
      body: `こんにちは ${displayName} さん\n\nこれはメールサービスの設定確認用テストメールです。`,
    }
  }
  return {
    subject: '邮件服务测试',
    body: `您好 ${displayName}，\n\n这是一封测试邮件，确认邮件服务配置正常。`,
  }
}
