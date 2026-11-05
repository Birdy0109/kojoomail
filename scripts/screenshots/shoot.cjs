// 给 README 拍界面截图：用 mock.js 的演示数据冒充后端，在 Chrome 里打开构建好的界面截图
//   node node_modules/vite/bin/vite.js build && NODE_PATH=tests/e2e/node_modules node scripts/screenshots/shoot.cjs [输出目录]
// 默认输出到 docs/images/screens/（2 倍像素）；英文界面：环境变量 DEMO_LANG=en，默认输出到 docs/images/screens-en/
const { chromium } = require('playwright-core')
const http = require('http')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const dist = path.join(root, 'dist')
const LANG = process.env.DEMO_LANG === 'en' ? 'en' : 'zh'
const X = (zh, en) => (LANG === 'en' ? en : zh)
const out = process.argv[2] || path.join(root, X('docs/images/screens', 'docs/images/screens-en')) // 原始截图，不进 git
fs.mkdirSync(out, { recursive: true })
const mock = fs.readFileSync(path.join(__dirname, 'mock.js'), 'utf8')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p === '/') p = '/index.html'
  const f = path.join(dist, p)
  if (!f.startsWith(dist) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})

;(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}/`
  const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const open = async (theme) => {
    const page = await browser.newPage({ viewport: { width: 1360, height: 820 }, deviceScaleFactor: 2, colorScheme: theme, locale: X('zh-CN', 'en-US') })
    // 浏览器时钟固定在今天中午：半夜拍也是白天的问候语和时间
    await page.clock.setFixedTime(new Date(new Date().setHours(12, 0, 0, 0)))
    // 界面语言在页面加载时就读 localStorage，先写好
    await page.addInitScript(`localStorage.setItem('kjm-lang', ${JSON.stringify(LANG)});window.__DEMO_LANG__=${JSON.stringify(LANG)};window.__DEMO_THEME__=${JSON.stringify(theme)};\n${mock}`)
    await page.goto(url)
    await page.waitForSelector('[data-id]')
    await page.waitForTimeout(300)
    return page
  }
  const shot = async (page, name) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(out, `${name}.png`) }); console.log(name) }

  // 1. 统一收件箱 + AI 批注
  let page = await open('light')
  await page.click('[data-id="100"]')
  await page.waitForSelector('.facts')
  await shot(page, 'inbox')
  // 2. AI 起草的回复填进写信窗口
  await page.click(`button:has-text("${X('填入回复', 'Use reply')}")`)
  await page.waitForSelector('textarea, [contenteditable="true"]')
  await shot(page, 'compose')
  await page.close()

  // 3. 今日简报
  page = await open('light')
  await page.click(`button.nav:has-text("${X('今日简报', "Today's digest")}")`)
  await page.waitForTimeout(400)
  await shot(page, 'digest')
  // 4. 待办
  await page.click(`button.nav:has-text("${X('待办', 'To-dos')}")`)
  await page.waitForTimeout(400)
  await shot(page, 'todo')
  await page.close()

  // 5. 深色
  page = await open('dark')
  await page.click('[data-id="102"]')
  await page.waitForTimeout(400)
  await shot(page, 'dark')
  await page.close()

  await browser.close()
  server.close()
})().catch((e) => { console.error(e); process.exit(1) })
