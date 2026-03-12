# 资源导航系统 — 方案设计文档 v5

> 技术栈：React 18（多文件 CDN + Babel Standalone）+ Fastify + TypeScript + Drizzle ORM + SQLite  
> 部署：后端 Node 进程同时 serve 前端静态文件  

---

## 一、技术选型

### 1.1 前端

| 项目 | 选择 | 说明 |
|------|------|------|
| 框架 | React 18（CDN） | `unpkg.com/react@18/umd/react.development.js` |
| 路由 | 手写 Hash 路由 | 监听 `hashchange` + `window.location.hash` |
| 样式 | Tailwind CSS（CDN Play） | `cdn.tailwindcss.com` |
| 图标 | Lucide React（CDN） | `unpkg.com/lucide-react` |
| 状态管理 | React Context + useReducer | 全局一个 AppContext |
| JSX 转译 | Babel Standalone | `unpkg.com/@babel/standalone`，每个 `.jsx` 文件以 `<script type="text/babel" src="...">` 引入 |
| 模块加载 | 原生 ES Module（`type="module"`） | `index.html` 按依赖顺序加载各 `.jsx` 文件，无需打包工具 |
| API 通信 | `fetch` + JSON | 所有请求带 `Authorization: Bearer <token>` |

### 1.2 后端

| 项目 | 选择 | 说明 |
|------|------|------|
| 运行时 | Node.js 18+ | |
| 语言 | TypeScript | `tsconfig` 目标 ES2022，strict 模式 |
| Web 框架 | Fastify v4 | 含 `@fastify/cors`、`@fastify/static`、`@fastify/jwt` |
| ORM | Drizzle ORM | `drizzle-orm` + `better-sqlite3` driver |
| 数据库 | SQLite | 单文件 `data/app.db` |
| 认证 | JWT | `@fastify/jwt`，token 有效期从系统配置读取 |
| 邮件 | Nodemailer（Mock 模式） | 配置未填时 Mock，打印模拟邮件到控制台并返回预览数据给前端 |
| 构建 | `tsx` 直接运行 TS | 开发用 `tsx watch`，生产用 `tsc + node` |

### 1.3 项目结构

