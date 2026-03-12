# 资源导航系统 — 后端开发需求文档

> 本文档用于指导后端 API 的实现。  
> 技术架构、数据模型、接口清单见 `design.md`；前端交互见 `requirements-frontend.md`。

---

## 一、通用约定

### 1.1 请求 / 响应格式

所有接口统一 JSON 通信，Content-Type: `application/json`。

**成功响应**
```json
{ "success": true, "data": <T> }
```

**失败响应**
```json
{ "success": false, "error": "错误描述", "code": "ERROR_CODE" }
```

**邮件触发接口额外字段**（Mock 模式下）
```json
{
  "success": true,
  "data": { ... },
  "emailPreview": {
    "to": "user@example.com",
    "subject": "邮件主题",
    "body": "纯文本正文，含密码/链接等关键信息"
  }
}
```

### 1.2 统一错误码表

| code | HTTP 状态码 | 含义 |
|------|------------|------|
| `SYSTEM_NOT_INITIALIZED` | 403 | 系统未完成初始化 |
| `SYSTEM_ALREADY_INITIALIZED` | 403 | 系统已初始化，不可重复操作 |
| `INVALID_CREDENTIALS` | 401 | 用户名或密码错误 |
| `ACCOUNT_DISABLED` | 403 | 账号已被禁用 |
| `TOKEN_MISSING` | 401 | 缺少 Authorization header |
| `TOKEN_INVALID` | 401 | token 无效或已过期 |
| `PERMISSION_DENIED` | 403 | 权限不足（非管理员或非 owner） |
| `REGISTER_DISABLED` | 403 | 注册功能已关闭 |
| `EMAIL_DOMAIN_NOT_ALLOWED` | 422 | 邮箱域名不在白名单 |
| `USERNAME_TAKEN` | 422 | 用户名已被占用 |
| `EMAIL_TAKEN` | 422 | 邮箱已被注册 |
| `RESET_TOKEN_INVALID` | 422 | 重置 token 无效 |
| `RESET_TOKEN_EXPIRED` | 422 | 重置 token 已过期 |
| `RESET_TOKEN_USED` | 422 | 重置 token 已使用 |
| `WRONG_PASSWORD` | 422 | 当前密码错误 |
| `SAME_PASSWORD` | 422 | 新旧密码不能相同 |
| `RESOURCE_NOT_FOUND` | 404 | 资源不存在 |
| `CATEGORY_NOT_FOUND` | 404 | 类别不存在 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `CATEGORY_NAME_TAKEN` | 422 | 类别名称已存在 |
| `CANNOT_DELETE_SELF` | 422 | 管理员不可删除自身账号 |
| `VALIDATION_ERROR` | 422 | 请求字段校验失败 |

`VALIDATION_ERROR` 响应格式：
```json
{
  "success": false,
  "error": "请求参数校验失败",
  "code": "VALIDATION_ERROR",
  "fields": { "username": "用户名长度须在 3–20 字符之间" }
}
```

### 1.3 输入校验规则

所有接口在处理业务逻辑前先完成参数校验，校验失败返回 `VALIDATION_ERROR`。

| 字段 | 规则 |
|------|------|
| `username` | 3–20 字符，仅字母/数字/下划线，不能为纯数字，正则 `^[a-zA-Z_][a-zA-Z0-9_]{2,19}$` |
| `displayName` | 1–30 字符，不可为纯空白 |
| `email` | 标准 email 格式，正则 `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `password`（设置/重置） | 8–64 字符，必须同时包含字母和数字 |
| `url` | 必须以 `http://` 或 `https://` 开头 |
| `name`（资源名） | 1–50 字符 |
| `description` | 最多 200 字符 |
| `tag`（单个） | 1–20 字符，不可含空格 |
| `tags`（数组） | 最多 10 个 |
| `logoUrl` | 选填；若有值则校验 URL 格式（同 `url` 规则） |
| `tokenExpiry` / `resetTokenExpiry` | 整数，范围 5–43200（分钟） |
| `emailDomainWhitelist` | 逗号分隔域名列表；每项需为合法域名，如 `example.com` |
| `smtpPort` | 整数，范围 1–65535 |
| `encryption` | 仅允许 `ssl` / `tls` / `none` |
| `fromEmail` | 选填；若有值则校验 email 格式 |
| `fromName` | 选填；最长 50 字符 |

