## ResourceHub 资源导航系统

ResourceHub 是一个通用的资源管理产品，用来集中整理、访问和维护各类站点、工具、知识库和外部链接。系统支持用户登录、资源收藏与访问历史记录，并提供后台管理界面维护类别、标签、用户和系统配置。

### 功能简介

- **资源管理**：统一整理和维护常用链接，支持按类别和标签浏览。
- **搜索与筛选**：按名称、描述、URL、标签搜索，联动类别、标签和快速访问筛选。
- **多种视图**：卡片视图、列表视图、时间轴视图，满足不同浏览习惯。
- **收藏与访问历史**：支持“我的收藏”“最近访问”“我创建的”三类视图，访问历史自动滚动保留最近 200 条。
- **账号与权限**：支持初始化管理员、注册（可配置开关）、登录、忘记密码、重置密码和修改密码，区分普通用户与管理员。
- **后台管理**：管理员可维护类别、标签、用户、系统配置和邮件配置。
- **Mock 邮件模式**：在未配置 SMTP 时，不真实发送邮件，而是在响应中返回邮件预览供前端展示。

### 技术栈概览

- **前端**：React 18（CDN UMD）+ Babel Standalone + Tailwind CSS（CDN），Hash Router，无打包工具。
- **后端**：Node.js 18+、TypeScript、Fastify v4、`@fastify/jwt`、`@fastify/cors`、`@fastify/static`。
- **数据库**：SQLite（`better-sqlite3` 驱动）+ Drizzle ORM，单文件数据库。
- **邮件**：Nodemailer，支持真实 SMTP 或 Mock 邮件预览模式。

详细技术说明见 [docs/tech-stack.md](docs/tech-stack.md)。

### 本地开发

1. 安装依赖：

```bash
npm install
```

2. 启动开发服务（自动监视 TypeScript 源码并重启后端）：

```bash
npm run dev
```

3. 在浏览器访问：

```text
http://localhost:3000
```

首次启动时，系统会检测到尚未初始化并跳转到 `#/setup` 向导页面，请按页面提示创建首个管理员账号。初始化完成后即可使用管理员账号登录并访问首页与后台管理。

### 生产构建与部署

1. 构建后端：

```bash
npm run build
```

2. 启动生产服务：

```bash
npm start
```

服务启动后会同时提供：

- 后端 API（`/api/...`）。
- 前端静态页面（`public/` 目录，由 Fastify 通过 `@fastify/static` 提供）。

常用环境变量：

- `PORT`：服务端口，默认为 `3000`。
- `JWT_SECRET`：JWT 签名密钥，生产环境必须设置为安全随机值。
- `DB_PATH`：SQLite 数据库文件路径，默认 `data/app.db`。
- `NODE_ENV`：运行环境，通常为 `development` 或 `production`。

### 文档导航

- **需求文档**：[docs/requirements.md](docs/requirements.md)
- **技术选型**：[docs/tech-stack.md](docs/tech-stack.md)
- **数据库文档**：[docs/database.md](docs/database.md)
- **后台设计**：[docs/backend-design.md](docs/backend-design.md)
- **前台设计**：[docs/frontend-design.md](docs/frontend-design.md)

建议在开发或重构功能前，先阅读需求文档与技术选型文档，再根据需要查阅后台/前台设计与数据库文档。 
