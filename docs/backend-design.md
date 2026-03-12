## 后台设计文档

### 1. 目标与范围

本文件面向后端开发与维护人员，概述 ResourceHub 的后端架构、模块划分和关键业务规则。目标是让接手者无需通读全部代码，也能快速理解 API 边界和核心约束。

### 2. 整体架构

- **运行时与框架**
  - Node.js 18+、TypeScript。
  - Web 框架：Fastify v4，配合 `@fastify/jwt`、`@fastify/cors`、`@fastify/static`。
- **项目结构（后端）**
  - `src/app.ts`：应用入口，负责：
    - 运行数据库迁移（`runMigrations()`）。
    - 注册 CORS、JWT、静态资源插件。
    - 注册认证插件 `authPlugin`、管理员插件 `adminPlugin`。
    - 注册各路由模块：`/api/auth`、`/api/categories`、`/api/tags`、`/api/resources`、`/api/users`、`/api/config`。
  - `src/db/schema.ts`：所有表的 Drizzle Schema 定义，是数据库结构的唯一真相来源。
  - `src/db/migrate.ts`：
    - `runMigrations()`：执行 `CREATE TABLE IF NOT EXISTS`，保证 DB 结构就绪，并写入默认配置行。
    - `seedMockData(adminId)`：初始化 Mock 类别和资源数据。
  - `src/plugins/auth.ts` / `src/plugins/admin.ts`：封装 JWT 认证与管理员校验。
  - `src/routes/*.ts`：按域划分的路由处理逻辑。
  - `src/services/*.ts`：如邮件投递、重置 token 生成与校验等独立服务。

### 3. 模块划分与职责

#### 3.1 认证模块（`/api/auth`）

主要职责：

- 系统初始化（`/setup`）：
  - 仅在 `initialized.done === false` 时可调用。
  - 校验管理员用户名、邮箱和密码规则。
  - 创建首个管理员用户，写入默认 `system_config` 与 `email_config`，并调用 `seedMockData` 写入演示数据。
  - 将 `initialized.done` 置为 `true`。
- 初始化状态（`/init-status`）：
  - 公开接口，返回 `{ initialized: boolean }`。
- 获取 RSA 公钥（`/rsa-public-key`）：
  - 公开接口，返回 `{ success: true, data: { publicKey, alg: 'RSA', ts } }`：
    - `publicKey` 为 PEM 格式 RSA 公钥（`BEGIN PUBLIC KEY`），供前端加密使用。
    - `alg` 固定为 `'RSA'`，`ts` 为当前 Unix 秒时间戳，便于前端调试与缓存策略。
- 登录（`/login`）：
  - 接收加密密码参数 `{ username, passwordEnc, ts }`：
    - 前端使用后端提供的 RSA 公钥，对 `password + ':' + ts` 采用 RSA-OAEP（SHA-256）加密，并以 Base64 形式提交 `passwordEnc`。
    - `ts` 为 Unix 秒时间戳，用于服务端校验请求是否过期（默认窗口约 ±120 秒）。
  - 后端按用户名查找用户，校验账号状态；使用私钥解密 `passwordEnc`，解析出原始密码并进行 bcrypt 校验。
  - 根据 `system_config.tokenExpiry` 决定 JWT 过期时间。
  - 返回 `{ token, user }`，`user` 为脱敏后的用户对象。
- 注册（`/register`）：
  - 受 `system_config.enableRegister` 控制，关闭时返回 `REGISTER_DISABLED`。
  - 校验用户名、显示名称、邮箱和邮箱域名（如启用可选白名单）。
  - 生成 12 位初始密码（4 位大写字母 + 4 位数字 + 4 位小写字母），hash 后写入用户表。
  - 通过 `deliverMail` 发送“欢迎注册，您的初始密码”邮件；在 Mock 模式下返回 `emailPreview`。