### 1.4 认证中间件

- `authenticate`：验证 Bearer token；缺失 → `TOKEN_MISSING`；无效/过期 → `TOKEN_INVALID`；验证通过后将 `{ userId, role }` 挂载到 `request.user`；若用户 `status === 'disabled'` → `ACCOUNT_DISABLED`
- `requireAdmin`：在 `authenticate` 基础上检查 `request.user.role === 'admin'`，否则 → `PERMISSION_DENIED`

### 1.5 Mock 邮件判断

检查 `email_config` 表中 `smtpHost` 是否为空字符串：
- 为空 → Mock 模式：不实际发送，控制台打印邮件内容，响应附加 `emailPreview` 字段
- 非空 → 真实发送：使用 Nodemailer 按配置发送，响应不附加 `emailPreview`

---

## 二、Auth 接口详情（`/api/auth`）

### POST `/setup` — 系统初始化

**前置条件：** `initialized.done === false`，否则 → `SYSTEM_ALREADY_INITIALIZED`

**请求体：**
```json
{
  "username": "admin",
  "displayName": "管理员",
  "email": "admin@example.com",
  "password": "Abc12345",
  "confirmPassword": "Abc12345"
}
```

**校验：** 所有字段 required；`password === confirmPassword`；password 符合强度规则

**业务逻辑：**
1. 创建 `users` 记录，`role='admin'`，`status='active'`，密码 bcrypt hash（rounds=10）
2. upsert `system_config` id='default'（写入全部默认值）
3. upsert `email_config` id='default'（写入全部空值默认）
4. 执行 Mock 数据写入（见第八章）
5. 将 `initialized.done` 置 `true`

**响应 data：** `{ "message": "初始化完成" }`

---

### GET `/init-status` — 初始化状态

**响应 data：** `{ "initialized": boolean }`

---

### POST `/login` — 登录

**请求体：** `{ "username": "admin", "password": "Abc12345" }`

**业务逻辑：**
1. 查 `users` by `username`，不存在 → `INVALID_CREDENTIALS`（不区分用户名/密码错误，防枚举）
2. 检查 `status === 'active'`，否则 → `ACCOUNT_DISABLED`
3. bcrypt 比对密码，失败 → `INVALID_CREDENTIALS`
4. 签发 JWT，payload `{ userId, role }`，有效期读 `system_config.tokenExpiry`（单位：分钟）

**响应 data：**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "uuid",
    "username": "admin",
    "displayName": "管理员",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": 1700000000
  }
}
```

---

### POST `/register` — 注册

**前置条件：** `system_config.enableRegister === true`，否则 → `REGISTER_DISABLED`

**请求体：**
```json
{
  "username": "alice",
  "displayName": "Alice",
  "email": "alice@example.com"
}
```

**业务逻辑：**
1. 若 `restrictEmailDomain === true`，校验邮箱后缀在 `emailDomainWhitelist`（逗号分隔）中，否则 → `EMAIL_DOMAIN_NOT_ALLOWED`
2. 检查 `username` 唯一性 → `USERNAME_TAKEN`
3. 检查 `email` 唯一性 → `EMAIL_TAKEN`
4. 自动生成初始密码：12 位，格式 `[4位大写字母][4位数字][4位小写字母]`，示例 `ABCD1234efgh`
5. bcrypt hash 密码（rounds=10），创建 `users` 记录，`role='user'`，`status='active'`
6. 发送邮件（Mock 或真实）：主题「欢迎注册，您的初始密码」，正文包含用户名和明文初始密码

**响应 data：** `{ "message": "注册成功" }`，Mock 模式附加 `emailPreview`

---

### POST `/forgot-password` — 忘记密码

**请求体：** `{ "email": "alice@example.com" }`

**业务逻辑：**
1. 查询邮箱是否存在；**无论是否存在，响应格式相同**（防枚举）
2. 若存在：生成 reset token（32位随机 hex），写入 `reset_tokens`，有效期读 `system_config.resetTokenExpiry`（分钟）
3. 发送邮件，正文含重置链接 `http://HOST/#/reset-password?token=xxx`及有效期说明

