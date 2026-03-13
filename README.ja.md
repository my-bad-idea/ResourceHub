## ResourceHub リソースナビゲーションシステム

[简体中文](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md) | [日本語](README.ja.md)

ResourceHub は、さまざまなサイト・ツール・ナレッジベース・外部リンクを一元的に整理・閲覧・管理するための汎用リソース管理プロダクトです。ユーザーのログイン、リソースのお気に入り、閲覧履歴をサポートし、管理画面からカテゴリ・タグ・ユーザー・システム設定をメンテナンスできます。

### 機能概要

- **リソース管理**：よく使うリンクを一元管理し、カテゴリやタグで閲覧可能。
- **検索とフィルタ**：名前・説明・URL・タグで検索でき、カテゴリ・タグ・クイックフィルタと連動。
- **複数ビュー**：カードビュー、リストビュー、タイムラインビューを提供し、異なる閲覧スタイルに対応。
- **お気に入りと履歴**：「お気に入り」「最近の閲覧」「自分が作成した」の 3 つのビューを提供し、閲覧履歴は最新 200 件まで自動ローテーションで保持。
- **アカウントと権限**：初回管理者の初期化、ユーザー登録（有効 / 無効を設定可能）、ログイン、パスワードリセット、パスワード変更をサポートし、一般ユーザーと管理者を区別。
- **管理コンソール**：管理者はカテゴリ・タグ・ユーザー・システム設定・メール設定を管理可能。
- **モックメールモード**：SMTP が未設定の場合はメールを実送信せず、レスポンスにメールプレビューを含め、フロントエンドで表示できます。

### 技術スタック概要

- **フロントエンド**：React 18（CDN UMD）+ Babel Standalone + Tailwind CSS（CDN）、ハッシュルーター、ビルドツールなし。
- **バックエンド**：Node.js 18+、TypeScript、Fastify v4、`@fastify/jwt`、`@fastify/cors`、`@fastify/static`。
- **データベース**：SQLite（`better-sqlite3` ドライバ）+ Drizzle ORM、単一ファイルデータベース。
- **メール**：Nodemailer。実際の SMTP とモックメールプレビューモードの両方に対応。

詳細な技術情報は `[docs/tech-stack.md](docs/tech-stack.md)` を参照してください。

### npm でのインストールと起動

```bash
npm i resource-hub
npx resource-hub
```

デフォルトのアクセス URL は `http://localhost:3000` です。初回起動時は `#/setup` にリダイレクトされ、管理者アカウントの初期化が行われます。実行時パラメータは環境変数で指定できます（`PORT`、`DB_PATH`、`JWT_SECRET`、`NODE_ENV` など）。詳細は下記「インストールと起動（ソースコードから）」を参照してください。

### インストールと起動（ソースコードから）

- **ローカル開発**

```bash
npm install
npm run dev
```

デフォルトのアクセス URL は `http://localhost:3000` です。初回起動時は `#/setup` にリダイレクトされ、管理者アカウントの初期化が行われます。

- **本番モード**

```bash
npm install
npm run build
npm start
```

実行時パラメータは環境変数でのみ指定します（`npm start --PORT=4000` のような指定はサポートされません）。PowerShell の例：

```bash
$env:PORT = 4000
$env:DB_PATH = "D:\data\resourcehub.db"
$env:JWT_SECRET = "please-change-me-in-production"
$env:NODE_ENV = "production"
npm start
```

主要な環境変数：

- `PORT`（デフォルト `3000`）
- `DB_PATH`（デフォルト `data/resource-hub.db`）
- `JWT_SECRET`（十分に安全なランダム値である必要があります）
- `NODE_ENV`（`development` / `production`）

### ドキュメントナビゲーション

- **要件ドキュメント**：`[docs/requirements.md](docs/requirements.md)`
- **技術スタック**：`[docs/tech-stack.md](docs/tech-stack.md)`
- **データベースドキュメント**：`[docs/database.md](docs/database.md)`
- **バックエンド設計**：`[docs/backend-design.md](docs/backend-design.md)`
- **フロントエンド設計**：`[docs/frontend-design.md](docs/frontend-design.md)`

機能の開発やリファクタリングの前に、まず要件ドキュメントと技術スタックドキュメントを読み、その後必要に応じてバックエンド / フロントエンド設計およびデータベース関連ドキュメントを参照することを推奨します。