```
project/
├── src/
│   ├── db/
│   │   ├── schema.ts        // Drizzle 表定义
│   │   ├── migrate.ts       // 初始化/迁移脚本
│   │   └── index.ts         // db 实例导出
│   ├── routes/
│   │   ├── auth.ts          // 登录、注册、忘记密码、重置密码
│   │   ├── resources.ts     // 资源 CRUD
│   │   ├── categories.ts    // 类别 CRUD
│   │   ├── tags.ts          // 标签 CRUD
│   │   ├── users.ts         // 用户管理（管理员）
│   │   └── config.ts        // 系统配置 + 邮件配置读写与测试
│   ├── plugins/
│   │   ├── auth.ts          // JWT 验证插件
│   │   └── admin.ts         // 管理员权限插件
│   ├── services/
│   │   ├── mail.ts          // 邮件发送（含 Mock 逻辑）
│   │   └── token.ts         // reset token 生成/校验
│   ├── types.ts             // 共享 TypeScript 类型
│   └── app.ts               // Fastify 实例、插件注册、路由挂载
├── public/
│   ├── index.html           // 入口 HTML，加载 CDN 资源 + 按序引入所有 .jsx
│   ├── context/
│   │   └── AppContext.jsx   // AppContext + useReducer + AppProvider
│   ├── hooks/
│   │   ├── useApi.jsx       // fetch 封装，自动带 Authorization header
│   │   └── useRouter.jsx    // Hash 路由 hook（hashchange 监听）
│   ├── utils/
│   │   ├── theme.jsx        // applyTheme / 读写 localStorage rh_theme
│   │   └── helpers.jsx      // 通用工具函数（格式化时间、随机色等）
│   ├── components/
│   │   ├── Toast.jsx
│   │   ├── Modal.jsx
│   │   ├── ConfirmDialog.jsx
│   │   ├── EmailPreviewModal.jsx
│   │   ├── Skeleton.jsx
│   │   ├── EmptyState.jsx
│   │   └── PasswordStrength.jsx
│   ├── layout/
│   │   ├── AppLayout.jsx
│   │   ├── AdminLayout.jsx
│   │   ├── AuthLayout.jsx
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── pages/
│   │   ├── SetupPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   ├── ResetPasswordPage.jsx
│   │   ├── HomePage.jsx
│   │   └── AdminPage.jsx
│   ├── features/
│   │   ├── ResourceCard.jsx
│   │   ├── ResourceRow.jsx
│   │   ├── ResourceTimeline.jsx
│   │   ├── ResourceFormModal.jsx
│   │   ├── ProfileModal.jsx
│   │   └── ChangePasswordModal.jsx
│   └── admin/
│       ├── AdminCategories.jsx
│       ├── AdminTags.jsx
│       ├── AdminUsers.jsx
│       ├── AdminConfig.jsx
│       └── AdminEmail.jsx
├── data/
│   └── app.db               // SQLite 数据库文件（运行时生成）
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

> **前端加载约定**：`index.html` 先通过 `<script>` 标签加载 CDN（React、Babel Standalone、Tailwind、Lucide），再按 `utils → hooks → context → components → layout → features → admin → pages → app入口` 的依赖顺序，以 `<script type="text/babel" src="...">` 逐一引入各 `.jsx` 文件。所有组件挂载到 `window` 全局（如 `window.ResourceCard = ResourceCard`），供其他文件直接引用，无需 import/export。

---

## 二、数据模型

### 2.1 Drizzle Schema（`src/db/schema.ts`）

**users 表**
```ts
export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),           // uuid
  username:     text('username').notNull().unique(),
  displayName:  text('display_name').notNull(),
  email:        text('email').notNull().unique(),
  role:         text('role', { enum: ['admin','user'] }).notNull().default('user'),
  status:       text('status', { enum: ['active','disabled'] }).notNull().default('active'),
  passwordHash: text('password_hash').notNull(),   // bcrypt
  createdAt:    integer('created_at').notNull()    // unix timestamp
})
```

**resources 表**
```ts
export const resources = sqliteTable('resources', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  url:         text('url').notNull(),
  categoryId:  text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  visibility:  text('visibility', { enum: ['public','private'] }).notNull().default('public'),
  logoUrl:     text('logo_url'),
  description: text('description').default(''),
  enabled:     integer('enabled', { mode: 'boolean' }).notNull().default(true),
  ownerId:     text('owner_id').notNull().references(() => users.id), // 删除用户时转移给执行删除的管理员
  visitCount:  integer('visit_count').notNull().default(0),
  createdAt:   integer('created_at').notNull(),
  updatedAt:   integer('updated_at').notNull()
})
```

**resource_tags 表**（多对多）
```ts
export const resourceTags = sqliteTable('resource_tags', {
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  tag:        text('tag').notNull()
}, (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.tag] }) }))
```

**categories 表**
```ts
export const categories = sqliteTable('categories', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  color:     text('color').notNull().default('#0071E3'),
  createdAt: integer('created_at').notNull()
})
```

**favorites 表**
```ts
export const favorites = sqliteTable('favorites', {
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  createdAt:  integer('created_at').notNull()
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.resourceId] }) }))
```

**visit_history 表**
```ts
export const visitHistory = sqliteTable('visit_history', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  visitedAt:  integer('visited_at').notNull()
})
```

> **滚动存储规则**：每次写入 `POST /:id/visit` 后，检查该用户的历史记录总数，超过 200 条时删除最早的记录，始终保持每用户最多 200 条。

**system_config 表**（单行，id 固定为 `'default'`）
```ts
export const systemConfig = sqliteTable('system_config', {
  id:                   text('id').primaryKey().default('default'),
  siteTitle:            text('site_title').notNull().default('资源导航系统'),
  siteSubtitle:         text('site_subtitle').notNull().default('登录以访问企业资源导航'),
  logoUrl:              text('logo_url').default(''),
  tokenExpiry:          integer('token_expiry').notNull().default(60),
  resetTokenExpiry:     integer('reset_token_expiry').notNull().default(60),
  enableRegister:       integer('enable_register', { mode: 'boolean' }).notNull().default(true),
  restrictEmailDomain:  integer('restrict_email_domain', { mode: 'boolean' }).notNull().default(false),
  emailDomainWhitelist: text('email_domain_whitelist').default('')
})
```

**email_config 表**（单行，id 固定为 `'default'`）
```ts
export const emailConfig = sqliteTable('email_config', {
  id:            text('id').primaryKey().default('default'),
  smtpHost:      text('smtp_host').default(''),
  smtpPort:      integer('smtp_port').default(465),
  encryption:    text('encryption', { enum: ['ssl','tls','none'] }).default('ssl'),
  fromEmail:     text('from_email').default(''),
  fromName:      text('from_name').default('资源导航系统'),
  smtpUser:      text('smtp_user').default(''),
  smtpPassword:  text('smtp_password').default('')
})
```

**reset_tokens 表**
```ts
export const resetTokens = sqliteTable('reset_tokens', {
  token:     text('token').primaryKey(),
  email:     text('email').notNull(),
  expiresAt: integer('expires_at').notNull(),
  used:      integer('used', { mode: 'boolean' }).notNull().default(false)
})
```

**initialized 表**（单行标记系统是否完成初始化）
```ts
export const initialized = sqliteTable('initialized', {
  id:   text('id').primaryKey().default('default'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false)
})
```

---

## 三、API 设计

### 3.1 认证约定

- 公开接口：无需 token
- 登录用户接口：Header `Authorization: Bearer <jwt>`
- 管理员接口：同上，服务端额外校验 `role === 'admin'`
- JWT payload：`{ userId, role, iat, exp }`

### 3.2 接口列表

**Auth（`/api/auth`）**

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| POST | `/setup` | 公开，仅未初始化时可用 | 初始化系统，创建管理员账号 |
| GET  | `/init-status` | 公开 | 返回 `{ initialized: boolean }` |
| POST | `/login` | 公开 | 返回 JWT token |
| POST | `/register` | 公开，受 config 控制 | 注册（无需提交密码，系统自动生成随机初始密码），返回 Mock 邮件预览数据（含初始密码） |
| POST | `/forgot-password` | 公开 | 生成 reset token，返回 Mock 邮件预览数据 |
| POST | `/reset-password` | 公开 | 校验 token，更新密码 |
| GET  | `/me` | 登录用户 | 获取当前用户信息 |
| PUT  | `/me` | 登录用户 | 更新显示名/邮箱 |
| PUT  | `/me/password` | 登录用户 | 修改密码 |

**Resources（`/api/resources`）**

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/` | 公开/登录 | 列表，支持 `?category&tags&q&sort&view` 筛选；`visibility=private` 的资源仅 owner 本人可见，未登录或非 owner 的请求中不返回私有资源 |
| POST   | `/` | 登录用户 | 新增资源 |
| PUT    | `/:id` | 资源 owner 或管理员 | 编辑 |
| DELETE | `/:id` | 资源 owner 或管理员 | 删除 |
| POST   | `/:id/visit` | 登录用户 | 记录访问（同时 visitCount+1） |
| GET    | `/favorites` | 登录用户 | 收藏列表，返回全部（按收藏时间倒序） |
| POST   | `/:id/favorite` | 登录用户 | 收藏/取消收藏（toggle） |
| GET    | `/history` | 登录用户 | 最近访问记录，返回全部（最多保留 200 条，按访问时间倒序） |
| GET    | `/mine` | 登录用户 | 我创建的资源，返回全部（按创建时间倒序） |