**响应 data：** `{ "message": "若邮箱已注册，重置链接已发送" }`，Mock 模式附加 `emailPreview`（邮箱不存在时不附加）

---

### POST `/reset-password` — 重置密码

**请求体：**
```json
{
  "token": "xxxxx",
  "newPassword": "NewPass123",
  "confirmPassword": "NewPass123"
}
```

**业务逻辑：**
1. 查 `reset_tokens` by token，不存在 → `RESET_TOKEN_INVALID`
2. `used === true` → `RESET_TOKEN_USED`
3. `expiresAt <= now()` → `RESET_TOKEN_EXPIRED`
4. `newPassword !== confirmPassword` → `VALIDATION_ERROR`
5. 更新 `users.passwordHash`，标记 `reset_tokens.used = true`

**响应 data：** `{ "message": "密码已重置" }`

---

### GET `/me` — 获取当前用户

**响应 data：** 同 login 中的 `user` 对象

---

### PUT `/me` — 更新个人信息

**请求体：**（字段均可选，至少传一个）
```json
{ "displayName": "新名字", "email": "new@example.com" }
```

**业务逻辑：** 若更新 `email`，检查唯一性 → `EMAIL_TAKEN`

**响应 data：** 更新后的 `user` 对象

---

### PUT `/me/password` — 修改密码

