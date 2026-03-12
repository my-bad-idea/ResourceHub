import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import * as schema from './schema.js'

const DB_PATH = process.env.DB_PATH ?? 'data/app.db'

mkdirSync(dirname(DB_PATH), { recursive: true })

export const sqlite = new Database(DB_PATH)
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('journal_mode = WAL')

export const db = drizzle(sqlite, { schema })