**Categories（`/api/categories`）**

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/` | 公开 | 列表，含各类别资源数（按当前用户可见范围） |
| POST   | `/` | 登录用户 | 新增类别（仅用于资源表单内联新建，名称不可与已有重复） |
| PUT    | `/:id` | 管理员 | 编辑名称/颜色 |
| DELETE | `/:id` | 管理员 | 删除，关联资源 categoryId 置 null |

> **类别新建规则**：`POST /api/categories` 供所有登录用户在新增/编辑资源时内联创建尚不存在的类别（系统自动分配随机颜色）。类别的编辑、删除属于系统维护操作，仅管理员可在后台执行。

**Tags（`/api/tags`）**

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/` | 公开 | 所有标签及使用次数 |
| DELETE | `/:tag` | 管理员 | 删除标签，同时从 resource_tags 删除 |

**Users（`/api/users`）—— 管理员专用**

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET    | `/` | 管理员 | 用户列表 |
| POST   | `/` | 管理员 | 新增用户（直接设置密码，不走邮件） |
| PUT    | `/:id` | 管理员 | 编辑显示名/邮箱/角色/状态 |
| DELETE | `/:id` | 管理员 | 删除（不可删自身） |
| POST   | `/:id/reset-password` | 管理员 | 重置密码，返回 Mock 邮件预览数据 |