- 忘记密码与重置密码（`/forgot-password`、`/reset-password`）：
  - 忘记密码：
    - 接收邮箱，返回固定语句“若邮箱已注册，重置链接已发送”，防止邮箱枚举。
    - 若邮箱存在，生成重置 token，写入 `reset_tokens`；发送包含 `#/reset-password?token=...` 链接的邮件。
  - 重置密码：
    - 校验 token 是否存在、是否过期、是否已用。
    - 校验新密码强度与两次一致。
    - 更新用户密码哈希，并标记 token 已使用。
- 个人信息与密码修改（`/me`、`/me` PUT、`/me/password`）：
  - 仅登录用户可访问。
  - 支持更新显示名称和邮箱（需保证邮箱唯一）。
  - 修改密码：
    - 接收加密密码参数 `{ currentPasswordEnc, newPasswordEnc, ts }`，加密方式与登录相同。
    - 校验时间戳是否在允许窗口内。
    - 使用私钥分别解密得到明文当前密码与新密码，校验当前密码、新旧密码不同以及新密码规则；前端负责保证两次新密码一致。

关键约定：

- 所有错误响应统一为 `{ success: false, error, code }`，部分校验错误包含 `fields` 字段。
- 认证失败与 token 相关错误由 `authPlugin` 统一处理，业务路由中只需依赖 `fastify.authenticate` / `fastify.requireAdmin`。

#### 3.2 资源模块（`/api/resources`）

职责：围绕 `resources`、`resource_tags`、`favorites`、`visit_history`、`visit_hourly` 等表，实现资源列表、筛选、增删改查、收藏与访问统计。

主要端点与规则（摘要）：

- `GET /api/resources`：
  - 可选认证，服务端通过 `parseOptionalUser` 从 Bearer token 推断用户/角色。
  - 根据用户身份构造可见性条件：
    - 未登录：`visibility = 'public' AND enabled = true`。
    - 登录普通用户：公开且启用的资源 + 自己作为 owner 的资源。
    - 管理员：可见性不受限。
  - 支持 query 参数：
    - `q`：模糊匹配名称、描述、URL 和标签。
    - `category`：按类别 ID 过滤。
    - `tags`：逗号分隔标签列表，多标签为 AND 逻辑，使用多个 `EXISTS` 子查询实现。
    - `sort`：`hot` / `createdAt` / `updatedAt`。
  - 使用批量查询一次性取回标签和类别信息，避免 N+1 查询。
- `POST /api/resources`：
  - 仅登录用户可用。
  - 校验资源名称、URL、Logo URL、描述、标签数量和长度等。
  - 使用当前用户作为 `ownerId`，初始化 `visit_count = 0`，`created_at` 与 `updated_at` 设置为当前 Unix 秒。
  - 写入 `resource_tags` 时去重，忽略重复组合。
- `PUT /api/resources/:id` / `DELETE /api/resources/:id`：
  - 需登录，通过业务逻辑限制为资源 owner 或管理员可操作。
  - 更新时，如传入标签数组，则先删除该资源所有标签再全量重建。
  - 删除资源时，依赖外键 `ON DELETE CASCADE` 自动删除标签关联、收藏和访问历史。
- `POST /api/resources/:id/visit`：
  - 需登录。
  - 首先校验资源是否对当前用户可见（使用 `isVisible` 帮助函数）。
  - 若可见：
    - `visit_count` 自增。
    - 在 `visit_history` 中插入一条新记录。
    - 通过查询并按 ID 升序排序，保证单用户访问历史最多 200 条，多余的最旧记录被删除。
    - 同时更新 `visit_hourly`，按小时维度聚合访问次数。
- `POST /api/resources/:id/favorite`：
  - 需登录。
  - 在收藏表中以 `(user_id, resource_id)` 为主键进行 toggle 插入/删除。
- `GET /api/resources/favorites` / `/history` / `/mine`：
  - 需登录。
  - 分别返回用户收藏资源、访问历史资源和自己创建的资源列表。
  - 结果使用与主列表统一的资源响应结构，便于前端统一展示。
- `GET /api/resources/analytics` 与 `POST /api/resources/analytics/visit`：
  - 基于 `visit_hourly` 提供全局访问统计和首页访问记录，主要用于首页统计卡片展示。

