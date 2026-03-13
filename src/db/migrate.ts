import { sqlite, db } from './index.js'
import { categories, resources, resourceTags, users, initialized } from './schema.js'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

export function runMigrations(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS initialized (
      id TEXT PRIMARY KEY DEFAULT 'default',
      done INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#0071E3',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      logo_url TEXT DEFAULT '',
      description TEXT DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      owner_id TEXT NOT NULL REFERENCES users(id),
      visit_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resource_tags (
      resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      PRIMARY KEY (resource_id, tag)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS visit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      visited_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visit_hourly (
      visit_hour INTEGER NOT NULL,
      visit_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (visit_hour)
    );

    CREATE TABLE IF NOT EXISTS system_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      site_title TEXT NOT NULL DEFAULT '资源导航系统',
      site_subtitle TEXT NOT NULL DEFAULT '统一管理与访问你的资源',
      logo_url TEXT DEFAULT '',
      token_expiry INTEGER NOT NULL DEFAULT 60,
      reset_token_expiry INTEGER NOT NULL DEFAULT 60,
      enable_register INTEGER NOT NULL DEFAULT 1,
      restrict_email_domain INTEGER NOT NULL DEFAULT 0,
      email_domain_whitelist TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS email_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      smtp_host TEXT DEFAULT '',
      smtp_port INTEGER DEFAULT 465,
      encryption TEXT DEFAULT 'ssl',
      from_email TEXT DEFAULT '',
      from_name TEXT DEFAULT '资源导航系统',
      smtp_user TEXT DEFAULT '',
      smtp_password TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS reset_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rsa_keys (
      id TEXT PRIMARY KEY DEFAULT 'current',
      public_key TEXT NOT NULL,
      private_key TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    INSERT OR IGNORE INTO initialized (id, done) VALUES ('default', 0);
    INSERT OR IGNORE INTO system_config (id) VALUES ('default');
    INSERT OR IGNORE INTO email_config (id) VALUES ('default');
  `)

  const oldVisitHourly = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='resource_visit_hourly'").get() as { name?: string } | undefined
  if (oldVisitHourly?.name) {
    const newCountRow = sqlite.prepare('SELECT COUNT(*) as count FROM visit_hourly').get() as { count: number }
    if ((newCountRow?.count || 0) === 0) {
      sqlite.exec(`
        INSERT INTO visit_hourly (visit_hour, visit_count)
        SELECT visit_hour, SUM(visit_count) AS visit_count
        FROM resource_visit_hourly
        GROUP BY visit_hour
      `)
    }
    sqlite.exec('DROP TABLE IF EXISTS resource_visit_hourly;')
  }
}

export function seedMockData(adminId: string): void {
  const now = Math.floor(Date.now() / 1000)

  // Insert 5 categories with fixed IDs
  db.insert(categories).values([
    { id: 'cat-001', name: '开发工具', color: '#0071E3', createdAt: now },
    { id: 'cat-002', name: '设计资源', color: '#AF52DE', createdAt: now },
    { id: 'cat-003', name: '文档知识', color: '#34C759', createdAt: now },
    { id: 'cat-004', name: '效率工具', color: '#FF9500', createdAt: now },
    { id: 'cat-005', name: 'AI 工具',  color: '#FF3B30', createdAt: now },
  ]).run()

  // Insert 10 resources
  const resourceData = [
    { name: 'GitHub',            url: 'https://github.com',                categoryId: 'cat-001', visibility: 'public'  as const, visitCount: 100, tags: ['前端', '后端', '开源'] },
    { name: 'Figma',             url: 'https://figma.com',                 categoryId: 'cat-002', visibility: 'public'  as const, visitCount: 80,  tags: ['设计'] },
    { name: 'MDN Web Docs',      url: 'https://developer.mozilla.org',     categoryId: 'cat-003', visibility: 'public'  as const, visitCount: 90,  tags: ['前端', '文档'] },
    { name: 'Notion',            url: 'https://notion.so',                 categoryId: 'cat-004', visibility: 'public'  as const, visitCount: 70,  tags: ['效率', '文档'] },
    { name: 'ChatGPT',           url: 'https://chat.openai.com',           categoryId: 'cat-005', visibility: 'public'  as const, visitCount: 120, tags: ['AI'] },
    { name: 'VS Code',           url: 'https://code.visualstudio.com',     categoryId: 'cat-001', visibility: 'public'  as const, visitCount: 60,  tags: ['前端', '后端', '开源'] },
    { name: 'Dribbble',          url: 'https://dribbble.com',              categoryId: 'cat-002', visibility: 'public'  as const, visitCount: 40,  tags: ['设计'] },
    { name: 'Postman',           url: 'https://postman.com',               categoryId: 'cat-001', visibility: 'public'  as const, visitCount: 50,  tags: ['后端', 'API'] },
    { name: 'Obsidian',          url: 'https://obsidian.md',               categoryId: 'cat-004', visibility: 'public'  as const, visitCount: 30,  tags: ['效率'] },
    { name: '私有资源（示例）',     url: 'https://private.example.com',      categoryId: 'cat-003', visibility: 'private' as const, visitCount: 5,   tags: ['文档'] },
  ]

  for (const r of resourceData) {
    const id = uuidv4()
    db.insert(resources).values({
      id,
      name: r.name,
      url: r.url,
      categoryId: r.categoryId,
      visibility: r.visibility,
      logoUrl: '',
      description: '',
      enabled: true,
      ownerId: adminId,
      visitCount: r.visitCount,
      createdAt: now,
      updatedAt: now,
    }).run()

    for (const tag of r.tags) {
      db.insert(resourceTags).values({ resourceId: id, tag }).run()
    }
  }
}

export async function seedDemoAdminAndData(): Promise<void> {
  const anyUser = db.select().from(users).limit(1).all()
  if (anyUser.length > 0) return

  const initRow = db.select().from(initialized).where(eq(initialized.id, 'default')).get()
  if (initRow?.done) return

  const now = Math.floor(Date.now() / 1000)
  const adminId = uuidv4()
  const passwordHash = await bcrypt.hash('Abc12345', 10)

  db.insert(users).values({
    id: adminId,
    username: 'admin',
    displayName: 'admin',
    email: 'zhanglibo610@gmail.com',
    role: 'admin',
    status: 'active',
    passwordHash,
    createdAt: now,
  }).run()

  seedMockData(adminId)
}