**Config（`/api/config`）**

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/system` | 公开（脱敏） | 前端读取 siteTitle、enableRegister 等展示用配置 |
| GET | `/system/full` | 管理员 | 完整配置 |
| PUT | `/system` | 管理员 | 更新系统配置 |
| GET | `/email` | 管理员 | 读取邮件配置（password 脱敏） |
| PUT | `/email` | 管理员 | 更新邮件配置 |
| POST | `/email/test` | 管理员 | 测试连接，返回 Mock 邮件预览数据 |

### 3.3 统一响应格式

```ts
// 成功
{ success: true, data: T }

// 失败
{ success: false, error: string, code?: string }
```

### 3.4 邮件 Mock 响应格式

所有触发邮件的接口，在 Mock 模式下额外返回：
```ts
{
  success: true,
  data: { ... },
  emailPreview: {
    to: string,
    subject: string,
    body: string    // 纯文本，含密码/链接等关键信息
  }
}
```
前端检测到 `emailPreview` 字段时，自动弹出 `EmailPreviewModal`。

---

## 四、模块与组件拆分

### 4.1 前端全局组件

| 组件 | 说明 |
|------|------|
| `Toast` | 右下角通知，3s 自动消失，success/error/info |
| `Modal` | 通用弹框容器 |
| `ConfirmDialog` | 危险操作二次确认 |
| `EmailPreviewModal` | 模拟邮件预览，展示 to/subject/body |
| `Skeleton` | 骨架屏，props: `rows`, `type: 'card'|'row'` |
| `EmptyState` | 空状态，props: `icon`, `text`, `action` |
| `PasswordStrength` | 密码强度指示条 |

### 4.2 布局组件

| 组件 | 说明 |
|------|------|
| `AppLayout` | Header + Sidebar + Content |
| `AdminLayout` | AdminHeader + AdminSidebar + Content |
| `AuthLayout` | 登录/注册等居中布局 |
| `Header` | Logo、搜索框、主题切换、用户菜单 |
| `Sidebar` | 类别导航、标签云、快速访问筛选（仅已登录，位于标签云下方） |

### 4.3 页面组件

| 组件 | 路由 |
|------|------|
| `SetupPage` | `#/setup` |
| `LoginPage` | `#/login` |
| `RegisterPage` | `#/register` |
| `ForgotPasswordPage` | `#/forgot-password` |
| `ResetPasswordPage` | `#/reset-password` |
| `HomePage` | `#/` |
| `AdminPage` | `#/admin`（含子视图切换） |

### 4.4 业务组件

| 组件 | 说明 |
|------|------|
| `ResourceCard` | 卡片视图单项，含收藏按钮 |
| `ResourceRow` | 列表视图单项 |
| `ResourceTimeline` | 时间轴视图，按月分组 |
| `ResourceFormModal` | 新增/编辑资源弹框 |
| `QuickAccessSection` | 已删除，功能改为 Sidebar 内的快速访问筛选项 |
| `ProfileModal` | 个人信息弹框 |
| `ChangePasswordModal` | 修改密码弹框 |

### 4.5 后台子视图

| 组件 | 说明 |
|------|------|
| `AdminCategories` | 类别管理 |
| `AdminTags` | 标签管理 |
| `AdminUsers` | 用户管理 |
| `AdminConfig` | 系统配置 |
| `AdminEmail` | 邮件服务配置 |

---

