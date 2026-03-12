import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawn, spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const artifactsDir = join(repoRoot, 'artifacts', 'browser-acceptance')
const port = Number(process.env.UI_ACCEPTANCE_PORT || '3100')
const cdpPort = Number(process.env.UI_ACCEPTANCE_CDP_PORT || '9223')
const browserLocale = process.env.UI_ACCEPTANCE_BROWSER_LOCALE || 'zh-CN'
const logPath = join(artifactsDir, `run-${cdpPort}.log`)
const browserUserDataDir = join(artifactsDir, `edge-profile-${cdpPort}`)
const dbPath = join(repoRoot, 'data', `ui-acceptance-${port}.db`)
const appUrl = `http://127.0.0.1:${port}`
const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const manageProcesses = process.env.BROWSER_ACCEPTANCE_MANAGED !== '0'

mkdirSync(artifactsDir, { recursive: true })
writeFileSync(logPath, '')
if (manageProcesses) {
  rmSync(browserUserDataDir, { recursive: true, force: true })
  rmSync(dbPath, { force: true })
}

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`
  appendFileSync(logPath, line)
  console.log(message)
}

async function waitFor(fn, timeoutMs = 15000, intervalMs = 100) {
  const start = Date.now()
  let lastError
  while (Date.now() - start < timeoutMs) {
    try {
      const value = await fn()
      if (value) return value
    } catch (error) {
      lastError = error
    }
    await delay(intervalMs)
  }
  if (lastError) throw lastError
  throw new Error('Timed out waiting for condition')
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed: ${url} -> ${response.status}`)
  return response.json()
}

function killTree(child) {
  if (!child || child.exitCode !== null) return
  spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
}

function startServer() {
  const child = spawn('node', ['dist/app.js'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: dbPath,
      JWT_SECRET: 'ui-acceptance-secret',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const serverLog = []
  child.stdout.on('data', (chunk) => serverLog.push(chunk.toString()))
  child.stderr.on('data', (chunk) => serverLog.push(chunk.toString()))
  return { child, serverLog }
}

function startBrowser() {
  return spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--lang=${browserLocale}`,
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${browserUserDataDir}`,
    'about:blank',
  ], {
    cwd: repoRoot,
    stdio: ['ignore', 'ignore', 'pipe'],
  })
}

async function waitForText(page, text, timeoutMs = 15000) {
  return waitFor(async () => {
    const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '')
    return bodyText.includes(text)
  }, timeoutMs)
}