**请求体：**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass456",
  "confirmPassword": "NewPass456"
}
```

**业务逻辑：**
1. bcrypt 比对 `currentPassword` → `WRONG_PASSWORD`
2. `newPassword === currentPassword` → `SAME_PASSWORD`
3. `newPassword !== confirmPassword` → `VALIDATION_ERROR`
4. 更新 `passwordHash`

**响应 data：** `{ "message": "密码已修改" }`

---

## 三、Resources 接口详情（`/api/resources`）

### GET `/` — 资源列表

**Query 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索词，匹配 `name` / `description` / `url` / tags（LIKE %q%） |
| `category` | string | 类别 id，精确匹配 |
| `tags` | string | 逗号分隔标签名，AND 逻辑（资源必须含全部指定标签） |
| `sort` | `hot`\|`createdAt`\|`updatedAt` | 排序，默认 `hot`（visitCount 降序） |

**可见性过滤规则（SQL WHERE 条件）：**
- 未登录：`visibility='public' AND enabled=true`
- 已登录普通用户：`(visibility='public' AND enabled=true) OR ownerId='{userId}'`
- 已登录管理员：无过滤（返回全部）

**响应 data：** 资源数组，每条包含：
```json
{
  "id": "uuid",
  "name": "GitHub",
  "url": "https://github.com",
  "categoryId": "uuid",
  "categoryName": "开发工具",
  "categoryColor": "#0071E3",
  "visibility": "public",
  "logoUrl": "",
  "description": "",
  "enabled": true,
  "ownerId": "uuid",
  "visitCount": 42,
  "tags": ["前端", "开源"],
  "isFavorited": true,
  "createdAt": 1700000000,
  "updatedAt": 1700000000
}
```

> `isFavorited`：已登录时查 `favorites` 表；未登录固定 `false`
> `categoryName` / `categoryColor`：JOIN `categories` 表获取；`categoryId` 为 null 时两者返回 `null`

---

### POST `/` — 新增资源

**请求体：**
```json
{
  "name": "GitHub",
  "url": "https://github.com",
  "categoryId": "uuid",
  "visibility": "public",
  "logoUrl": "",
  "description": "",
  "tags": ["前端", "开源"],
  "enabled": true
}
```

**业务逻辑：**
- `ownerId` 自动设为当前登录用户 id
- `tags` 逐一写入 `resource_tags`（去重，忽略已存在组合）
- `createdAt` = `updatedAt` = 当前时间戳

**响应 data：** 完整资源对象（同列表单条格式）

---

### PUT `/:id` — 编辑资源

**权限：** owner 或管理员，否则 → `PERMISSION_DENIED`

**请求体：** 同新增，所有字段可选

**业务逻辑：**
- `updatedAt` = 当前时间戳
- `tags` 若传入，全量替换：先 DELETE 该资源所有 `resource_tags`，再 INSERT 新 tags

**响应 data：** 更新后的完整资源对象

---

### DELETE `/:id` — 删除资源

**权限：** owner 或管理员

**业务逻辑：** 删除资源；`resource_tags`、`favorites`、`visit_history` 通过外键 cascade 自动删除

**响应 data：** `{ "message": "删除成功" }`

---

### POST `/:id/visit` — 记录访问

**业务逻辑：**
1. 查资源是否存在且对当前用户可见（同列表可见性规则），否则 → `RESOURCE_NOT_FOUND`
2. `resources.visitCount += 1`
3. INSERT `visit_history` 记录
4. 检查该用户 `visit_history` 总数，超过 200 条时 DELETE `id` 最小的记录
5. 每次点击均计数，不做短时间去重

**响应 data：** `{ "visitCount": 43 }`

---

### GET `/favorites` — 收藏列表

**响应 data：** 资源数组，按 `favorites.createdAt` 倒序，全量返回，格式同列表单条

---

### POST `/:id/favorite` — 收藏 / 取消收藏（toggle）

**业务逻辑：**
- `(userId, resourceId)` 已存在 → DELETE（取消收藏）
- 不存在 → INSERT（收藏）

**响应 data：** `{ "isFavorited": true }` 或 `{ "isFavorited": false }`

---

### GET `/history` — 访问历史

**响应 data：** 资源数组，按 `visit_history.visitedAt` 倒序，全量返回（最多 200 条），格式同列表单条

> 同一资源可多次出现（每次访问各一条）；前端如需去重自行处理

---

### GET `/mine` — 我创建的

**响应 data：** 资源数组，按 `createdAt` 倒序，全量返回，格式同列表单条

---

## 四、Categories 接口详情（`/api/categories`）

### GET `/` — 类别列表

**响应 data：**
```json
[
  {
    "id": "uuid",
    "name": "开发工具",
    "color": "#0071E3",
    "resourceCount": 5,
    "createdAt": 1700000000
  }
]
```

> `resourceCount` 口径与资源列表可见性规则一致：未登录只计 `public+enabled`；已登录计 `public+enabled + 自己私有`；管理员计全部

---

### POST `/` — 新增类别

**请求体：** `{ "name": "新类别" }`

**业务逻辑：**
- 检查 `name` 唯一性 → `CATEGORY_NAME_TAKEN`
- 颜色随机从 8 色池取值：`#5856D6` `#FF9500` `#34C759` `#FF3B30` `#0071E3` `#FF2D55` `#AF52DE` `#00C7BE`

**响应 data：** 完整类别对象

---

### PUT `/:id` — 编辑类别（管理员）

**请求体：** `{ "name": "新名称", "color": "#FF9500" }`（字段可选）

**业务逻辑：** 若更新 `name`，检查唯一性 → `CATEGORY_NAME_TAKEN`

**响应 data：** 更新后的类别对象

---

### DELETE `/:id` — 删除类别（管理员）

**业务逻辑：**
- DELETE `categories` 记录
- 通过外键 `onDelete: 'set null'`，关联资源 `categoryId` 自动置 null