## 五、页面路由与流转

```
任意路由
  └─ GET /api/auth/init-status → initialized=false → #/setup
  
#/setup
  └─ POST /api/auth/setup → 成功 → #/login

#/ (HomePage)
  ├─ 未登录：GET /api/resources（仅公开资源）
  ├─ 已登录（默认）：GET /api/resources（公开 + 自己私有）
  ├─ 已登录（快速访问筛选激活时）：
  │    favorites → 使用已缓存的 /api/resources/favorites 数据展示
  │    history   → 使用已缓存的 /api/resources/history 数据展示
  │    mine      → 使用已缓存的 /api/resources/mine 数据展示
  └─ 管理员：用户菜单显示「后台管理」→ #/admin

#/login
  ├─ POST /api/auth/login → 成功 → 存 token → 来源页 or #/
  ├─ → #/register（enableRegister=true）
  └─ → #/forgot-password

#/register
  └─ POST /api/auth/register → 成功 → EmailPreviewModal → 3s → #/login

#/forgot-password
  └─ POST /api/auth/forgot-password → Toast + EmailPreviewModal

#/reset-password?token=xxx
  ├─ token 无效 → 错误提示 + 重发链接
  └─ POST /api/auth/reset-password → 成功 → #/login

#/admin（管理员 token 验证失败 → #/）
  └─ 子视图切换：categories / tags / users / config / email
```

---

## 六、前端状态管理

### 6.1 AppContext 结构

```ts
interface AppState {
  // 认证
  currentUser: User | null
  token: string | null          // 存 sessionStorage，不持久化

  // 数据缓存（从 API 获取）
  resources: Resource[]
  categories: Category[]
  tags: string[]
  config: PublicConfig | null
  // 快速访问数据缓存（已登录后后台预加载）
  favorites: Resource[]
  history: Resource[]
  mine: Resource[]

  // UI 状态
  theme: 'light' | 'dark' | 'system'

  // 筛选（首页）
  searchQuery: string
  selectedCategory: string | null
  selectedTags: string[]
  quickAccessFilter: 'favorites' | 'history' | 'mine' | null  // 快速访问筛选，与类别/标签互斥
  viewMode: 'card' | 'list' | 'timeline'
  sortBy: 'hot' | 'createdAt' | 'updatedAt'

  // Toast 队列
  toasts: Toast[]

  // Modal 状态
  activeModal: ModalType | null
  emailPreview: EmailPreview | null   // 有值时自动弹 EmailPreviewModal
}
```

> **注意**：token 存 `sessionStorage`（关闭标签页后清除），不存 localStorage。主题偏好存 `localStorage`（key: `rh_theme`），App 挂载时读取初始值。用户数据缓存在内存 state，刷新重新请求 API。

### 6.2 主要 Action 类型

```
AUTH:   LOGIN, LOGOUT
CACHE:  SET_RESOURCES, SET_CATEGORIES, SET_TAGS, SET_CONFIG
        SET_FAVORITES, SET_HISTORY, SET_MINE
        ADD/UPDATE/DELETE_RESOURCE, ADD/UPDATE/DELETE_CATEGORY
UI:     SET_THEME
FILTER: SET_SEARCH, SET_CATEGORY, TOGGLE_TAG, SET_QUICK_ACCESS_FILTER, SET_VIEW_MODE, SET_SORT
TOAST:  ADD_TOAST, REMOVE_TOAST
MODAL:  OPEN_MODAL, CLOSE_MODAL, SET_EMAIL_PREVIEW
```

### 6.3 初始化流程

```
App 挂载
  → GET /api/auth/init-status
    → false → navigate('#/setup')
    → true  → GET /api/config/system（公开配置）
              → 读 sessionStorage token
                → 有 → GET /api/auth/me（验证 token，获取用户信息）
                        → 成功 → 后台并行预加载快速访问数据：
                                  Promise.all([
                                    GET /api/resources/favorites,
                                    GET /api/resources/history,
                                    GET /api/resources/mine
                                  ]) → dispatch SET_FAVORITES / SET_HISTORY / SET_MINE
                → 无 → currentUser = null
              → GET /api/categories
              → GET /api/tags
              → Router 解析 hash，渲染页面
```

