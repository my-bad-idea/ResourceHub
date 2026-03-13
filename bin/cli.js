#!/usr/bin/env node
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const appPath = join(root, 'dist', 'app.js')
const result = spawnSync(process.execPath, [appPath], { cwd: root, stdio: 'inherit' })
process.exit(result.status ?? 0)
