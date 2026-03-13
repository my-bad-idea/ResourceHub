## ResourceHub Resource Navigation System

[简体中文](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md) | [日本語](README.ja.md)

ResourceHub is a general-purpose resource management product used to centrally organize, access, and maintain various sites, tools, knowledge bases, and external links. The system supports user login, favorites, visit history, and provides an admin console to manage categories, tags, users, and system configuration.

### Features

- **Resource Management**: Centrally organize and maintain frequently used links, and browse them by category and tag.
- **Search & Filtering**: Search by name, description, URL, and tags, with linked filters for categories, tags, and quick-access shortcuts.
- **Multiple Views**: Card view, list view, and timeline view to match different browsing preferences.
- **Favorites & History**: Supports "My Favorites", "Recently Visited", and "Created by Me" views. Visit history automatically keeps only the latest 200 entries.
- **Accounts & Permissions**: Supports initial admin setup, registration (configurable), login, forgot password, reset password, and change password. Differentiates between regular users and admins.
- **Admin Console**: Admins can manage categories, tags, users, system settings, and email configuration.
- **Mock Email Mode**: When SMTP is not configured, emails are not actually sent. Instead, the API response includes an email preview for the frontend to display.

### Tech Stack Overview

- **Frontend**: React 18 (CDN UMD) + Babel Standalone + Tailwind CSS (CDN), hash router, no bundler.
- **Backend**: Node.js 18+, TypeScript, Fastify v4, `@fastify/jwt`, `@fastify/cors`, `@fastify/static`.
- **Database**: SQLite (via `better-sqlite3`) + Drizzle ORM, single-file database.
- **Email**: Nodemailer with support for real SMTP or mock email preview mode.

For detailed technical documentation, see `[docs/tech-stack.md](docs/tech-stack.md)`.

### Install & Run via npm

```bash
npm install -g @zhang_libo/resource-hub
npx @zhang_libo/resource-hub
npm uninstall -g @zhang_libo/resource-hub
```

Default URL: `http://localhost:3000`. On first run, the app will redirect to `#/setup` to initialize the admin user. Runtime parameters can be set via environment variables (e.g. `PORT`, `DB_PATH`, `JWT_SECRET`, `NODE_ENV`); see "Install & Run from Source" below for details.

### Install & Run from Source

- **Local Development**

```bash
npm install
npm run dev
```

Default URL: `http://localhost:3000`. On first run, the app will redirect to `#/setup` to initialize the admin user.

- **Production Mode**

```bash
npm install
npm run build
npm start
```

Runtime parameters are configured via environment variables only (running `npm start --PORT=4000` is not supported). On PowerShell, for example:

```bash
$env:PORT = 4000
$env:DB_PATH = "D:\data\resourcehub.db"
$env:JWT_SECRET = "please-change-me-in-production"
$env:NODE_ENV = "production"
npm start
```

Key environment variables:

- `PORT` (default `3000`)
- `DB_PATH` (default `data/resource-hub.db`)
- `JWT_SECRET` (must be a secure random value)
- `NODE_ENV` (`development` / `production`)

### Documentation Navigation

- **Requirements**: `[docs/requirements.md](docs/requirements.md)`
- **Tech Stack**: `[docs/tech-stack.md](docs/tech-stack.md)`
- **Database**: `[docs/database.md](docs/database.md)`
- **Backend Design**: `[docs/backend-design.md](docs/backend-design.md)`
- **Frontend Design**: `[docs/frontend-design.md](docs/frontend-design.md)`

We recommend reading the requirements and tech stack documents first before developing or refactoring features, and then consulting the backend/frontend design and database docs as needed.