class CdpPage {
  constructor(wsUrl) {
    this.wsUrl = wsUrl
    this.ws = null
    this.nextId = 1
    this.pending = new Map()
    this.eventWaiters = new Map()
    this.listeners = new Map()
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl)
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data.toString())
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result)
        return
      }
      const listeners = this.listeners.get(message.method) || []
      for (const listener of listeners) listener(message.params)
      const waiters = this.eventWaiters.get(message.method)
      if (!waiters || waiters.length === 0) return
      const remaining = []
      for (const waiter of waiters) {
        if (waiter.predicate(message.params)) waiter.resolve(message.params)
        else remaining.push(waiter)
      }
      this.eventWaiters.set(message.method, remaining)
    })
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || []
    listeners.push(listener)
    this.listeners.set(method, listeners)
  }

  async send(method, params = {}) {
    const id = this.nextId++
    const payload = JSON.stringify({ id, method, params })
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    this.ws.send(payload)
    return promise
  }

  waitForEvent(method, predicate = () => true, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for event ${method}`)), timeoutMs)
      const wrappedResolve = (params) => {
        clearTimeout(timer)
        resolve(params)
      }
      const waiters = this.eventWaiters.get(method) || []
      waiters.push({ predicate, resolve: wrappedResolve })
      this.eventWaiters.set(method, waiters)
    })
  }

  async evaluate(fn, ...args) {
    const expression = `(${fn.toString()}).apply(null, ${JSON.stringify(args)})`
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed')
    }
    return result.result?.value
  }

  async navigate(url) {
    await this.send('Page.navigate', { url })
    await waitFor(async () => {
      const href = await this.evaluate(() => location.href)
      const readyState = await this.evaluate(() => document.readyState)
      return href === url && readyState === 'complete'
    }, 30000)
  }

  async waitFor(predicateFn, timeoutMs = 15000) {
    return waitFor(() => this.evaluate(predicateFn), timeoutMs)
  }

  async setViewport(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile })
  }

  async screenshot(filename) {
    const result = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    writeFileSync(join(artifactsDir, filename), Buffer.from(result.data, 'base64'))
  }

  async close() { if (this.ws) this.ws.close() }
}
const pageFns = {
  clickButtonByText: (text) => {
    const target = [...document.querySelectorAll('button')].find((button) => button.innerText.includes(text))
    if (!target) return false
    target.click()
    return true
  },
  clickTabByText: (text) => {
    const target = [...document.querySelectorAll('button')].find((button) => button.innerText.trim() === text)
    if (!target) return false
    target.click()
    return true
  },
  setInputByPlaceholder: (placeholder, value) => {
    const field = [...document.querySelectorAll('input, textarea')].find((input) => (input.getAttribute('placeholder') || '') === placeholder)
    if (!field) return false
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set
    if (setter) setter.call(field, value)
    else field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    field.blur()
    return true
  },
  submitInputByPlaceholder: (placeholder) => {
    const field = [...document.querySelectorAll('input, textarea')].find((input) => (input.getAttribute('placeholder') || '') === placeholder)
    if (!field) return false
    field.focus()
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    return true
  },
  setInputBySelector: (selector, value) => {
    const field = document.querySelector(selector)
    if (!field) return false
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set
    if (setter) setter.call(field, value)
    else field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    field.blur()
    return true
  },
  setFieldByLabel: (labelText, value) => {
    const label = [...document.querySelectorAll('label')].find((node) => node.innerText.includes(labelText))
    if (!label) return false
    const container = label.parentElement
    let field = container.querySelector('input, textarea, select')
    if (!field) {
      let sibling = label.nextElementSibling
      while (sibling && !field) {
        if (sibling.matches && sibling.matches('input, textarea, select')) field = sibling
        else field = sibling.querySelector?.('input, textarea, select') || null
        sibling = sibling.nextElementSibling
      }
    }
    if (!field) return false
    if (field.tagName === 'SELECT') {
      field.value = value
      field.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set
    if (setter) setter.call(field, value)
    else field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    field.blur()
    return true
  },
  hasLabel: (labelText) => {
    return [...document.querySelectorAll('label')].some((node) => node.innerText.includes(labelText))
  },
  hasButtonText: (text) => {
    return [...document.querySelectorAll('button')].some((button) => button.innerText.includes(text))
  },
  setHash: (hash) => {
    window.location.hash = hash
    return window.location.hash
  },
  extractResetToken: () => {
    const pre = document.querySelector('pre')
    if (!pre) return null
    const match = pre.innerText.match(/token=([a-f0-9]+)/i)
    return match ? match[1] : null
  },
  getHeaderTitle: () => {
    const title = document.querySelector('[data-rh-header-title]')
    return title ? title.innerText.trim() : ''
  },
  getHomeMode: () => {
    return document.querySelector('[data-rh-resource-browser]')?.getAttribute('data-rh-home-mode') || null
  },
  hasInputByPlaceholder: (placeholder) => {
    return [...document.querySelectorAll('input, textarea')].some((field) => (field.getAttribute('placeholder') || '') === placeholder)
  },
  clickSelector: (selector) => {
    const target = document.querySelector(selector)
    if (!target) return false
    target.click()
    return true
  },
  clickBrowseAllResources: () => {
    const target = document.querySelector('[data-rh-home-browse-all]')
    if (!target) return false
    target.click()
    return true
  },
  hoverSelector: (selector) => {
    const target = document.querySelector(selector)
    if (!target) return false
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    return true
  },
  clickModalBackdrop: () => {
    const overlay = document.elementFromPoint(8, 8)
    if (!overlay) return false
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return true
  },
  focusFieldByLabel: (labelText) => {
    const label = [...document.querySelectorAll('label')].find((node) => node.innerText.includes(labelText))
    if (!label) return false
    const container = label.parentElement
    const field = container.querySelector('input, textarea')
    if (!field) return false
    field.click()
    field.focus()
    field.dispatchEvent(new FocusEvent('focus', { bubbles: false }))
    field.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    return true
  },
  openDropdownByLabel: (labelText) => {
    const label = [...document.querySelectorAll('label')].find((node) => node.innerText.includes(labelText))
    if (!label) return false
    const container = label.parentElement
    let trigger = container.querySelector('button[aria-haspopup="listbox"]')
    if (!trigger) {
      let sibling = label.nextElementSibling
      while (sibling && !trigger) {
        if (sibling.matches && sibling.matches('button[aria-haspopup="listbox"]')) trigger = sibling
        else trigger = sibling.querySelector?.('button[aria-haspopup="listbox"]') || null
        sibling = sibling.nextElementSibling
      }
    }
    if (!trigger) return false
    trigger.click()
    return true
  },
  getHeaderAlignmentMetrics: () => {
    const header = document.querySelector('header')
    const headerShell = document.querySelector('[data-rh-layout-header-shell]')
    const actions = document.querySelector('[data-rh-header-actions]')
    const search = document.querySelector('[data-rh-global-search]')
    if (!header || !actions || !search || !headerShell) return null
    const themeTrigger = document.querySelector('[data-rh-theme-trigger]')
    const loginButton = [...actions.querySelectorAll('button')].find((button) => button.innerText.trim() === '登录')
    const headerRect = header.getBoundingClientRect()
    const headerShellStyle = getComputedStyle(headerShell)
    const actionsRect = actions.getBoundingClientRect()
    const searchRect = search.getBoundingClientRect()
    const themeRect = themeTrigger?.getBoundingClientRect()
    const loginRect = loginButton?.getBoundingClientRect()
    const paddingRight = Number.parseFloat(getComputedStyle(header).paddingRight || '0')
    const headerCenter = (headerRect.left + headerRect.right) / 2
    const searchCenter = (searchRect.left + searchRect.right) / 2
    return {
      actionsVisible: actionsRect.width > 0 && actionsRect.height > 0,
      searchVisible: searchRect.width > 0 && searchRect.height > 0,
      rightAligned: Math.abs((headerRect.right - actionsRect.right) - paddingRight) <= 4,
      searchBeforeActions: searchRect.right <= actionsRect.left - 8,
      searchCentered: Math.abs(searchCenter - headerCenter) <= 18,
      themeMatchesLoginHeight: !themeRect || !loginRect || Math.abs(themeRect.height - loginRect.height) <= 2,
      headerPinned: headerShellStyle.position === 'fixed',
    }
  },
  getFirstResourceElement: () => {
    return document.querySelector('[data-rh-resource-item]') || document.querySelector('[data-rh-resource-row]')
  },
  toggleSortMenu: () => {
    const trigger = document.querySelector('[data-rh-sort-trigger]')
    if (!trigger) return false
    trigger.click()
    return true
  },
  openSortMenuWithKeyboard: () => {
    const trigger = document.querySelector('[data-rh-sort-trigger]')
    if (!trigger) return false
    trigger.focus()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    return true
  },
  dispatchDocumentKey: (key) => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    return true
  },
  clickSortOption: (label) => {
    const target = [...document.querySelectorAll('[data-rh-sort-menu] button')].find((button) => button.innerText.trim() === label)
    if (!target) return false
    target.click()
    return true
  },
  getSortMenuMetrics: () => {
    const trigger = document.querySelector('[data-rh-sort-trigger]')
    const menu = document.querySelector('[data-rh-sort-menu]')
    const toolbar = document.querySelector('[data-rh-resource-toolbar]')
    if (!trigger) return null
    const triggerRect = trigger.getBoundingClientRect()
    const menuRect = menu?.getBoundingClientRect()
    return {
      triggerVisible: triggerRect.width > 0 && triggerRect.height > 0,
      customTrigger: trigger.tagName !== 'SELECT',
      noNativeSelect: !toolbar?.querySelector('select'),
      currentLabel: trigger.innerText.trim(),
      menuVisible: !!menu && menuRect.width > 0 && menuRect.height > 0,
      menuRightAligned: !!menuRect && Math.abs(menuRect.right - triggerRect.right) <= 10,
      roundedMenu: !!menu && Number.parseFloat(getComputedStyle(menu).borderRadius || '0') >= 14,
      optionCount: menu ? menu.querySelectorAll('button').length : 0,
    }
  },
  getHomeFusionMetrics: () => {
    const topSurface = document.querySelector('[data-rh-home-top-surface]')
    const header = document.querySelector('header')
    const layoutDivider = document.querySelector('[data-rh-layout-divider]')
    const browser = document.querySelector('[data-rh-resource-browser]')
    const heading = document.querySelector('[data-rh-home-heading-block]')
    const toolbar = document.querySelector('[data-rh-resource-toolbar]')
    if (!header || !browser || !layoutDivider) return null
    const headerRect = header.getBoundingClientRect()
    const dividerRect = layoutDivider.getBoundingClientRect()
    const browserRect = browser.getBoundingClientRect()
    const headerStyle = getComputedStyle(header)
    const dividerStyle = getComputedStyle(layoutDivider)
    const headingStyle = heading ? getComputedStyle(heading) : null
    const headingRect = heading?.getBoundingClientRect()
    const topSurfaceStyle = topSurface ? getComputedStyle(topSurface) : null
    return {
      compactGap: browserRect.top - headerRect.bottom <= 6,
      topSurfaceExists: Boolean(topSurface),
      surfaceTinted: Boolean(topSurfaceStyle && topSurfaceStyle.backgroundImage !== 'none'),
      headerDividerHidden: headerStyle.borderBottomStyle === 'none' || headerStyle.borderBottomWidth === '0px' || headerStyle.borderBottomColor === 'rgba(0, 0, 0, 0)' || headerStyle.borderBottomColor === 'transparent',
      browserTopDividerVisible: dividerRect.height > 0 && dividerRect.width > 0,
      lightShadow: headerStyle.boxShadow === 'none' || (!headerStyle.boxShadow.includes('16px') && !headerStyle.boxShadow.includes('24px') && !headerStyle.boxShadow.includes('32px')),
      headingNeutral: Boolean(!headingStyle || ((headingStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || headingStyle.backgroundColor === 'transparent') && headingStyle.boxShadow === 'none')),
      headingDividerVisible: Boolean(headingStyle && headingStyle.borderBottomStyle !== 'none' && headingStyle.borderBottomWidth !== '0px'),
      toolbarMissingByDefault: !toolbar,
      dividerWidthsAligned: Boolean(dividerRect.width >= browserRect.width && headingRect && Math.abs(browserRect.left - headingRect.left) <= 2 && Math.abs(browserRect.right - headingRect.right) <= 2),
    }
  },
  getDarkChipMetrics: () => {
    const categoryButton = document.querySelector('[data-rh-home-sidebar-section="categories"] button')
    const quickAccessButton = document.querySelector('[data-rh-home-sidebar-section="quick-access"] [data-rh-quick-access-item]')
    if (!categoryButton || !quickAccessButton) return null
    const categoryStyle = getComputedStyle(categoryButton)
    const quickStyle = getComputedStyle(quickAccessButton)
    return {
      categoryBorderVisible: categoryStyle.borderColor !== 'rgba(0, 0, 0, 0)',
      quickAccessReadable:
        quickAccessButton.innerText.trim().length > 0 &&
        (quickStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' || quickStyle.borderColor !== 'rgba(0, 0, 0, 0)'),
      noInsetGlow: !categoryStyle.boxShadow.includes('inset') && !quickStyle.boxShadow.includes('inset'),
      quickAccessSelectVisible: quickAccessButton.innerText.trim().length > 0,
    }
  },
  toggleHomeSidebarDrawer: () => {
    const trigger = document.querySelector('[data-rh-home-sidebar-trigger]')
    if (!trigger) return false
    trigger.click()
    return true
  },
  getHomeSidebarDrawerMetrics: () => {
    const drawer = document.querySelector('[data-rh-home-sidebar-drawer]')
    const quickSection = drawer?.querySelector('[data-rh-home-sidebar-section="quick-access"]')
    const categorySection = drawer?.querySelector('[data-rh-home-sidebar-section="categories"]')
    const tagSection = drawer?.querySelector('[data-rh-home-sidebar-section="tags"]')
    const quickItem = drawer?.querySelector('[data-rh-quick-access-item]')
    const categoryItem = drawer?.querySelector('[data-rh-home-category-item]')
    return {
      drawerVisible: Boolean(drawer && drawer.getBoundingClientRect().width > 0),
      hasQuickAccessSection: Boolean(quickSection),
      hasCategorySection: Boolean(categorySection),
      hasTagSection: Boolean(tagSection),
      directQuickAccessMenu: Boolean(quickItem) && !drawer?.querySelector('[data-rh-quick-access-select="true"]'),
      directCategoryMenu: Boolean(categoryItem) && !drawer?.querySelector('[data-rh-category-overflow-trigger]'),
    }
  },
  getGuestHomeMetrics: () => {
    const visibleButtons = [...document.querySelectorAll('button')].filter((button) => {
      const rect = button.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const loginButtons = visibleButtons.filter((button) => button.innerText.trim() === '登录')
    const extraLogin = visibleButtons.some((button) => button.innerText.includes('登录查看全部资源'))
    const searchInputs = [...document.querySelectorAll('[data-rh-global-search]')].filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const visibleTextInputs = [...document.querySelectorAll('input[type="text"]')].filter((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return rect.width > 8 && rect.height > 8 && style.opacity !== '0' && style.visibility !== 'hidden'
    })
    const main = document.querySelector('main')
    const browser = document.querySelector('[data-rh-resource-browser]')
    const overview = document.querySelector('[data-rh-home-overview]')
    const hero = document.querySelector('[data-rh-home-hero]')
    const title = document.querySelector('[data-rh-home-title]')
    const metrics = document.querySelectorAll('[data-rh-home-metric-card]')
    const sidebar = document.querySelector('[data-rh-home-sidebar]')
    const quickAccessSection = document.querySelector('[data-rh-home-overview-section="quick-access"]')
    const browseAllButton = document.querySelector('[data-rh-home-browse-all]')
    const categoryCards = document.querySelectorAll('[data-rh-overview-category-card]')
    const overviewSections = [...document.querySelectorAll('[data-rh-home-overview-section]')].filter((node) => node.getAttribute('data-rh-home-overview-section') !== 'quick-access')
    const firstItem = document.querySelector('[data-rh-home-overview-section] [data-rh-resource-item]')
    if (!browser || !overview || !hero) return null
    const browserRect = browser.getBoundingClientRect()
    const heroRect = hero.getBoundingClientRect()
    const firstItemRect = firstItem?.getBoundingClientRect()
    return {
      overviewMode: browser.getAttribute('data-rh-home-mode') === 'overview',
      singleLogin: loginButtons.length === 1,
      singleSearch: searchInputs.length === 1 && visibleTextInputs.length === 1,
      noExtraLogin: !extraLogin,
      heroVisible: heroRect.width > 0 && heroRect.height > 0,
      noLegacyTagRow: !document.querySelector('[data-rh-tag-row]'),
      sidebarHidden: !sidebar,
      noGuestQuickAccessSection: !quickAccessSection,
      noInlineQuickAccess: !document.querySelector('[data-rh-quick-access-select="true"]'),
      noInlineCategoryOverflow: !document.querySelector('[data-rh-category-overflow-trigger]'),
      titleDefault: title?.innerText.trim() === '资源导航',
      metricCardsPresent: metrics.length >= 2,
      browseAllVisible: Boolean(browseAllButton && browseAllButton.getBoundingClientRect().width > 0),
      categoryCardsVisible: categoryCards.length >= 1,
      overviewSectionsVisible: overviewSections.length >= 1,
      firstBlockIsBrowser: !!main && main.firstElementChild === browser,
      browserVisible: browserRect.top < window.innerHeight * 0.35,
      firstOverviewCardVisible: !firstItemRect || firstItemRect.top < window.innerHeight - 24,
    }
  },
  getDesktopOverviewMetrics: () => {
    const browser = document.querySelector('[data-rh-resource-browser]')
    const overview = document.querySelector('[data-rh-home-overview]')
    const hero = document.querySelector('[data-rh-home-hero]')
    const title = document.querySelector('[data-rh-home-title]')
    const subtitle = document.querySelector('[data-rh-home-subtitle]')
    const metrics = document.querySelectorAll('[data-rh-home-metric-card]')
    const browseAllButton = document.querySelector('[data-rh-home-browse-all]')
    const createButton = document.querySelector('[data-rh-toolbar-create]')
    const quickAccessCards = document.querySelectorAll('[data-rh-overview-quick-access]')
    const categoryCards = document.querySelectorAll('[data-rh-overview-category-card]')
    const sidebar = document.querySelector('[data-rh-home-sidebar]')
    const overviewSections = document.querySelectorAll('[data-rh-home-overview-section]')
    const firstItem = document.querySelector('[data-rh-home-overview-section] [data-rh-resource-item]')
    const firstOverviewCard = document.querySelector('[data-rh-home-overview-section] [data-rh-resource-card-mode]')
    if (!browser || !overview || !hero || !title) return null
    const browserRect = browser.getBoundingClientRect()
    const heroRect = hero.getBoundingClientRect()
    const firstItemRect = firstItem?.getBoundingClientRect()
    return {
      overviewMode: browser.getAttribute('data-rh-home-mode') === 'overview',
      heroVisible: heroRect.width > 0 && heroRect.height > 0,
      titleDefault: title.innerText.trim() === '资源导航',
      subtitleVisible: Boolean(subtitle && subtitle.innerText.trim()),
      metricCardsPresent: metrics.length === 3,
      browseAllVisible: Boolean(browseAllButton && browseAllButton.getBoundingClientRect().width > 0),
      createVisible: Boolean(createButton && createButton.getBoundingClientRect().width > 0),
      quickAccessCardsVisible: quickAccessCards.length >= 2,
      categoryCardsVisible: categoryCards.length >= 1,
      sidebarHidden: !sidebar,
      overviewSectionsVisible: overviewSections.length >= 3,
      overviewCardsFeatured: firstOverviewCard?.getAttribute('data-rh-resource-card-mode') === 'overview',
      browserAboveFold: browserRect.top < window.innerHeight * 0.22,
      firstOverviewCardVisible: !firstItemRect || firstItemRect.top < window.innerHeight - 24,
    }
  },
  getDesktopHomeMetrics: () => {
    const main = document.querySelector('main')
    const browser = document.querySelector('[data-rh-resource-browser]')
    const toolbar = document.querySelector('[data-rh-resource-toolbar]')
    const heading = document.querySelector('[data-rh-home-heading-block]')
    const headingTitle = document.querySelector('[data-rh-home-title]')
    const headingSubtitle = document.querySelector('[data-rh-home-subtitle]')
    const metrics = document.querySelectorAll('[data-rh-home-metric-card]')
    const categoryTitle = document.querySelector('[data-rh-home-category-title]')
    const sidebar = document.querySelector('[data-rh-home-sidebar]')
    const sidebarSurface =
      document.querySelector('[data-rh-home-sidebar] > div') ||
      document.querySelector('[data-rh-home-sidebar]')
    const headingToolbarSummary = toolbar?.querySelector('[data-rh-home-toolbar-summary]')
    const toolbarClearButton = toolbar?.querySelector('[data-rh-heading-clear-filters]')
    const toolbarReturnButton = toolbar?.querySelector('[data-rh-home-overview-return]')
    const toolbarCreateButton = [...(toolbar?.querySelectorAll('button') || [])].find((button) => button.innerText.includes('新增资源'))
    const viewTrigger = toolbar?.querySelector('[data-rh-view-mode-select="true"]')
    const sortTrigger = toolbar?.querySelector('[data-rh-sort-trigger]')
    const quickAccessItem = document.querySelector('[data-rh-home-sidebar-section="quick-access"] [data-rh-quick-access-item]')
    const categoryItem = document.querySelector('[data-rh-home-sidebar-section="categories"] [data-rh-home-category-item]')
    const resourceItems = [...document.querySelectorAll('[data-rh-resource-item], [data-rh-resource-row]')]
    const resourceCards = [...document.querySelectorAll('[data-rh-resource-card-mode]')]
    const compactCards = document.querySelectorAll('[data-rh-resource-card-compact="true"]')
    const firstItem = resourceItems[0]
    const secondItem = resourceItems[1]
    const searchInputs = [...document.querySelectorAll('[data-rh-global-search]')].filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const visibleTextInputs = [...document.querySelectorAll('input[type="text"]')].filter((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return rect.width > 8 && rect.height > 8 && style.opacity !== '0' && style.visibility !== 'hidden'
    })
    if (!browser || !toolbar || !heading || !firstItem || !sidebar) return null
    const browserRect = browser.getBoundingClientRect()
    const toolbarRect = toolbar.getBoundingClientRect()
    const sidebarRect = sidebar.getBoundingClientRect()
    const sidebarSurfaceRect = sidebarSurface?.getBoundingClientRect()
    const headingRect = heading.getBoundingClientRect()
    const headingSubtitleRect = headingSubtitle?.getBoundingClientRect()
    const firstItemRect = firstItem.getBoundingClientRect()
    const secondItemRect = secondItem?.getBoundingClientRect()
    const createButtonRect = toolbarCreateButton?.getBoundingClientRect()
    const viewTriggerRect = viewTrigger?.getBoundingClientRect()
    const sortTriggerRect = sortTrigger?.getBoundingClientRect()
    const viewTriggerStyle = viewTrigger ? getComputedStyle(viewTrigger) : null
    const visibleTagItems = document.querySelectorAll('[data-rh-home-sidebar-section="tags"] [data-rh-home-tag-item]')
    const firstRowCount = resourceItems.filter((item) => Math.abs(item.getBoundingClientRect().top - firstItemRect.top) <= 8).length
    const firstRowHeights = resourceItems
      .filter((item) => Math.abs(item.getBoundingClientRect().top - firstItemRect.top) <= 8)
      .map((item) => item.getBoundingClientRect().height)
    const summaryText = headingToolbarSummary?.innerText || ''
    return {
      resultsMode: browser.getAttribute('data-rh-home-mode') === 'results',
      singleSearch: searchInputs.length === 1 && visibleTextInputs.length === 1,
      noHero: !document.querySelector('[data-rh-home-hero]'),
      noLegacyTagRow: !document.querySelector('[data-rh-tag-row]'),
      sidebarVisible: sidebarRect.width > 0 && sidebarRect.height > 0,
      sidebarSticky: getComputedStyle(sidebar).position === 'sticky',
      sidebarNarrow: sidebarRect.width <= 236,
      sidebarQuietMode: sidebar.getAttribute('data-rh-home-sidebar-quiet') === 'true',
      quickAccessMenuVisible: Boolean(quickAccessItem),
      categoryMenuVisible: Boolean(categoryItem),
      sidebarTagsTrimmed: visibleTagItems.length <= 8,
      noInlineQuickAccess: !document.querySelector('[data-rh-quick-access-select="true"]'),
      noInlineCategoryOverflow: !document.querySelector('[data-rh-category-overflow-trigger]'),
      noInlineMoreFilters: !document.querySelector('[data-rh-more-filters-trigger]'),
      headingTitleDefault: headingTitle?.innerText.trim() === '全部资源',
      headingSubtitleCompact: !headingSubtitleRect || headingSubtitleRect.height <= 28,
      headingSubtitleShowsCount: Boolean(headingSubtitle?.innerText.includes('结果')),
      categoryFilterLabel: categoryTitle?.innerText.trim() === '类别过滤',
      headingHasMetricCards: metrics.length === 0,
      headingFusedWithToolbar: Boolean(heading?.contains(toolbar)),
      headingBeforeToolbar: headingRect.top <= toolbarRect.top,
      viewTriggerPillChrome: !viewTriggerStyle || (
        viewTrigger?.tagName === 'BUTTON' &&
        Number.parseFloat(viewTriggerStyle.borderRadius || '0') >= 10 &&
        viewTriggerStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        Number.parseFloat(viewTriggerStyle.borderTopWidth || '0') >= 1
      ),
      headingControlsEqualHeight: !createButtonRect || !viewTriggerRect || !sortTriggerRect || (
        Math.abs(createButtonRect.height - viewTriggerRect.height) <= 2 &&
        Math.abs(createButtonRect.height - sortTriggerRect.height) <= 2 &&
        Math.abs(viewTriggerRect.height - sortTriggerRect.height) <= 2
      ),
      toolbarVisibleByDefault: Boolean(toolbar),
      toolbarHasViewControl: Boolean(viewTrigger),
      toolbarHasSortControl: Boolean(sortTrigger),
      toolbarHasCreate: Boolean(toolbarCreateButton),
      toolbarSummaryContextual: summaryText.includes('资源浏览') || summaryText.includes('可见资源'),
      toolbarSummaryAvoidsControlDuplication: !summaryText.includes('按热度') && !summaryText.includes('按创建时间') && !summaryText.includes('按更新时间') && !summaryText.includes('视图'),
      toolbarClearHiddenByDefault: !toolbarClearButton,
      toolbarHasOverviewReturn: Boolean(toolbarReturnButton && toolbarReturnButton.getBoundingClientRect().width > 0),
      toolbarNearHeaderAtDefault: toolbarRect.top - browserRect.top <= 96,
      firstBlockIsBrowser: !!main && main.firstElementChild === browser,
      browserAboveFold: browserRect.top < window.innerHeight * 0.22,
      toolbarAboveFold: toolbarRect.top < window.innerHeight * 0.4,
      toolbarCompact: toolbarRect.height < 108,
      sidebarTopAligned: !sidebarSurfaceRect || Math.abs(sidebarSurfaceRect.top - firstItemRect.top) <= 48,
      firstResourceVisible: firstItemRect.top < window.innerHeight - 24,
      secondResourceVisible: !secondItemRect || secondItemRect.top < window.innerHeight - 24,
      noFeaturedFirstCard: !secondItemRect || Math.abs(firstItemRect.width - secondItemRect.width) <= 8,
      firstRowDense: firstRowCount >= 3,
      equalHeightFirstRow: firstRowHeights.length <= 1 || Math.max(...firstRowHeights) - Math.min(...firstRowHeights) <= 32,
      compactCardHeight: firstItemRect.height <= 220,
      compactCardsPresent: compactCards.length >= 1,
      resultsCardsCompactMode: resourceCards.length >= 1 && resourceCards.every((node) => node.getAttribute('data-rh-resource-card-mode') === 'result'),
      resultsAnchorRemoved: !document.querySelector('[data-rh-home-results-anchor]'),
      noIdleVerticalOverflow: document.documentElement.scrollHeight <= window.innerHeight + 280,
    }
  },
  getDesktopHeadingFilterMetrics: () => {
    const heading = document.querySelector('[data-rh-home-heading-block]')
    const browser = document.querySelector('[data-rh-resource-browser]')
    const toolbar = document.querySelector('[data-rh-resource-toolbar]')
    const headingTitle = document.querySelector('[data-rh-home-title]')
    const summary = document.querySelector('[data-rh-home-toolbar-summary]')
    const clearButton = toolbar?.querySelector('[data-rh-heading-clear-filters]')
    const overviewReturnButton = toolbar?.querySelector('[data-rh-home-overview-return]')
    const filterRow = document.querySelector('[data-rh-home-active-filters]')
    const activeQuickAccess = document.querySelector('[data-rh-home-sidebar-section="quick-access"] [data-rh-quick-access-active="true"]')
    const activeCategory = document.querySelector('[data-rh-home-sidebar-section="categories"] [data-rh-home-category-active="true"]')
    const activeTag = document.querySelector('[data-rh-home-sidebar-section="tags"] [data-rh-home-tag-active="true"]')
    const resourceItems = [...document.querySelectorAll('[data-rh-resource-item], [data-rh-resource-row]')]
    const grid = document.querySelector('[data-rh-resource-grid]')
    if (!browser || !heading || !toolbar) return null
    const filterText = filterRow?.innerText || ''
    const summaryText = summary?.innerText || ''
    const headingTitleText = headingTitle?.innerText?.trim() || ''
    const activeQuickAccessValue = activeQuickAccess?.getAttribute('data-rh-quick-access-item') || null
    const quickAccessLabelMap = { favorites: '我的收藏', history: '最近访问', mine: '我创建的' }
    const activeQuickAccessLabel = activeQuickAccessValue ? quickAccessLabelMap[activeQuickAccessValue] : null
    const activeCategoryLabel = (activeCategory?.innerText || '').replace(/\s+/g, ' ').trim()
    const normalizedCategoryLabel = activeCategoryLabel.replace(/\s+\d+\s*$/, '').trim()
    const gridRect = grid?.getBoundingClientRect()
    const firstItemRect = resourceItems[0]?.getBoundingClientRect()
    return {
      resultsMode: browser.getAttribute('data-rh-home-mode') === 'results',
      clearInToolbar: Boolean(clearButton && clearButton.getBoundingClientRect().height > 0),
      overviewReturnVisible: Boolean(overviewReturnButton && overviewReturnButton.getBoundingClientRect().height > 0),
      desktopToolbarVisible: Boolean(toolbar && toolbar.getBoundingClientRect().height > 0),
      metricCardsHidden: document.querySelectorAll('[data-rh-home-metric-card]').length === 0,
      summaryShowsResultContext: summaryText.includes('结果') || summaryText.includes('资源浏览') || summaryText.includes('可见资源'),
      summaryAvoidsControlDuplication: !summaryText.includes('按创建时间') && !summaryText.includes('按更新时间') && !summaryText.includes('按热度') && !summaryText.includes('视图'),
      redundantQuickAccessHidden: !activeQuickAccessLabel || headingTitleText !== activeQuickAccessLabel || !filterText.includes(activeQuickAccessLabel),
      filtersShowCategory: activeCategory ? (headingTitleText === normalizedCategoryLabel || filterText.includes(normalizedCategoryLabel)) : true,
      redundantCategoryHidden: !activeCategory || headingTitleText !== normalizedCategoryLabel || !filterText.includes(normalizedCategoryLabel),
      filtersShowTag: filterText.includes('#'),
      filteredGridCondensed: resourceItems.length !== 1 || !gridRect || !firstItemRect || gridRect.width <= firstItemRect.width + 8,
      activeQuickAccess: activeQuickAccessValue,
      activeCategoryLabel,
      activeTagValue: activeTag?.getAttribute('data-rh-home-tag-item') || null,
      resourceCount: resourceItems.length,
      includesSmokeResource: document.body.innerText.includes('UI Smoke Resource'),
    }
  },
  getMobileHomeMetrics: () => {
    const main = document.querySelector('main')
    const browser = document.querySelector('[data-rh-resource-browser]')
    const toolbar = document.querySelector('[data-rh-resource-toolbar]')
    const filterTrigger = document.querySelector('[data-rh-home-sidebar-trigger]')
    const firstItem = document.querySelector('[data-rh-resource-item]') || document.querySelector('[data-rh-resource-row]')
    const searchInputs = [...document.querySelectorAll('[data-rh-global-search]')].filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const visibleTextInputs = [...document.querySelectorAll('input[type="text"]')].filter((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return rect.width > 8 && rect.height > 8 && style.opacity !== '0' && style.visibility !== 'hidden'
    })
    if (!browser || !toolbar || !filterTrigger || !firstItem) return null
    const browserRect = browser.getBoundingClientRect()
    const toolbarRect = toolbar.getBoundingClientRect()
    const filterTriggerRect = filterTrigger.getBoundingClientRect()
    const firstItemRect = firstItem.getBoundingClientRect()
    return {
      resultsMode: browser.getAttribute('data-rh-home-mode') === 'results',
      singleSearch: searchInputs.length === 1 && visibleTextInputs.length === 1,
      noHero: !document.querySelector('[data-rh-home-hero]'),
      noLegacyTagRow: !document.querySelector('[data-rh-tag-row]'),
      drawerClosed: !document.querySelector('[data-rh-home-sidebar-drawer]'),
      firstBlockIsBrowser: !!main && main.firstElementChild === browser,
      browserAboveFold: browserRect.top < window.innerHeight * 0.4,
      toolbarVisible: toolbarRect.top < window.innerHeight * 0.58,
      mobileFilterVisible: filterTriggerRect.width > 0 && filterTriggerRect.height > 0,
      firstResourceVisible: firstItemRect.top < window.innerHeight - 24,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
    }
  },
  applyTheme: (theme) => {
    if (!window.applyTheme) return false
    window.applyTheme(theme)
    return true
  },
  getUiPreferenceSnapshot: () => {
    const activeView = document.querySelector('[data-rh-view-mode-select="true"]')
    const activeQuickAccess = document.querySelector('[data-rh-quick-access-active="true"]')
    const sortTrigger = document.querySelector('[data-rh-sort-trigger]')
    const preferenceStore = localStorage.getItem('rh_ui_preferences_v1')
    const isAuthenticated = Boolean(document.querySelector('[data-rh-user-trigger]'))
    let parsedStore = null
    let tokenPayload = null
    try {
      parsedStore = preferenceStore ? JSON.parse(preferenceStore) : null
    } catch (_error) {
      parsedStore = null
    }
    try {
      const token = sessionStorage.getItem('rh_token')
      if (token) {
        const payloadSegment = token.split('.')[1]
        if (payloadSegment) {
          const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/')
          const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
          tokenPayload = JSON.parse(atob(padded))
        }
      }
    } catch (_error) {
      tokenPayload = null
    }
    const storedPreferences = (() => {
      if (!parsedStore || typeof parsedStore !== 'object') return null
      if (isAuthenticated && tokenPayload?.userId !== undefined && tokenPayload?.userId !== null) {
        return parsedStore.users?.[String(tokenPayload.userId)] || parsedStore.guest || null
      }
      return parsedStore.guest || null
    })()
    const quickAccessValue = activeQuickAccess?.getAttribute('data-rh-quick-access-item') || null
    const normalizeSortLabel = (label) => {
      const trimmed = (label || '').trim()
      if (trimmed === '热度') return '按热度'
      if (trimmed === '创建') return '按创建时间'
      if (trimmed === '更新') return '按更新时间'
      return trimmed
    }
    return {
      locale: window.i18n?.getCurrentLocale?.() || document.documentElement.getAttribute('lang') || null,
      storedLocale: storedPreferences?.locale || null,
      htmlLang: document.documentElement.getAttribute('lang') || null,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : (storedPreferences?.theme || 'light'),
      viewMode: activeView?.getAttribute('data-rh-view-mode-trigger') || storedPreferences?.viewMode || null,
      quickAccess: !isAuthenticated ? null : quickAccessValue || storedPreferences?.quickAccessFilter || null,
      sortLabel: sortTrigger
        ? normalizeSortLabel(sortTrigger.innerText)
        : normalizeSortLabel(
            storedPreferences?.sortBy === 'created'
              ? '按创建时间'
              : storedPreferences?.sortBy === 'updated'
                ? '按更新时间'
                : '按热度'
          ),
      hasPreferenceStore: Boolean(preferenceStore),
    }
  },
  getLocaleSurfaceSnapshot: () => {
    const homeTitle = document.querySelector('[data-rh-home-title]')
    const authTitle = document.querySelector('h1')
    const searchField = document.querySelector('[data-rh-global-search]')
    return {
      locale: window.i18n?.getCurrentLocale?.() || null,
      htmlLang: document.documentElement.getAttribute('lang') || null,
      title: homeTitle?.innerText.trim() || authTitle?.innerText.trim() || '',
      searchPlaceholder: searchField?.getAttribute('placeholder') || '',
      authLanguageVisible: Boolean(document.querySelector('[data-rh-auth-language-trigger]')),
      headerLanguageVisible: Boolean(document.querySelector('[data-rh-language-trigger]')),
    }
  },
  evaluateLocaleDetection: (nextBrowserLocale) => {
    const applyLocaleOverride = (locale) => {
      const locales = [locale]
      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        get: () => locale,
      })
      Object.defineProperty(window.navigator, 'languages', {
        configurable: true,
        get: () => locales.slice(),
      })
    }

    try {
      localStorage.removeItem('rh_ui_preferences_v1')
      localStorage.removeItem('rh_theme')
      sessionStorage.removeItem('rh_token')
    } catch (_error) {
      // Ignore storage failures in restrictive browser modes.
    }

    applyLocaleOverride(nextBrowserLocale)

    return {
      detected: window.i18n?.detectBrowserLocale?.() || null,
      initial: window.uiPreferences?.getInitialUiState?.()?.locale || null,
    }
  },
  clickViewMode: (mode) => {
    const trigger = document.querySelector('[data-rh-view-mode-select="true"]')
    if (!trigger) return false
    trigger.click()
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        const target = document.querySelector(`[data-rh-view-mode-option="${mode}"]`)
        if (!target) {
          resolve(false)
          return
        }
        target.click()
        resolve(true)
      })
    })
  },
  clickQuickAccess: (key) => {
    const target = document.querySelector(`[data-rh-quick-access-item="${key}"]`)
    if (!target) return false
    target.click()
    return true
  },
  clickHomeCategory: (label) => {
    const section = document.querySelector('[data-rh-home-sidebar-section="categories"]')
    if (!section) return false
    const target = [...section.querySelectorAll('button[data-rh-home-category-item]')].find((button) => button.innerText.includes(label))
    if (!target) return false
    target.click()
    return true
  },
  clickHomeTag: (tag) => {
    const section = document.querySelector('[data-rh-home-sidebar-section="tags"]')
    if (!section) return false
    const target = [...section.querySelectorAll('button[data-rh-home-tag-item]')].find((button) => button.getAttribute('data-rh-home-tag-item') === tag)
    if (!target) return false
    target.click()
    return true
  },
  clickListboxOption: (label) => {
    const listbox = document.querySelector('[role="listbox"]')
    if (!listbox) return false
    const target = [...listbox.querySelectorAll('button')].find((button) => button.innerText.includes(label))
    if (!target) return false
    target.click()
    return true
  },
  expandHomeTagsIfNeeded: () => {
    const toggle = document.querySelector('[data-rh-home-tags-toggle]')
    if (!toggle) return true
    toggle.click()
    return true
  },
  addTagBySelector: (selector, value) => {
    const field = document.querySelector(selector)
    if (!field) return false
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')?.set
    if (setter) setter.call(field, value)
    else field.value = value
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.dispatchEvent(new Event('change', { bubbles: true }))
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
        resolve(true)
      })
    })
  },
  getHomeHeadingTitle: () => {
    const title = document.querySelector('[data-rh-home-title]')
    return title ? title.innerText.trim() : ''
  },
  isHomeReady: () => {
    const browser = document.querySelector('[data-rh-resource-browser]')
    const title = document.querySelector('[data-rh-home-title]')
    return Boolean(browser && title && title.innerText.trim())
  },
  clickFirstFavorite: () => {
    const target = document.querySelector('[data-rh-resource-favorite]')
    if (!target) return false
    target.click()
    return true
  },
  getSurfaceMetrics: () => {
    const header = document.querySelector('header')
    const search = document.querySelector('[data-rh-global-search]')
    const toolbar =
      document.querySelector('[data-rh-resource-toolbar]') ||
      document.querySelector('[data-rh-home-heading-block]')
    const sidebar =
      document.querySelector('[data-rh-home-sidebar] > div') ||
      document.querySelector('[data-rh-home-sidebar]')
    const firstCard =
      document.querySelector('[data-rh-resource-item] > *') ||
      document.querySelector('[data-rh-resource-list-shell]') ||
      document.querySelector('[data-rh-resource-row]')
    if (!header || !search || !toolbar || !firstCard || !sidebar) return null
    const bodyStyle = getComputedStyle(document.body)
    const headerStyle = getComputedStyle(header)
    const searchStyle = getComputedStyle(search)
    const toolbarStyle = getComputedStyle(toolbar)
    const sidebarStyle = getComputedStyle(sidebar)
    const cardStyle = getComputedStyle(firstCard)
    return {
      isLight: !document.documentElement.classList.contains('dark'),
      bodyBackground: bodyStyle.backgroundColor,
      headerBackground: headerStyle.backgroundColor,
      searchBackground: searchStyle.backgroundColor,
      toolbarBackground: toolbarStyle.backgroundColor,
      sidebarBackground: sidebarStyle.backgroundColor,
      cardBackground: cardStyle.backgroundColor,
      cardShadow: cardStyle.boxShadow,
      layeredHeader: searchStyle.backgroundColor !== bodyStyle.backgroundColor,
      layeredSidebar: sidebarStyle.backgroundColor !== bodyStyle.backgroundColor,
      layeredCard: cardStyle.backgroundColor !== bodyStyle.backgroundColor,
      layeredToolbar: toolbarStyle.borderBottomColor !== 'rgba(0, 0, 0, 0)',
      elevatedCardShadow: cardStyle.boxShadow && cardStyle.boxShadow !== 'none',
      whiteSearch: searchStyle.backgroundColor === 'rgb(255, 255, 255)',
    }
  },
  getListInsetMetrics: () => {
    const row = document.querySelector('[data-rh-resource-row]')
    if (!row) return null
    const logo = row.querySelector('img, div')
    if (!logo) return null
    const rowRect = row.getBoundingClientRect()
    const logoRect = logo.getBoundingClientRect()
    return {
      leftInset: logoRect.left - rowRect.left,
      safeInset: logoRect.left - rowRect.left >= 12,
    }
  },
  getAdminHeaderMetrics: () => {
    const visibleSearches = [...document.querySelectorAll('[data-rh-global-search]')].filter((node) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    return {
      searchHidden: visibleSearches.length === 0,
    }
  },
  getOpenDropdownMetrics: () => {
    const menu = document.querySelector('[role="listbox"]')
    const trigger = [...document.querySelectorAll('button[aria-haspopup="listbox"]')].find((button) => button.getAttribute('aria-expanded') === 'true')
    if (!menu || !trigger) return null
    const menuStyle = getComputedStyle(menu)
    return {
      rounded: Number.parseFloat(menuStyle.borderRadius || '0') >= 14,
      customMenu: menu.tagName === 'DIV',
      optionCount: menu.querySelectorAll('button').length,
    }
  },
  getTagSuggestionMetrics: () => {
    const panel = document.querySelector('[data-rh-tag-suggestions]')
    if (!panel) return null
    const suggestionButton = panel.querySelector('button')
    if (!suggestionButton) return null
    return {
      visible: true,
      rounded: !!panel && Number.parseFloat(getComputedStyle(panel).borderRadius || '0') >= 12,
    }
  },
  getResourceActionTooltipMetrics: () => {
    const tooltip = document.querySelector('[role="tooltip"]')
    const firstFavorite = document.querySelector('[data-rh-resource-favorite]')
    return {
      tooltipVisible: !!tooltip,
      labelPresent: Boolean(firstFavorite?.getAttribute('title')),
    }
  },
  tableOverflowInfo: () => {
    const container = [...document.querySelectorAll('div')].find((node) => {
      const style = node.getAttribute('style') || ''
      return style.includes('overflow-x: auto') || style.includes('overflowX: auto')
    })
    const table = container?.querySelector('table')
    if (!container || !table) return null
    return {
      containerWidth: container.clientWidth,
      tableWidth: table.scrollWidth,
      hasOverflow: table.scrollWidth > container.clientWidth,
    }
  },
}
async function main() {
  const server = manageProcesses ? startServer() : null
  let browser = null
  const report = { checks: [] }

  try {
    log('wait-app')
    await waitFor(async () => {
      const json = await fetchJson(`${appUrl}/api/auth/init-status`)
      return json && typeof json.success === 'boolean'
    })

    if (manageProcesses) browser = startBrowser()

    log('wait-cdp-target')
    const target = await waitFor(async () => {
      const pages = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`)
      return pages.find((entry) => entry.type === 'page' && entry.webSocketDebuggerUrl)
    })

    log('connect-cdp')
    const page = new CdpPage(target.webSocketDebuggerUrl)
    await page.connect()
    await page.send('Page.enable')
    await page.send('Runtime.enable')
    await page.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        (() => {
          const locale = ${JSON.stringify(browserLocale)};
          const locales = [locale];
          try {
            Object.defineProperty(window.navigator, 'language', {
              configurable: true,
              get: () => locale,
            });
            Object.defineProperty(window.navigator, 'languages', {
              configurable: true,
              get: () => locales.slice(),
            });
          } catch (_error) {}
        })();
      `,
    })
    await page.send('Log.enable')
    page.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      const description = exceptionDetails?.exception?.description || exceptionDetails?.text || 'unknown runtime exception'
      log(`runtime-exception ${description}`)
    })
    page.on('Log.entryAdded', ({ entry }) => {
      log(`browser-log ${entry.level || 'info'} ${entry.text || ''}`)
    })
    page.on('Page.frameNavigated', ({ frame }) => {
      if (frame?.parentId) return
      log(`frame-navigated ${frame.url}`)
    })

    async function expectPageAction(description, fn, ...args) {
      const ok = await page.evaluate(fn, ...args)
      if (!ok) throw new Error(`Page action failed: ${description}`)
    }

    async function selectTheme(theme) {
      await expectPageAction('open theme menu', pageFns.clickSelector, '[data-rh-theme-trigger]')
      await waitFor(async () => {
        const optionExists = await page.evaluate((targetTheme) => {
          return Boolean(document.querySelector(`[data-rh-theme-option="${targetTheme}"]`))
        }, theme)
        return optionExists
      }, 10000, 100)
      await expectPageAction(`select ${theme} theme`, pageFns.clickSelector, `[data-rh-theme-option="${theme}"]`)
      await waitFor(async () => {
        const metrics = await page.evaluate(pageFns.getUiPreferenceSnapshot)
        return metrics?.theme === theme ? metrics : null
      }, 10000, 200)
    }

    async function expectPreferenceSnapshot(expected) {
      return waitFor(async () => {
        const snapshot = await page.evaluate(pageFns.getUiPreferenceSnapshot)
        const themeOk = expected.theme === undefined || snapshot?.theme === expected.theme
        const viewOk = expected.viewMode === undefined || snapshot?.viewMode === expected.viewMode
        const sortOk = expected.sortLabel === undefined || snapshot?.sortLabel.includes(expected.sortLabel)
        const quickAccessOk = expected.quickAccess === undefined || snapshot?.quickAccess === expected.quickAccess
        const localeOk = expected.locale === undefined || snapshot?.locale === expected.locale
        const storedLocaleOk = expected.storedLocale === undefined || snapshot?.storedLocale === expected.storedLocale
        const storeOk = expected.hasPreferenceStore === undefined || snapshot?.hasPreferenceStore === expected.hasPreferenceStore
        if (themeOk && viewOk && sortOk && quickAccessOk && localeOk && storedLocaleOk && storeOk) return snapshot
        return null
      }, 10000, 200)
    }

    async function selectAuthLocale(locale) {
      await expectPageAction('open auth language menu', pageFns.clickSelector, '[data-rh-auth-language-trigger]')
      await waitFor(async () => {
        const visible = await page.evaluate((targetLocale) => {
          return Boolean(document.querySelector(`[data-rh-auth-language-option="${targetLocale}"]`))
        }, locale)
        return visible ? true : null
      }, 10000, 100)
      await expectPageAction(`select auth locale ${locale}`, pageFns.clickSelector, `[data-rh-auth-language-option="${locale}"]`)
      await expectPreferenceSnapshot({ locale, storedLocale: locale, hasPreferenceStore: true })
    }

    async function selectHeaderLocale(locale) {
      await expectPageAction('open header language menu', pageFns.clickSelector, '[data-rh-language-trigger]')
      await waitFor(async () => {
        const visible = await page.evaluate((targetLocale) => {
          return Boolean(document.querySelector(`[data-rh-language-option="${targetLocale}"]`))
        }, locale)
        return visible ? true : null
      }, 10000, 100)
      await expectPageAction(`select header locale ${locale}`, pageFns.clickSelector, `[data-rh-language-option="${locale}"]`)
      await expectPreferenceSnapshot({ locale })
    }

    async function verifyBrowserLocaleDetection() {
      const localeCases = [
        { input: 'zh-CN', expected: 'zh-Hans' },
        { input: 'zh-TW', expected: 'zh-Hant' },
        { input: 'en-US', expected: 'en' },
        { input: 'ja-JP', expected: 'ja' },
        { input: 'fr-FR', expected: 'zh-Hans' },
      ]

      for (const { input, expected } of localeCases) {
        const result = await page.evaluate(pageFns.evaluateLocaleDetection, input)
        if (result?.detected !== expected || result?.initial !== expected) {
          throw new Error(`Locale detection mismatch for ${input}: ${JSON.stringify(result)}`)
        }
      }

      await page.evaluate(pageFns.evaluateLocaleDetection, browserLocale)
    }

    async function logoutToGuestHome() {
      await expectPageAction('open user menu', pageFns.clickSelector, '[data-rh-user-trigger]')
      await waitFor(async () => {
        const visible = await page.evaluate(() => Boolean(document.querySelector('[data-rh-logout-trigger]')))
        return visible
      }, 10000, 100)
      await expectPageAction('click logout', pageFns.clickSelector, '[data-rh-logout-trigger]')
      await page.waitFor(() => window.location.hash === '#/')
      await waitForHomeReady()
    }

    async function waitForHomeReady(expectedTitle = null) {
      return waitFor(async () => {
        const state = await page.evaluate((title) => {
          const browser = document.querySelector('[data-rh-resource-browser]')
          const heading = document.querySelector('[data-rh-home-title]')
          if (!browser || !heading) return null
          const headingText = heading.innerText.trim()
          if (!headingText) return null
          if (title && headingText !== title) return null
          return { hash: window.location.hash, headingText }
        }, expectedTitle)
        return state?.hash === '#/' ? state : null
      }, 15000, 100)
    }

    async function waitForHomeMode(mode, expectedTitle = null) {
      return waitFor(async () => {
        const state = await page.evaluate((targetMode, title) => {
          const browser = document.querySelector('[data-rh-resource-browser]')
          const heading = document.querySelector('[data-rh-home-title]')
          if (!browser || !heading) return null
          const headingText = heading.innerText.trim()
          const currentMode = browser.getAttribute('data-rh-home-mode')
          if (!headingText || currentMode !== targetMode) return null
          if (title && headingText !== title) return null
          return { hash: window.location.hash, headingText, currentMode }
        }, mode, expectedTitle)
        return state?.hash === '#/' ? state : null
      }, 15000, 100)
    }

    async function enterBrowseAllResults(expectedTitle = '全部资源') {
      const currentMode = await page.evaluate(pageFns.getHomeMode)
      if (currentMode === 'results') {
        await waitForHomeMode('results', expectedTitle)
        return
      }
      await expectPageAction('browse all resources', pageFns.clickBrowseAllResources)
      await waitForHomeMode('results', expectedTitle)
    }

    async function loginAndWait(username, password) {
      await page.evaluate(pageFns.setHash, '#/login')
      await waitForText(page, '用户名')
      await waitFor(async () => {
        const copy = await page.evaluate(() => {
          const bodyText = document.body ? document.body.innerText : ''
          return {
            noEnterpriseCopy: !bodyText.includes('使用企业账号继续访问') && !bodyText.includes('仅限企业账号登录'),
            neutralHelpVisible: bodyText.includes('如无法登录或注册，请联系管理员确认账号与注册策略。'),
          }
        })
        return copy.noEnterpriseCopy && copy.neutralHelpVisible ? copy : null
      }, 5000)
      await expectPageAction('login username', pageFns.setInputByPlaceholder, '请输入用户名', username)
      await expectPageAction('login password', pageFns.setInputByPlaceholder, '请输入密码', password)
      await expectPageAction('submit login', pageFns.clickButtonByText, '登录')
      const loginState = await waitFor(async () => {
        const hash = await page.evaluate(() => window.location.hash)
        const text = await page.evaluate(() => document.body.innerText)
        const ready = await page.evaluate(pageFns.isHomeReady)
        if (hash === '#/' && ready) return 'home'
        if (text.includes('用户名或密码错误')) return 'error'
        return ''
      }, 15000)
      if (loginState !== 'home') {
        const loginText = await page.evaluate(() => document.body.innerText)
        throw new Error(`Login did not reach home: ${loginText}`)
      }
      await waitForHomeReady()
    }

    log('open-setup')
    await page.setViewport(1440, 900, false)
    await page.navigate(`${appUrl}/#/setup`)
    const setupHref = await page.evaluate(() => location.href)
    const setupReady = await page.evaluate(() => document.readyState)
    log(`setup-context ${setupHref} ${setupReady}`)
    try {
      await waitForText(page, '欢迎使用资源导航系统')
    } catch (error) {
      const setupText = await page.evaluate(() => document.body ? document.body.innerText : '<no-body>')
      const setupHtml = await page.evaluate(() => document.body ? document.body.innerHTML.slice(0, 1200) : '<no-body>')
      await page.screenshot('00-setup-failure.png')
      throw new Error(`Setup page did not render. Text: ${setupText}. Html: ${setupHtml}`)
    }
    await page.screenshot('01-setup-desktop.png')
    report.checks.push('setup-page-rendered')

    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getLocaleSurfaceSnapshot)
      return snapshot?.authLanguageVisible ? snapshot : null
    }, 10000, 100)
    await verifyBrowserLocaleDetection()
    report.checks.push('browser-locale-detection-verified')

    await selectAuthLocale('en')
    await waitForText(page, 'Welcome to ResourceHub')
    await waitForText(page, 'Finish Setup')
    await page.navigate(`${appUrl}/#/setup`)
    await waitForText(page, 'Welcome to ResourceHub')
    await expectPreferenceSnapshot({ locale: 'en', storedLocale: 'en', hasPreferenceStore: true })
    report.checks.push('auth-language-switch-persisted')

    await selectAuthLocale('zh-Hans')
    await waitForText(page, '欢迎使用资源导航系统')
    await expectPreferenceSnapshot({ locale: 'zh-Hans', storedLocale: 'zh-Hans', hasPreferenceStore: true })

    await expectPageAction('setup username', pageFns.setInputByPlaceholder, '仅字母数字下划线，3-20位', 'admin_ui')
    await expectPageAction('setup display name', pageFns.setInputByPlaceholder, '显示给其他用户的名称', '管理员')
    await expectPageAction('setup email', pageFns.setInputByPlaceholder, 'admin@example.com', 'admin@example.com')
    await expectPageAction('setup password', pageFns.setInputByPlaceholder, '至少8位，含字母和数字', 'AdminUi123')
    await expectPageAction('setup confirm password', pageFns.setInputByPlaceholder, '再次输入密码', 'AdminUi123')
    await expectPageAction('submit setup', pageFns.clickButtonByText, '完成初始化')
    await page.waitFor(() => window.location.hash === '#/login')
    await waitForText(page, '用户名')
    report.checks.push('setup-flow-completed')

    await page.evaluate(pageFns.setHash, '#/')
    await waitForHomeReady()
    let guestHomeMetrics = null
    try {
      guestHomeMetrics = await waitFor(async () => {
        const metrics = await page.evaluate(pageFns.getGuestHomeMetrics)
        if (
          metrics?.overviewMode &&
          metrics?.heroVisible &&
          metrics?.noLegacyTagRow &&
          metrics?.noGuestQuickAccessSection &&
          metrics?.titleDefault &&
          metrics?.browseAllVisible &&
          metrics?.categoryCardsVisible &&
          metrics?.overviewSectionsVisible
        ) return metrics
        return null
      }, 10000, 200)
    } catch (error) {
      const metrics = await page.evaluate(pageFns.getGuestHomeMetrics)
      throw new Error(`Guest overview metrics mismatch: ${JSON.stringify(metrics)}`)
    }
    const headerAlignmentMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getHeaderAlignmentMetrics)
      if (
        metrics?.actionsVisible &&
        metrics?.searchVisible &&
        metrics?.rightAligned &&
        metrics?.searchBeforeActions &&
        metrics?.searchCentered &&
        metrics?.themeMatchesLoginHeight
      ) return metrics
      return null
    }, 10000, 200)
    await page.screenshot('02-home-guest.png')
    report.checks.push('guest-overview-mode-confirmed')
    report.checks.push('guest-overview-entry-points-visible')
    report.checks.push('header-actions-right-aligned')

    await selectTheme('light')
    await enterBrowseAllResults('全部资源')
    await expectPageAction('set guest list view', pageFns.clickViewMode, 'list')
    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getUiPreferenceSnapshot)
      return snapshot?.viewMode === 'list' ? snapshot : null
    }, 10000, 200)
    await expectPageAction('open guest sort menu', pageFns.toggleSortMenu)
    await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getSortMenuMetrics)
      return metrics?.menuVisible ? metrics : null
    }, 10000, 200)
    await expectPageAction('select guest updated sort option', pageFns.clickSortOption, '按更新时间')
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'list',
      sortLabel: '按更新时间',
      quickAccess: null,
      hasPreferenceStore: true,
    })
    await page.navigate(`${appUrl}/#/`)
    await waitForHomeReady()
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'list',
      sortLabel: '按更新时间',
      quickAccess: null,
      hasPreferenceStore: true,
    })
    report.checks.push('guest-preferences-restored-after-refresh')

    log('setup-done-login')
    try {
      await loginAndWait('admin_ui', 'AdminUi123')
    } catch (error) {
      const loginHash = await page.evaluate(() => window.location.hash)
      const loginText = await page.evaluate(() => document.body.innerText)
      const loginHtml = await page.evaluate(() => document.body ? document.body.innerHTML.slice(0, 1200) : '<no-body>')
      await page.screenshot('02-login-failure.png')
      throw new Error(`Login wait timed out at ${loginHash}: ${loginText}. Html: ${loginHtml}`)
    }
    let desktopOverviewMetrics = null
    try {
      desktopOverviewMetrics = await waitFor(async () => {
        const metrics = await page.evaluate(pageFns.getDesktopOverviewMetrics)
        if (
          metrics?.overviewMode &&
          metrics?.heroVisible &&
          metrics?.titleDefault &&
          metrics?.subtitleVisible &&
          metrics?.metricCardsPresent &&
          metrics?.browseAllVisible &&
          metrics?.createVisible &&
          metrics?.quickAccessCardsVisible &&
          metrics?.categoryCardsVisible &&
          metrics?.sidebarHidden &&
          metrics?.overviewSectionsVisible &&
          metrics?.overviewCardsFeatured
        ) return metrics
        return null
      }, 10000, 200)
    } catch (error) {
      const metrics = await page.evaluate(pageFns.getDesktopOverviewMetrics)
      throw new Error(`Desktop overview metrics mismatch: ${JSON.stringify(metrics)}`)
    }
    await page.screenshot('02-home-desktop-overview.png')
    report.checks.push('home-overview-split-confirmed')
    report.checks.push('home-overview-sections-visible')

    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getLocaleSurfaceSnapshot)
      return snapshot?.headerLanguageVisible ? snapshot : null
    }, 10000, 100)
    await selectHeaderLocale('ja')
    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getLocaleSurfaceSnapshot)
      return snapshot?.locale === 'ja' &&
        snapshot?.htmlLang === 'ja' &&
        snapshot?.title === 'リソースハブ' &&
        snapshot?.searchPlaceholder === '名前・説明・タグを検索... (Ctrl+K)'
        ? snapshot
        : null
    }, 10000, 200)
    await page.navigate(`${appUrl}/#/`)
    await waitForHomeReady()
    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getLocaleSurfaceSnapshot)
      return snapshot?.locale === 'ja' &&
        snapshot?.htmlLang === 'ja' &&
        snapshot?.title === 'リソースハブ'
        ? snapshot
        : null
    }, 10000, 200)
    report.checks.push('header-language-switch-persisted')

    await selectHeaderLocale('zh-Hans')
    await waitForText(page, '资源导航')
    await expectPreferenceSnapshot({ locale: 'zh-Hans' })

    await enterBrowseAllResults('全部资源')
    await expectPageAction('normalize admin home view to card', pageFns.clickViewMode, 'card')
    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getUiPreferenceSnapshot)
      return snapshot?.viewMode === 'card' ? snapshot : null
    }, 10000, 200)
    await page.screenshot('03-home-desktop-results.png')
    report.checks.push('login-flow-completed')

    log('login-done-home')
    let desktopHomeMetrics = null
    try {
      desktopHomeMetrics = await waitFor(async () => {
        const metrics = await page.evaluate(pageFns.getDesktopHomeMetrics)
        if (
          metrics?.resultsMode &&
          metrics?.singleSearch &&
          metrics?.noHero &&
          metrics?.noLegacyTagRow &&
          metrics?.sidebarVisible &&
          metrics?.sidebarSticky &&
          metrics?.sidebarNarrow &&
          metrics?.sidebarQuietMode &&
          metrics?.quickAccessMenuVisible &&
          metrics?.categoryMenuVisible &&
          metrics?.sidebarTagsTrimmed &&
          metrics?.noInlineQuickAccess &&
          metrics?.noInlineCategoryOverflow &&
          metrics?.noInlineMoreFilters &&
          metrics?.headingTitleDefault &&
          metrics?.headingSubtitleCompact &&
          metrics?.headingSubtitleShowsCount &&
          metrics?.categoryFilterLabel &&
          metrics?.headingHasMetricCards &&
          metrics?.headingFusedWithToolbar &&
          metrics?.headingBeforeToolbar &&
          metrics?.viewTriggerPillChrome &&
          metrics?.headingControlsEqualHeight &&
          metrics?.toolbarVisibleByDefault &&
          metrics?.toolbarHasViewControl &&
          metrics?.toolbarHasSortControl &&
          metrics?.toolbarHasCreate &&
          metrics?.toolbarSummaryContextual &&
          metrics?.toolbarSummaryAvoidsControlDuplication &&
          metrics?.toolbarClearHiddenByDefault &&
          metrics?.toolbarHasOverviewReturn &&
          metrics?.toolbarNearHeaderAtDefault &&
          metrics?.firstBlockIsBrowser &&
          metrics?.browserAboveFold &&
          metrics?.toolbarAboveFold &&
          metrics?.toolbarCompact &&
          metrics?.sidebarTopAligned &&
          metrics?.firstResourceVisible &&
          metrics?.secondResourceVisible &&
          metrics?.noFeaturedFirstCard &&
          metrics?.equalHeightFirstRow &&
          metrics?.compactCardHeight &&
          metrics?.compactCardsPresent &&
          metrics?.resultsCardsCompactMode &&
          metrics?.resultsAnchorRemoved &&
          metrics?.noIdleVerticalOverflow
        ) return metrics
        return null
      }, 10000, 200)
    } catch (error) {
      const metrics = await page.evaluate(pageFns.getDesktopHomeMetrics)
      throw new Error(`Desktop home metrics mismatch: ${JSON.stringify(metrics)}`)
    }
    report.checks.push('home-desktop-resource-first')
    report.checks.push('home-sidebar-desktop-confirmed')
    report.checks.push('home-sidebar-tags-trimmed')
    report.checks.push('home-heading-controls-condensed')
    report.checks.push('home-cards-equalized')
    report.checks.push('home-grid-density-improved')
    report.checks.push('home-toolbar-copy-removed')
    report.checks.push('home-card-whitespace-reduced')
    let homeFusionMetrics = null
    try {
      homeFusionMetrics = await waitFor(async () => {
        const metrics = await page.evaluate(pageFns.getHomeFusionMetrics)
        if (
          metrics?.compactGap &&
          metrics?.topSurfaceExists &&
          metrics?.surfaceTinted &&
          metrics?.headerDividerHidden &&
          metrics?.browserTopDividerVisible &&
          metrics?.lightShadow &&
          (metrics?.headingNeutral || metrics?.headingDividerVisible) &&
          !metrics?.toolbarMissingByDefault &&
          metrics?.dividerWidthsAligned
        ) return metrics
        return null
      }, 10000, 200)
    } catch (error) {
      const metrics = await page.evaluate(pageFns.getHomeFusionMetrics)
      throw new Error(`Home fusion metrics mismatch: ${JSON.stringify(metrics)}`)
    }
    report.checks.push('home-header-fusion-confirmed')

    await expectPageAction('hover first resource favorite', pageFns.hoverSelector, '[data-rh-resource-favorite]')
    const tooltipMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getResourceActionTooltipMetrics)
      if (metrics?.tooltipVisible && metrics?.labelPresent) return metrics
      return null
    }, 10000, 200)
    report.checks.push('resource-action-tooltip-visible')

    await expectPageAction('open sort menu with keyboard', pageFns.openSortMenuWithKeyboard)
    const sortMenuMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getSortMenuMetrics)
      if (
        metrics?.triggerVisible &&
        metrics?.customTrigger &&
        metrics?.noNativeSelect &&
        metrics?.menuVisible &&
        metrics?.menuRightAligned &&
        metrics?.roundedMenu &&
        metrics?.optionCount === 3
      ) return metrics
      return null
    }, 10000, 200)
    await expectPageAction('close sort menu with escape', pageFns.dispatchDocumentKey, 'Escape')
    await page.waitFor(() => !document.querySelector('[data-rh-sort-menu]'))
    await expectPageAction('reopen sort menu', pageFns.toggleSortMenu)
    await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getSortMenuMetrics)
      return metrics?.menuVisible ? metrics : null
    }, 10000, 200)
    await expectPageAction('select updated sort option', pageFns.clickSortOption, '按更新时间')
    await page.waitFor(() => {
      const trigger = document.querySelector('[data-rh-sort-trigger]')
      return trigger && ['按更新时间', '更新'].some((label) => trigger.innerText.includes(label)) && !document.querySelector('[data-rh-sort-menu]')
    })
    report.checks.push('home-sort-menu-customized')

    const initialTheme = await page.evaluate(() => window.getTheme ? window.getTheme() : 'system')
    await expectPageAction('apply light theme', pageFns.applyTheme, 'light')
    const lightThemeMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getSurfaceMetrics)
      if (
        metrics?.isLight &&
        metrics?.layeredHeader &&
        metrics?.layeredSidebar &&
        metrics?.layeredCard &&
        metrics?.layeredToolbar &&
        metrics?.elevatedCardShadow &&
        metrics?.whiteSearch
      ) return metrics
      return null
    }, 10000, 200)
    report.checks.push('light-theme-layering-confirmed')
    await expectPageAction('restore theme', pageFns.applyTheme, initialTheme)

    await expectPageAction('set desktop list view for inset check', pageFns.clickViewMode, 'list')
    const listInsetMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getListInsetMetrics)
      if (metrics?.safeInset) return metrics
      return null
    }, 10000, 200)
    report.checks.push('resource-row-left-inset-adjusted')
    await expectPageAction('restore desktop card view', pageFns.clickViewMode, 'card')

    await expectPageAction('open create resource modal', pageFns.clickButtonByText, '新增资源')
    await waitFor(async () => {
      const visible = await page.evaluate(() => Boolean(document.querySelector('[data-rh-resource-name-input]')))
      return visible ? true : null
    }, 10000, 200)
    await expectPageAction('focus tag input', pageFns.clickSelector, '[data-rh-tag-input]')
    const tagSuggestionMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getTagSuggestionMetrics)
      if (metrics?.visible && metrics?.rounded) return metrics
      return null
    }, 10000, 200)
    report.checks.push('tag-suggestions-open-on-focus')
    await expectPageAction('open category dropdown', pageFns.openDropdownByLabel, '类别')
    const categoryDropdownMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getOpenDropdownMetrics)
      if (metrics?.rounded && metrics?.customMenu && metrics?.optionCount >= 2) return metrics
      return null
    }, 10000, 200)
    report.checks.push('form-dropdowns-rounded')
    await expectPageAction('select create category option for smoke resource', pageFns.clickListboxOption, '+ 新增类别')
    await waitFor(async () => {
      const visible = await page.evaluate(pageFns.hasInputByPlaceholder, '输入新类别名称')
      return visible ? true : null
    }, 10000, 200)
    await expectPageAction('set smoke category name', pageFns.setInputByPlaceholder, '输入新类别名称', 'UI Smoke Category')
    await expectPageAction('submit smoke category with enter', pageFns.submitInputByPlaceholder, '输入新类别名称')
    await waitFor(async () => {
      const visible = await page.evaluate(pageFns.hasInputByPlaceholder, '输入新类别名称')
      return visible ? null : true
    }, 10000, 200)
    await expectPageAction('resource name', pageFns.setInputBySelector, '[data-rh-resource-name-input]', 'UI Smoke Resource')
    await expectPageAction('resource url', pageFns.setInputBySelector, '[data-rh-resource-url-input]', 'https://example.com/ui-smoke')
    await expectPageAction('resource description', pageFns.setInputBySelector, '[data-rh-resource-description-input]', 'Created by browser acceptance')
    await expectPageAction('add smoke tag', pageFns.addTagBySelector, '[data-rh-tag-input]', 'ui-smoke-tag')
    await expectPageAction('save resource', pageFns.clickButtonByText, '保存')
    await page.waitFor(() => document.body.innerText.includes('UI Smoke Resource'))
    report.checks.push('resource-created-via-ui')

    await expectPageAction('search resource', pageFns.setInputByPlaceholder, '搜索资源名称、描述、标签... (Ctrl+K)', 'UI Smoke Resource')
    await page.waitFor(() => document.body.innerText.includes('UI Smoke Resource'))
    report.checks.push('resource-search-works')

    await expectPageAction('clear resource search', pageFns.setInputByPlaceholder, '搜索资源名称、描述、标签... (Ctrl+K)', '')
    await waitForHomeReady()

    await selectTheme('dark')
    const darkChipMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getDarkChipMetrics)
      if (metrics?.categoryBorderVisible && metrics?.quickAccessReadable && metrics?.noInsetGlow && metrics?.quickAccessSelectVisible) return metrics
      return null
    }, 10000, 200)
    report.checks.push('dark-chip-outline-strengthened')
    await expectPageAction('set admin card view', pageFns.clickViewMode, 'card')
    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getUiPreferenceSnapshot)
      return snapshot?.viewMode === 'card' ? snapshot : null
    }, 10000, 200)
    await expectPageAction('open admin sort menu', pageFns.toggleSortMenu)
    await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getSortMenuMetrics)
      return metrics?.menuVisible ? metrics : null
    }, 10000, 200)
    await expectPageAction('select admin hot sort option', pageFns.clickSortOption, '按热度')
    await expectPageAction('select mine quick access for admin', pageFns.clickQuickAccess, 'mine')
    await waitFor(async () => {
      const title = await page.evaluate(pageFns.getHomeHeadingTitle)
      return title === '我创建的' ? title : null
    }, 10000, 200)
    await expectPageAction('filter mine quick access by category', pageFns.clickHomeCategory, 'UI Smoke Category')
    await expectPageAction('expand sidebar tags for stacked filter', pageFns.expandHomeTagsIfNeeded)
    await expectPageAction('filter mine quick access by smoke tag', pageFns.clickHomeTag, 'ui-smoke-tag')
    await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getDesktopHeadingFilterMetrics)
      if (
        metrics?.resultsMode &&
        metrics?.clearInToolbar &&
        metrics?.desktopToolbarVisible &&
        metrics?.metricCardsHidden &&
        metrics?.summaryShowsResultContext &&
        metrics?.summaryAvoidsControlDuplication &&
        metrics?.redundantQuickAccessHidden &&
        metrics?.filtersShowCategory &&
        metrics?.filtersShowTag &&
        metrics?.filteredGridCondensed &&
        metrics?.activeQuickAccess === 'mine' &&
        metrics?.activeCategoryLabel.includes('UI Smoke Category') &&
        metrics?.activeTagValue === 'ui-smoke-tag' &&
        metrics?.resourceCount === 1 &&
        metrics?.includesSmokeResource
      ) return metrics
      return null
    }, 10000, 200)
    report.checks.push('home-heading-clear-action-appears')
    report.checks.push('quick-access-category-tag-stack')
    await expectPreferenceSnapshot({
      theme: 'dark',
      viewMode: 'card',
      sortLabel: '按热度',
      quickAccess: 'mine',
      hasPreferenceStore: true,
    })
    await page.navigate(`${appUrl}/#/`)
    await waitForHomeReady()
    await expectPreferenceSnapshot({
      theme: 'dark',
      viewMode: 'card',
      sortLabel: '按热度',
      quickAccess: 'mine',
    })
    report.checks.push('admin-preferences-restored-after-refresh')

    await logoutToGuestHome()
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'list',
      sortLabel: '按更新时间',
      quickAccess: null,
    })
    report.checks.push('guest-preferences-restored-after-logout')

    await loginAndWait('admin_ui', 'AdminUi123')
    await expectPreferenceSnapshot({
      theme: 'dark',
      viewMode: 'card',
      sortLabel: '按热度',
      quickAccess: 'mine',
    })
    report.checks.push('admin-preferences-restored-after-login')

    await expectPageAction('reset admin quick access filter', pageFns.clickQuickAccess, 'mine')
    await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getDesktopHeadingFilterMetrics)
      return metrics?.resultsMode && metrics?.clearInToolbar && metrics?.metricCardsHidden && metrics?.summaryShowsResultContext && metrics?.summaryAvoidsControlDuplication && metrics?.filteredGridCondensed && metrics?.activeQuickAccess === null && metrics?.activeCategoryLabel.includes('UI Smoke Category') && metrics?.activeTagValue === 'ui-smoke-tag' ? metrics : null
    }, 10000, 200)
    await expectPageAction('clear stacked filters from toolbar', pageFns.clickSelector, '[data-rh-heading-clear-filters]')
    await waitForHomeMode('overview', '资源导航')
    await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getDesktopOverviewMetrics)
      return metrics?.overviewMode && metrics?.browseAllVisible && metrics?.sidebarHidden ? metrics : null
    }, 10000, 200)
    report.checks.push('home-heading-clear-action-hides')
    await expectPreferenceSnapshot({
      theme: 'dark',
      viewMode: 'card',
      sortLabel: '按热度',
      quickAccess: null,
    })

    log('resource-created')
    await page.evaluate(pageFns.setHash, '#/admin')
    await waitForText(page, '后台管理')
    const adminHeaderMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getAdminHeaderMetrics)
      return metrics?.searchHidden ? metrics : null
    }, 10000, 200)
    report.checks.push('admin-search-hidden')
    await expectPageAction('open system config tab', pageFns.clickTabByText, '系统配置')
    await waitForText(page, '站点标题')
    await expectPageAction('set site title', pageFns.setFieldByLabel, '站点标题', 'ResourceHub UI Acceptance')
    await expectPageAction('set site subtitle', pageFns.setFieldByLabel, '站点副标题', 'Browser checked')
    await expectPageAction('save system config', pageFns.clickButtonByText, '保存配置')
    await page.waitFor(() => document.body.innerText.includes('系统配置已保存'))
    const headerTitle = await page.evaluate(pageFns.getHeaderTitle)
    if (!headerTitle.includes('ResourceHub UI Acceptance')) throw new Error(`Header title did not update after config save: ${headerTitle}`)
    report.checks.push('admin-config-saved-via-ui')

    log('config-saved')
    await expectPageAction('open users tab', pageFns.clickTabByText, '用户管理')
    await waitForText(page, '新增用户')
    await expectPageAction('open create user modal', pageFns.clickButtonByText, '新增用户')
    await waitForText(page, '初始密码')
    await expectPageAction('new user username', pageFns.setFieldByLabel, '用户名', 'ui_user')
    await expectPageAction('new user display name', pageFns.setFieldByLabel, '显示名称', 'UI User')
    await expectPageAction('new user email', pageFns.setFieldByLabel, '邮箱', 'ui.user@example.com')
    await expectPageAction('new user initial password', pageFns.setFieldByLabel, '初始密码', 'UiUser123')
    await expectPageAction('save new user', pageFns.clickButtonByText, '保存')
    await page.waitFor(() => document.body.innerText.includes('UI User'))
    report.checks.push('admin-create-user-via-ui')

    await expectPageAction('open admin create user modal', pageFns.clickButtonByText, '新增用户')
    await waitForText(page, '初始密码')
    await expectPageAction('open role dropdown', pageFns.openDropdownByLabel, '角色')
    const roleDropdownMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getOpenDropdownMetrics)
      if (metrics?.rounded && metrics?.customMenu && metrics?.optionCount >= 2) return metrics
      return null
    }, 10000, 200)
    await expectPageAction('open profile modal', pageFns.clickSelector, '[data-rh-user-trigger]')
    await expectPageAction('click profile menu', pageFns.clickButtonByText, '个人信息')
    await waitForText(page, '注册时间')
    await expectPageAction('close profile modal', pageFns.clickButtonByText, '关闭')
    await expectPageAction('open user menu for password modal', pageFns.clickSelector, '[data-rh-user-trigger]')
    await expectPageAction('click change password menu', pageFns.clickButtonByText, '修改密码')
    await waitForText(page, '确认新密码')
    await expectPageAction('close change password modal', pageFns.clickButtonByText, '取消')

    log('user-created')
    await page.setViewport(390, 844, false)
    const overflowInfo = await page.evaluate(pageFns.tableOverflowInfo)
    if (!overflowInfo?.hasOverflow) throw new Error(`Expected table overflow on mobile admin view, got ${JSON.stringify(overflowInfo)}`)
    await page.screenshot('03-admin-mobile.png')
    report.checks.push('admin-mobile-overflow-confirmed')

    log('open-setup')
    log('admin-mobile-confirmed')
    await page.setViewport(1440, 900, false)
    await page.evaluate(pageFns.setHash, '#/forgot-password')
    await waitForText(page, '忘记密码')
    await expectPageAction('forgot password email', pageFns.setInputByPlaceholder, 'your@example.com', 'ui.user@example.com')
    await expectPageAction('send reset link', pageFns.clickButtonByText, '发送重置链接')
    await waitForText(page, '模拟邮件（开发预览）')
    const token = await page.evaluate(pageFns.extractResetToken)
    if (!token) throw new Error('Failed to extract reset token from email preview')
    await expectPageAction('close email preview', pageFns.clickButtonByText, '关闭')
    report.checks.push('forgot-password-email-preview-shown')

    await page.evaluate(pageFns.setHash, `#/reset-password?token=${token}`)
    await waitForText(page, '设置新密码')
    await expectPageAction('reset password', pageFns.setInputByPlaceholder, '至少8位，含字母和数字', 'UiUser456')
    await expectPageAction('reset confirm password', pageFns.setInputByPlaceholder, '再次输入新密码', 'UiUser456')
    await expectPageAction('submit reset password', pageFns.clickButtonByText, '重置密码')
    await page.waitFor(() => window.location.hash === '#/login')
    await waitForText(page, '用户名')
    report.checks.push('reset-password-flow-completed')

    log('password-reset-done')
    await loginAndWait('ui_user', 'UiUser456')
    report.checks.push('login-with-reset-password-completed')

    await selectTheme('light')
    await enterBrowseAllResults('全部资源')
    await expectPageAction('set ui user card view', pageFns.clickViewMode, 'card')
    await waitFor(async () => {
      const snapshot = await page.evaluate(pageFns.getUiPreferenceSnapshot)
      return snapshot?.viewMode === 'card' ? snapshot : null
    }, 10000, 200)
    await expectPageAction('open ui user sort menu', pageFns.toggleSortMenu)
    await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getSortMenuMetrics)
      return metrics?.menuVisible ? metrics : null
    }, 10000, 200)
    await expectPageAction('select ui user updated sort option', pageFns.clickSortOption, '按更新时间')
    await expectPageAction('select mine quick access', pageFns.clickQuickAccess, 'mine')
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'card',
      sortLabel: '按更新时间',
      quickAccess: 'mine',
    })
    await page.navigate(`${appUrl}/#/`)
    await waitForHomeReady()
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'card',
      sortLabel: '按更新时间',
      quickAccess: 'mine',
    })
    report.checks.push('user-preferences-restored-after-refresh')

    await logoutToGuestHome()
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'list',
      sortLabel: '按更新时间',
      quickAccess: null,
    })
    report.checks.push('guest-preferences-restored-after-user-logout')

    await loginAndWait('ui_user', 'UiUser456')
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'card',
      sortLabel: '按更新时间',
      quickAccess: 'mine',
    })
    report.checks.push('user-preferences-restored-after-login')

    await expectPageAction('reset ui user quick access filter', pageFns.clickQuickAccess, 'mine')
    await expectPreferenceSnapshot({
      theme: 'light',
      viewMode: 'card',
      sortLabel: '按更新时间',
      quickAccess: null,
    })

    log('login-reset-done')
    await enterBrowseAllResults('全部资源')
    await page.setViewport(390, 844, false)
    await page.evaluate(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
    await page.waitFor(() => window.scrollY === 0)
    const layoutMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getMobileHomeMetrics)
      if (
        metrics?.resultsMode &&
        metrics?.singleSearch &&
        metrics?.noHero &&
        metrics?.noLegacyTagRow &&
        metrics?.drawerClosed &&
        metrics?.firstBlockIsBrowser &&
        metrics?.browserAboveFold &&
        metrics?.toolbarVisible &&
        metrics?.mobileFilterVisible &&
        metrics?.firstResourceVisible &&
        metrics?.noHorizontalOverflow
      ) return metrics
      return null
    }, 10000, 200)
    await expectPageAction('open mobile home drawer', pageFns.toggleHomeSidebarDrawer)
    const mobileDrawerMetrics = await waitFor(async () => {
      const metrics = await page.evaluate(pageFns.getHomeSidebarDrawerMetrics)
      if (
        metrics?.drawerVisible &&
        metrics?.hasQuickAccessSection &&
        metrics?.hasCategorySection &&
        metrics?.hasTagSection &&
        metrics?.directQuickAccessMenu &&
        metrics?.directCategoryMenu
      ) return metrics
      return null
    }, 10000, 200)
    await expectPageAction('close mobile home drawer', pageFns.clickSelector, '[data-rh-home-sidebar-drawer] [aria-label="关闭导航遮罩"]')
    await page.waitFor(() => !document.querySelector('[data-rh-home-sidebar-drawer]'))
    await page.screenshot('04-home-mobile.png')
    report.checks.push('home-mobile-layout-confirmed')
    report.checks.push('home-sidebar-mobile-drawer-confirmed')

    log('home-mobile-confirmed')
    writeFileSync(join(artifactsDir, 'report.json'), JSON.stringify(report, null, 2))
    console.log('Browser acceptance passed')
    console.log(JSON.stringify(report, null, 2))

    await page.close()
  } finally {
    killTree(browser)
    if (server) killTree(server.child)
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})














