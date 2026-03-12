import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  username:     text('username').notNull().unique(),
  displayName:  text('display_name').notNull(),
  email:        text('email').notNull().unique(),
  role:         text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  status:       text('status', { enum: ['active', 'disabled'] }).notNull().default('active'),
  passwordHash: text('password_hash').notNull(),
  createdAt:    integer('created_at').notNull()
})

export const categories = sqliteTable('categories', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull().unique(),
  color:     text('color').notNull().default('#0071E3'),
  createdAt: integer('created_at').notNull()
})

export const resources = sqliteTable('resources', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  url:         text('url').notNull(),
  categoryId:  text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  visibility:  text('visibility', { enum: ['public', 'private'] }).notNull().default('public'),
  logoUrl:     text('logo_url').default(''),
  description: text('description').default(''),
  enabled:     integer('enabled', { mode: 'boolean' }).notNull().default(true),
  ownerId:     text('owner_id').notNull().references(() => users.id),
  visitCount:  integer('visit_count').notNull().default(0),
  createdAt:   integer('created_at').notNull(),
  updatedAt:   integer('updated_at').notNull()
})

export const resourceTags = sqliteTable('resource_tags', {
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  tag:        text('tag').notNull()
}, (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.tag] }) }))

export const favorites = sqliteTable('favorites', {
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  createdAt:  integer('created_at').notNull()
}, (t) => ({ pk: primaryKey({ columns: [t.userId, t.resourceId] }) }))

export const visitHistory = sqliteTable('visit_history', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  visitedAt:  integer('visited_at').notNull()
})

export const resourceVisitHourly = sqliteTable('resource_visit_hourly', {
  resourceId: text('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  visitHour:  integer('visit_hour').notNull(),
  visitCount: integer('visit_count').notNull().default(0)
}, (t) => ({ pk: primaryKey({ columns: [t.resourceId, t.visitHour] }) }))

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

export const emailConfig = sqliteTable('email_config', {
  id:           text('id').primaryKey().default('default'),
  smtpHost:     text('smtp_host').default(''),
  smtpPort:     integer('smtp_port').default(465),
  encryption:   text('encryption', { enum: ['ssl', 'tls', 'none'] }).default('ssl'),
  fromEmail:    text('from_email').default(''),
  fromName:     text('from_name').default('资源导航系统'),
  smtpUser:     text('smtp_user').default(''),
  smtpPassword: text('smtp_password').default('')
})

export const resetTokens = sqliteTable('reset_tokens', {
  token:     text('token').primaryKey(),
  email:     text('email').notNull(),
  expiresAt: integer('expires_at').notNull(),
  used:      integer('used', { mode: 'boolean' }).notNull().default(false)
})

export const initialized = sqliteTable('initialized', {
  id:   text('id').primaryKey().default('default'),
  done: integer('done', { mode: 'boolean' }).notNull().default(false)
})