**响应 data：** `{ "message": "删除成功", "affectedResources": 3 }`

---

## 五、Tags 接口详情（`/api/tags`）

### GET `/` — 标签列表

**响应 data：** 按 `count` 降序
```json
[
  { "tag": "前端", "count": 8 },
  { "tag": "后端", "count": 5 }
]
```

> `count` 统计所有资源的使用次数（不过滤可见性）

---

### DELETE `/:tag` — 删除标签（管理员）

**业务逻辑：** DELETE `resource_tags` WHERE `tag = :tag`（资源本身不删除）

**响应 data：** `{ "message": "删除成功", "affectedResources": 3 }`

---

## 六、Users 接口详情（`/api/users`，管理员）

### GET `/` — 用户列表

**响应 data：** 用户数组（不含 `passwordHash`）：
```json
{
  "id": "uuid",
  "username": "alice",
  "displayName": "Alice",
  "email": "alice@example.com",
  "role": "user",
  "status": "active",
  "createdAt": 1700000000
}
```

---

### POST `/` — 新增用户

**请求体：**
```json
{
  "username": "bob",
  "displayName": "Bob",
  "email": "bob@example.com",
  "password": "BobPass123",
  "role": "user"
}
```

**业务逻辑：** 直接使用传入密码（不自动生成），不发送邮件；其余同注册逻辑

**响应 data：** 用户对象（不含 `passwordHash`）

---

### PUT `/:id` — 编辑用户

**请求体：**（字段可选）
```json
{
  "displayName": "New Name",
  "email": "new@example.com",
  "role": "admin",
  "status": "disabled"
}
```

**业务逻辑：** 若更新 `email`，检查唯一性 → `EMAIL_TAKEN`

**响应 data：** 更新后的用户对象

---

### DELETE `/:id` — 删除用户

**业务逻辑：**
- 删除自身 → `CANNOT_DELETE_SELF`
- DELETE `users`；`favorites`、`visit_history` 通过外键 cascade 自动删除
- 该用户创建的资源不删除；删除前先将其 `ownerId` 转移给执行删除操作的管理员

**响应 data：** `{ "message": "删除成功" }`

---

### POST `/:id/reset-password` — 重置用户密码（管理员）

**业务逻辑：**
1. 自动生成新密码（同注册规则：12位 `[4大写][4数字][4小写]`）
2. 更新 `passwordHash`
3. 发送邮件通知用户新密码

**响应 data：** `{ "message": "密码已重置" }`，Mock 模式附加 `emailPreview`

---

## 七、Config 接口详情（`/api/config`）

### GET `/system` — 公开配置（脱敏，无需认证）

**响应 data：**
```json
{
  "siteTitle": "资源导航系统",
  "siteSubtitle": "登录以访问企业资源导航",
  "logoUrl": "",
  "enableRegister": true
}
```

---

### GET `/system/full` — 完整系统配置（管理员）

**响应 data：** `system_config` 全部字段

---

### PUT `/system` — 更新系统配置（管理员）

**请求体：**（字段均可选）
```json
{
  "siteTitle": "企业资源库",
  "siteSubtitle": "内部使用",
  "logoUrl": "https://...",
  "tokenExpiry": 120,
  "resetTokenExpiry": 30,
  "enableRegister": false,
  "restrictEmailDomain": true,
  "emailDomainWhitelist": "company.com,corp.com"
}
```

**校验补充：**
- `tokenExpiry`、`resetTokenExpiry` 若传入，必须为 5–43200 的整数
- `logoUrl` 若传入，必须为合法 `http://` / `https://` URL
- `emailDomainWhitelist` 若传入，必须为逗号分隔的合法域名列表

**响应 data：** 更新后的完整配置

---

### GET `/email` — 邮件配置（管理员）

**响应 data：** `email_config` 全部字段，`smtpPassword` 返回 `"***"`

---

### PUT `/email` — 更新邮件配置（管理员）