可见性与所有权规则是资源模块的核心约束，修改相关逻辑前应格外小心。

#### 3.3 类别与标签模块（`/api/categories`、`/api/tags`）

**类别（Categories）**

- `GET /api/categories`：
  - 公开接口，但 `resourceCount` 统计时会参考调用者的可见性规则：
    - 未登录只统计公开且启用资源。
    - 登录用户统计公开且启用资源 + 自己的私有资源。
    - 管理员统计全部资源。
- `POST /api/categories`：
  - 登录用户可调用，主要用于资源表单中内联创建新类别。
  - 校验名称唯一。
  - 颜色从预设颜色池中随机分配。
- `PUT /api/categories/:id`、`DELETE /api/categories/:id`：
  - 仅管理员可调用。
  - 删除类别时，通过外键 `ON DELETE SET NULL` 将相关资源的 `category_id` 置空。

**标签（Tags）**

- `GET /api/tags`：
  - 公开接口，按标签使用次数降序返回 `{ tag, count }` 列表。
  - `count` 为所有资源上的使用总次数，不受可见性过滤。
- `DELETE /api/tags/:tag`：
  - 仅管理员可调用。
  - 删除 `resource_tags` 中指定标签的所有记录，资源本身不删除。

#### 3.4 用户模块（`/api/users`）

职责：管理员维护用户账号。

- 所有端点均使用 `requireAdmin` 保护，仅管理员可访问。
- `GET /api/users`：
  - 返回所有用户的脱敏信息（不包含密码哈希）。
- `POST /api/users`：
  - 管理员直接创建用户，传入明文密码（只用于 hash，绝不回显）。
  - 不发送邮件通知。
- `PUT /api/users/:id`：
  - 支持更新显示名称、邮箱、角色和状态。
  - 更新邮箱时需保证唯一性。
- `DELETE /api/users/:id`：
  - 不允许删除当前登录管理员自身。
  - 删除前需将被删用户的资源 `owner_id` 全部转移到当前操作者（管理员）ID，避免外键约束错误。
  - 收藏与访问历史通过 `ON DELETE CASCADE` 自动清理。
- `POST /api/users/:id/reset-password`：
  - 为指定用户生成新密码（格式同注册时的初始密码）。
  - 更新密码哈希并发送邮件通知；在 Mock 模式下返回 `emailPreview`。

#### 3.5 配置与邮件模块（`/api/config`）

**系统配置（System Config）**

- `GET /api/config/system`：
  - 公开接口，仅返回前端所需的公开字段（站点标题、副标题、Logo、是否允许注册）。
- `GET /api/config/system/full`：
  - 仅管理员可调用，返回完整的 `system_config`。
- `PUT /api/config/system`：
  - 管理员更新系统配置：
    - 基本显示字段：站点标题、副标题、Logo 链接。
    - 安全相关：登录 token 过期时间、重置 token 过期时间。
    - 注册策略：是否允许注册、是否启用可选邮箱域名白名单及白名单内容。
  - 在业务层保证数值范围和字段格式的合法性。

**邮件配置（Email Config）**

- `GET /api/config/email`：
  - 仅管理员可调用。
  - 返回邮件配置，但 `smtpPassword` 字段以掩码形式返回（例如 `"***"`），不泄露真实值。
- `PUT /api/config/email`：
  - 管理员更新 SMTP 主机、端口、加密方式、发件邮箱/名称、用户名和密码。
  - 若请求体中 `smtpPassword` 为 `"***"`，则保持原值不变。
  - 在业务层校验端口范围、加密方式枚举值以及邮箱格式。
- `POST /api/config/email/test`：
  - 管理员触发邮件服务测试。
  - 使用当前配置向当前管理员邮箱发送一封测试邮件。
  - 在 Mock 模式下返回 `emailPreview`，便于前端展示。

### 4. 跨模块约定

#### 4.1 响应格式

