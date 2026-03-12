## ResourceHub 资源导航系统

[简体中文](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md) | [日本語](README.ja.md)

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

### 安装与运行（源码方式）

- **本地开发**

```bash
npm install
npm run dev
```

默认访问 `http://localhost:3000`，首次会跳转到 `#/setup` 初始化管理员。

- **生产模式**

```bash
npm install
npm run build
npm start
```

仅支持通过环境变量配置运行参数（不支持 `npm start --PORT=4000`），例如在 PowerShell 中：

```bash
$env:PORT = 4000
$env:DB_PATH = "D:\data\resourcehub.db"
$env:JWT_SECRET = "please-change-me-in-production"
$env:NODE_ENV = "production"
npm start
```

关键环境变量：

- `PORT`（默认 `3000`）
- `DB_PATH`（默认 `data/resource-hub.db`）
- `JWT_SECRET`（必须为安全随机值）
- `NODE_ENV`（`development` / `production`）

### 使用 npm 管理器安装与运行（预留）

未来如果发布为 npm 包，预计可通过：

```bash
npm install resourcehub
```

进行安装，并提供对应的 CLI / Node API 启动方式。具体用法会在 npm 包正式发布后补充到本文档。

### 文档导航

- **需求文档**：[docs/requirements.md](docs/requirements.md)
- **技术选型**：[docs/tech-stack.md](docs/tech-stack.md)
- **数据库文档**：[docs/database.md](docs/database.md)
- **后台设计**：[docs/backend-design.md](docs/backend-design.md)
- **前台设计**：[docs/frontend-design.md](docs/frontend-design.md)

建议在开发或重构功能前，先阅读需求文档与技术选型文档，再根据需要查阅后台/前台设计与数据库文档。 