---

## 七、关键交互流程

### 7.1 收藏资源

```
点击心形图标
  → 未登录 → Toast "请登录后操作"
  → 已登录 → POST /api/resources/:id/favorite
             → 成功 → dispatch 更新本地 state（即时反馈）
             → 心形变色 + 缩放动画（CSS transition）
```

### 7.2 新增资源

```
点「+ 新增资源」→ 打开 ResourceFormModal
  → 类别下拉选「+ 新增类别」
     → 输入名称 → POST /api/categories（随机色）
     → 成功 → dispatch ADD_CATEGORY，下拉自动选中
  → 点「保存」
     → POST /api/resources（含 tags 数组）
     → 成功 → dispatch ADD_RESOURCE → 关闭 Modal + Toast
```

### 7.3 忘记密码完整流程

```
#/forgot-password 提交邮箱
  → POST /api/auth/forgot-password
  → 前端始终显示 Toast "若邮箱已注册，链接已发送"（防枚举）
  → 检测到 response.emailPreview → 弹 EmailPreviewModal
     正文含：#/reset-password?token=xxx（N 分钟内有效）

#/reset-password?token=xxx
  → 提交新密码 → POST /api/auth/reset-password { token, newPassword }
  → 成功 → navigate('#/login') + Toast "密码已重置，请登录"
  → 失败 → 显示错误 + 重发链接
```

### 7.4 时间轴视图渲染

```
切换视图为 timeline
  → sortBy 自动设为 'createdAt'，排序控件置灰
  → 对当前资源列表按 createdAt 降序排列
  → 按月分组：{ '2025-03': [...], '2025-02': [...] }
  → 渲染：月份标题 + 左侧竖线圆点 + 紧凑行（Logo + 名称 + 类别标签 + URL）
```

### 7.5 快速访问筛选

```
点击 Sidebar 快速访问项（我的收藏 / 最近访问 / 我创建的）
  → dispatch SET_QUICK_ACCESS_FILTER('favorites'|'history'|'mine')
  → 同时清空 selectedCategory / selectedTags（与类别/标签筛选互斥）
  → 主内容区直接从 state.favorites|history|mine 渲染，无需重新请求 API
  → 选中项高亮；再次点击同一项 → SET_QUICK_ACCESS_FILTER(null) → 恢复全部资源列表
```

---

## 八、主题实现方案

```js
// Tailwind dark mode 配置
tailwind.config = { darkMode: 'class' }

// 应用主题（存 localStorage，key: rh_theme）
function applyTheme(theme) {
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
  localStorage.setItem('rh_theme', theme)
}

// App 挂载时读取初始主题
const savedTheme = localStorage.getItem('rh_theme') || 'system'
applyTheme(savedTheme)
```

CSS 变量在 `:root` 和 `.dark` 下分别定义，组件统一使用 CSS 变量。

---

## 九、Mock 数据（初始化时写入）

系统初始化完成后，`migrate.ts` 写入演示数据：

**分类（5个）：** 开发工具、设计资源、文档知识、效率工具、AI 工具

**资源（10条）：**
- GitHub（开发工具，公开）
- Figma（设计资源，公开）
- MDN Web Docs（文档知识，公开）
- Notion（效率工具，公开）
- ChatGPT（AI 工具，公开）
- 另5条以初始管理员为 owner，含 1 条私有资源示例

**标签（8个）：** `前端` `后端` `设计` `文档` `API` `效率` `AI` `开源`

---

## 十、部署与启动

```bash
# 安装依赖
npm install

# 开发模式（tsx watch，自动重启）
npm run dev

# 生产构建
npm run build   # tsc 输出到 dist/
npm start       # node dist/app.js

# 首次启动自动执行
#   1. migrate.ts：创建 SQLite 表 + 写入 Mock 数据
#   2. Fastify serve public/index.html（静态文件）
#   3. 监听 PORT（默认 3000）
```

**关键 package.json scripts：**
```json
{
  "dev":   "tsx watch src/app.ts",
  "build": "tsc",
  "start": "node dist/app.js"
}
```