- 成功统一为：`{ success: true, data: T }`。
- 失败统一为：`{ success: false, error: string, code: string }`，必要时附加 `fields` 字段详细说明各字段错误。
- 触发邮件的接口在 Mock 模式下会额外返回：
  - `emailPreview: { to, subject, body }`，由前端弹出预览窗口。

#### 4.2 错误码

常用错误码示例：

- 认证状态相关：`SYSTEM_NOT_INITIALIZED`、`SYSTEM_ALREADY_INITIALIZED`、`TOKEN_MISSING`、`TOKEN_INVALID`、`ACCOUNT_DISABLED`。
- 权限相关：`PERMISSION_DENIED`。
- 账号与注册：`REGISTER_DISABLED`、`EMAIL_DOMAIN_NOT_ALLOWED`、`USERNAME_TAKEN`、`EMAIL_TAKEN`。
- 密码重置：`RESET_TOKEN_INVALID`、`RESET_TOKEN_EXPIRED`、`RESET_TOKEN_USED`、`WRONG_PASSWORD`、`SAME_PASSWORD`。
- 登录与加密：`LOGIN_TIMESTAMP_EXPIRED`、`PASSWORD_ENCRYPTION_INVALID`。
- 通用资源：`RESOURCE_NOT_FOUND`、`CATEGORY_NOT_FOUND`、`USER_NOT_FOUND`、`CATEGORY_NAME_TAKEN`、`CANNOT_DELETE_SELF`、`VALIDATION_ERROR`。

#### 4.3 安全要点

- 所有密码使用 bcrypt（轮数约 10）进行哈希存储，严禁明文日志或回显。
- JWT 密钥从环境变量 `JWT_SECRET` 读取，开发环境提供默认值 `dev-secret-change-me`，生产环境必须覆盖。
- 所有数据库访问通过 Drizzle ORM 构建 SQL，避免手写字符串拼接。
- 敏感字段（密码哈希、SMTP 密码）不得出现在任何 API 响应中。
- 登录与忘记密码接口不区分“账号/邮箱是否存在”，防止暴力枚举。
- 登录与修改密码请求中的密码在传输中使用 RSA-OAEP 加密：
  - RSA 密钥对存储在 `rsa_keys` 表中，仅私钥保存在服务端，永不通过 API 暴露。
  - 前端仅通过 `GET /api/auth/rsa-public-key` 获取公钥；若密钥不存在，服务启动时会自动生成并写入数据库。

### 5. 典型时序示例（文字版）

#### 5.1 用户注册（Mock 邮件模式）

1. 前端在 `#/register` 提交用户名、显示名称和邮箱。
2. 后端 `POST /api/auth/register`：
   - 校验字段与可选邮箱白名单。
   - 检查用户名和邮箱唯一性。
   - 生成初始密码并写入用户表。
   - 从 `email_config` 读取 SMTP 配置，因 `smtp_host` 为空进入 Mock 模式。
   - 调用 `deliverMail` 返回邮件预览对象，将其附加到响应的 `emailPreview` 字段。
3. 前端收到响应后：
   - 显示成功 Toast。
   - 弹出 Email 预览弹窗显示收件人、主题和正文。
   - 一段时间后自动跳转到登录页。

#### 5.2 访问资源与历史记录

1. 已登录用户在首页点击某个资源卡片。
2. 前端在新标签页打开资源 URL，并并行调用 `POST /api/resources/:id/visit`。
3. 后端：
   - 根据 token 解析用户和角色。
   - 加载资源并检查是否对该用户可见。
   - 若可见：
     - 更新 `resources.visit_count` +1。
     - 在 `visit_history` 中插入一条记录。
     - 统计该用户的访问记录总数，若超过 200 条，则删除最旧的多余记录。
     - 计算当前小时桶并在 `visit_hourly` 中累加统计。
4. 前端后续在“最近访问”视图中通过 `GET /api/resources/history` 展示访问记录。

以上即为后台设计的主要内容，后续如增加新模块或端点，应在对应小节补充职责与约束，保持文档与实现同步。 