**请求体：**（字段均可选）
```json
{
  "smtpHost": "smtp.example.com",
  "smtpPort": 465,
  "encryption": "ssl",
  "fromEmail": "noreply@example.com",
  "fromName": "资源导航系统",
  "smtpUser": "noreply@example.com",
  "smtpPassword": "secret"
}
```

> 若 `smtpPassword` 传入 `"***"`，视为不更新，保留原值

**校验补充：**
- `smtpPort` 若传入，必须为 1–65535 的整数
- `encryption` 若传入，仅允许 `ssl` / `tls` / `none`
- `fromEmail` 若传入，必须为合法邮箱地址
- `fromName` 若传入，最长 50 字符

**响应 data：** 更新后的配置（password 脱敏）

---

### POST `/email/test` — 测试邮件（管理员）

**业务逻辑：** 使用当前 `email_config` 发送测试邮件到当前管理员邮箱，主题「邮件服务测试」

**响应 data：** `{ "message": "测试邮件已发送" }`，Mock 模式附加 `emailPreview`

---

## 八、Mock 数据详细清单（`migrate.ts`）

`POST /setup` 成功后执行，所有资源 `ownerId` 指向初始管理员。

### 8.1 类别（5条，使用固定 id）

| id | name | color |
|----|------|-------|
| `cat-001` | 开发工具 | `#0071E3` |
| `cat-002` | 设计资源 | `#AF52DE` |
| `cat-003` | 文档知识 | `#34C759` |
| `cat-004` | 效率工具 | `#FF9500` |
| `cat-005` | AI 工具 | `#FF3B30` |

### 8.2 资源（10条）

| name | url | categoryId | visibility | tags | visitCount |
|------|-----|------------|------------|------|-----------|
| GitHub | `https://github.com` | cat-001 | public | 前端, 后端, 开源 | 100 |
| Figma | `https://figma.com` | cat-002 | public | 设计 | 80 |
| MDN Web Docs | `https://developer.mozilla.org` | cat-003 | public | 前端, 文档 | 90 |
| Notion | `https://notion.so` | cat-004 | public | 效率, 文档 | 70 |
| ChatGPT | `https://chat.openai.com` | cat-005 | public | AI | 120 |
| VS Code | `https://code.visualstudio.com` | cat-001 | public | 前端, 后端, 开源 | 60 |
| Dribbble | `https://dribbble.com` | cat-002 | public | 设计 | 40 |
| Postman | `https://postman.com` | cat-001 | public | 后端, API | 50 |
| Obsidian | `https://obsidian.md` | cat-004 | public | 效率 | 30 |
| 内部文档（私有示例）| `http://internal.example.com` | cat-003 | **private** | 文档 | 5 |

所有资源：`enabled=true`，`createdAt`=`updatedAt`=当前时间戳，`logoUrl`=`description`=空字符串

### 8.3 标签

通过资源写入 `resource_tags` 自动产生，共 8 个：`前端` `后端` `设计` `文档` `API` `效率` `AI` `开源`

---

## 九、安全要求

| 项目 | 要求 |
|------|------|
| 密码存储 | bcrypt rounds=10，禁止明文存储 |
| JWT 密钥 | 从环境变量 `JWT_SECRET` 读取；未配置时使用 `dev-secret-change-me`（仅开发） |
| SQL 注入 | 全程使用 Drizzle ORM 参数化查询，禁止字符串拼接 SQL |
| 枚举防护 | 登录失败、忘记密码接口不区分"用户不存在"和"密码/token错误" |
| 敏感字段 | `passwordHash`、`smtpPassword` 真实值禁止出现在任何响应中 |
| CORS | 开发模式允许所有来源；生产模式限制同域 |

---

## 十、环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 服务监听端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥，生产必须修改 |
| `DB_PATH` | `data/app.db` | SQLite 文件路径 |
| `NODE_ENV` | `development` | 生产模式下关闭详细错误堆栈 |

