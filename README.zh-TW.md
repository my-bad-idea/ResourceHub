## ResourceHub 資源導航系統

[简体中文](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md) | [日本語](README.ja.md)

ResourceHub 是一個通用的資源管理產品，用來集中整理、存取與維護各類網站、工具、知識庫與外部連結。系統支援使用者登入、資源收藏與存取歷史，並提供後台管理介面維護分類、標籤、使用者與系統設定。

### 功能簡介

- **資源管理**：統一整理與維護常用連結，支援依分類與標籤瀏覽。
- **搜尋與篩選**：可依名稱、描述、URL、標籤搜尋，並與分類、標籤及快速存取篩選聯動。
- **多種檢視模式**：卡片檢視、列表檢視、時間軸檢視，滿足不同瀏覽習慣。
- **收藏與存取歷史**：支援「我的收藏」「最近存取」「我建立的」三種檢視，存取歷史會自動滾動保留最近 200 筆。
- **帳號與權限**：支援初始化管理員、註冊（可設定開關）、登入、忘記密碼、重設密碼與修改密碼，區分一般使用者與管理員。
- **後台管理**：管理員可維護分類、標籤、使用者、系統設定與郵件設定。
- **Mock 郵件模式**：在未設定 SMTP 時，不實際寄出郵件，而是在回應中回傳郵件預覽供前端顯示。

### 技術棧概覽

- **前端**：React 18（CDN UMD）+ Babel Standalone + Tailwind CSS（CDN），Hash Router，無打包工具。
- **後端**：Node.js 18+、TypeScript、Fastify v4、`@fastify/jwt`、`@fastify/cors`、`@fastify/static`。
- **資料庫**：SQLite（`better-sqlite3` 驅動）+ Drizzle ORM，單一檔案資料庫。
- **郵件**：Nodemailer，支援真實 SMTP 或 Mock 郵件預覽模式。

詳細技術說明請參見 `[docs/tech-stack.md](docs/tech-stack.md)`。

### 使用 npm 安裝與執行

```bash
npm install -g @zhang_libo/resource-hub
npx @zhang_libo/resource-hub
npm uninstall -g @zhang_libo/resource-hub
```

預設訪問位址為 `http://localhost:3000`，首次啟動會導向 `#/setup` 以初始化管理員。執行參數可透過環境變數設定（如 `PORT`、`DB_PATH`、`JWT_SECRET`、`NODE_ENV`），詳見下方「安裝與執行（原始碼方式）」中的說明。

### 安裝與執行（原始碼方式）

- **本機開發**

```bash
npm install
npm run dev
```

預設訪問位址為 `http://localhost:3000`，首次啟動會導向 `#/setup` 以初始化管理員。

- **正式環境模式**

```bash
npm install
npm run build
npm start
```

僅支援透過環境變數設定執行參數（不支援 `npm start --PORT=4000`），例如在 PowerShell 中：

```bash
$env:PORT = 4000
$env:DB_PATH = "D:\data\resourcehub.db"
$env:JWT_SECRET = "please-change-me-in-production"
$env:NODE_ENV = "production"
npm start
```

關鍵環境變數：

- `PORT`（預設 `3000`）
- `DB_PATH`（預設 `data/resource-hub.db`）
- `JWT_SECRET`（必須為安全且隨機的值）
- `NODE_ENV`（`development` / `production`）

### 文件導覽

- **需求文件**：`[docs/requirements.md](docs/requirements.md)`
- **技術選型**：`[docs/tech-stack.md](docs/tech-stack.md)`
- **資料庫文件**：`[docs/database.md](docs/database.md)`
- **後端設計**：`[docs/backend-design.md](docs/backend-design.md)`
- **前端設計**：`[docs/frontend-design.md](docs/frontend-design.md)`

建議在開發或重構功能前，先閱讀需求文件與技術選型文件，再視需要查閱後端 / 前端設計與資料庫相關文件。

