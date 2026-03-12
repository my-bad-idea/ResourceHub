## 资源导航系统技术选型（Tech Stack）

### 1. 总览

| 层级 | 选型 | 说明 |
|------|------|------|
| 前端 | React 18（CDN UMD）+ Babel Standalone + Tailwind CSS（CDN） | 无打包工具，浏览器内转译 JSX，使用 Hash Router |
| 后端 | Node.js 18+ + TypeScript + Fastify v4 | 提供 RESTful API、JWT 认证和静态文件服务 |
| 数据库 | SQLite + Drizzle ORM（better-sqlite3 驱动） | 单文件数据库，轻量易部署 |
| 邮件服务 | Nodemailer | 支持真实 SMTP 或 Mock 邮件预览 |
| 构建与运行 | tsx（开发）+ tsc（构建） | `npm run dev` / `npm run build` / `npm start` |

### 2. 前端技术栈

- **React 18 UMD + Babel Standalone**
  - 通过 CDN 引入 React、ReactDOM UMD 版本和 Babel Standalone。
  - `public/index.html` 使用 `<script type="text/babel" src="...">` 引入各个 `.jsx` 文件。
  - JSX 在浏览器端由 Babel 即时编译，无需 webpack / vite 等打包工具。
- **文件加载与模块约定**
  - 通过 `<script>` 标签按依赖顺序手工维护加载：
    - `utils → hooks → context → components → layout → features → admin → pages → app 入口`。
  - 每个组件文件将组件挂载到 `window` 全局（如 `window.ResourceCard = ResourceCard`），供其他脚本直接使用，而非 ES Module import/export。
- **样式与主题**
  - 使用 Tailwind CSS CDN Play 版本，`tailwind.config` 配置 `darkMode: 'class'`。
  - 在 `:root` 和 `.dark` 下定义一组 CSS 变量（如 `--bg-primary`、`--text-primary`、`--brand` 等），组件通过 CSS 变量而非硬编码色值控制主题。
  - 前端通过一个 `applyTheme` 辅助方法，在页面加载时根据 `localStorage` 中的 `rh_theme` 值（`light` / `dark` / `system`）切换 `document.documentElement.classList`。
- **路由与状态管理**
  - 自实现 Hash 路由，基于 `window.location.hash` 和 `hashchange` 事件，支持 `#/`、`#/setup`、`#/login`、`#/register`、`#/forgot-password`、`#/reset-password`、`#/admin` 等路由。
  - 使用 React Context + `useReducer` 管理全局状态（当前用户、资源缓存、配置、筛选条件、主题、Toast、Modal 等）。
  - 使用封装好的 `useApi` Hook 进行 API 请求，自动附带 `Authorization: Bearer <token>` 头（如有 token）。

### 3. 后端技术栈

- **运行环境**
  - Node.js 18+，使用 TypeScript 开发，`tsconfig` 采用严格检查（`strict` 模式）。
  - Web 框架选用 Fastify v4，配套使用：
    - `@fastify/cors`：跨域配置。
    - `@fastify/jwt`：JWT 认证。
    - `@fastify/static`：对外提供 `public/` 目录下的静态文件（前端资源）。
- **项目结构（后端）**
  - `src/app.ts`：创建并配置 Fastify 实例，注册插件和路由。
  - `src/db/schema.ts`：集中定义所有数据库表的 Drizzle Schema。
  - `src/db/index.ts`：创建并导出 Drizzle `db` 实例。
  - `src/db/migrate.ts`：数据库初始化和示例数据写入逻辑。
  - `src/routes/*.ts`：分模块定义 `auth`、`resources`、`categories`、`tags`、`users`、`config`、`email` 等路由。
  - `src/plugins/auth.ts` / `src/plugins/admin.ts`：封装认证和管理员校验钩子。
  - `src/services/*.ts`：如邮件发送、重置 token 生成与校验等独立服务。
- **认证与授权**
  - 使用 `@fastify/jwt` 处理 token 的签发和验证。
  - JWT payload 结构为 `{ userId, role }`，有效期由 `system_config.tokenExpiry`（分钟）控制。
  - 提供两个关键插件：
    - `authenticate`：校验 Bearer token，将用户信息挂到 `request.user`，并检查账号状态。
    - `requireAdmin`：基于 `authenticate` 额外校验 `role === 'admin'`。

### 4. 数据库与 ORM

- **SQLite + Drizzle ORM**
  - 使用 SQLite 单文件数据库（默认路径为 `data/app.db`），通过 `better-sqlite3` 驱动访问。
  - 使用 Drizzle ORM 在 TypeScript 中定义 Schema 与类型，避免手写 SQL 带来的注入风险。
  - 所有表（用户、资源、类别、标签关联、收藏、访问历史、系统配置、邮件配置、重置 token、初始化标记等）都集中定义在 `src/db/schema.ts`。
- **迁移与初始化**
  - 首次启动时执行 `migrate.ts`：
    - 创建所有数据表。
    - 写入系统配置和邮件配置的默认值。
    - 写入演示类别、资源和标签等 Mock 数据，便于开箱即用。
  - 生产环境推荐使用相同脚本或对应 SQL 语句初始化数据库，再进行定制化调整。

### 5. 邮件服务与 Mock 模式

- 使用 Nodemailer 发送邮件，支持配置 SMTP 主机、端口、加密方式、认证信息等。
- 当邮件配置表 `email_config` 中的 `smtpHost` 为空字符串时，系统进入 **Mock 邮件模式**：
  - 不会真正连接 SMTP 服务器。
  - 所有发送邮件的接口会在响应中附带 `emailPreview` 字段，包含收件人、主题和正文内容。
  - 前端检测到该字段后会弹出邮件预览弹窗，方便开发和联调。
- 配置好 SMTP 后（`smtpHost` 非空），系统将发送真实邮件，响应中不再返回邮件预览内容。

### 6. 构建与运行

- **开发模式**
  - 安装依赖：`npm install`
  - 启动开发服务：`npm run dev`
    - 底层命令：`tsx watch src/app.ts`
    - 自动重启后端进程，前端由 Fastify 静态资源服务提供。
- **生产构建与启动**
  - 构建：`npm run build`
    - 底层命令：`tsc`，将 TypeScript 编译到 `dist/`。
  - 启动：`npm start`
    - 底层命令：`node dist/app.js`
  - 前后端由同一 Node 进程承载，后端 API 和前端静态文件共用一个服务入口。
- **关键环境变量**
  - `PORT`：服务监听端口，默认 `3000`。
  - `JWT_SECRET`：JWT 签名密钥，开发默认值为 `dev-secret-change-me`，生产环境必须覆盖。
  - `DB_PATH`：SQLite 数据库文件路径，默认 `data/app.db`。
  - `NODE_ENV`：运行环境标识，`development` / `production` 等，影响日志和错误输出方式。

### 7. 选型边界与后续扩展方向

- 前端架构特性：
  - 采用 CDN + 浏览器内转译的方案，部署非常简单，适合快速上线的通用资源管理场景和中小规模项目。
  - 代价是初次加载需要下载 Babel 和未打包的 JSX 脚本，不适合作为大规模公网站点的长期方案。
- 后端与数据库特性：
  - 单机 SQLite 简化了部署和运维，适合单实例的资源管理应用。
  - 若未来需要支撑更高并发或多实例部署，可以考虑：
    - 将 Drizzle 切换到其他数据库驱动（如 PostgreSQL）。
    - 将静态资源迁移到专用静态服务或 CDN，后端仅提供 API。
