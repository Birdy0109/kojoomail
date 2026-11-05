// 把 shoot.cjs 拍的界面截图排成 README 用的图：封面（浅色/深色）和带窗口边框的功能图
//   NODE_PATH=tests/e2e/node_modules node scripts/screenshots/frame.cjs [截图目录] [输出目录]
// 默认读 docs/images/screens/，输出到 docs/images/
const { chromium } = require('playwright-core')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '../..')
const src = process.argv[2] || path.join(root, 'docs/images/screens')
const out = process.argv[3] || path.join(root, 'docs/images')
fs.mkdirSync(out, { recursive: true })
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')
const shot = (n) => b64(path.join(src, `${n}.png`))
const icon = b64(path.join(root, 'design/icon/png/full-256.png'))
const serif = 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'src/assets/instrument-serif-italic.woff2')).toString('base64')

const THEMES = {
  light: { bg: '#F3EDE2', bg2: '#E9DFCC', ink: '#1B1712', sec: '#6B5F4E', line: 'rgba(60,45,25,.14)', chip: 'rgba(255,255,255,.55)', accent: '#C63E1F', frame: '#FBF8F2' },
  dark: { bg: '#15181D', bg2: '#0E1014', ink: '#F2EDE4', sec: '#A69C8C', line: 'rgba(255,255,255,.10)', chip: 'rgba(255,255,255,.06)', accent: '#E8653F', frame: '#1C2026' },
}

const base = (t) => `
@font-face { font-family: "Instrument Serif"; font-style: italic; src: url(${serif}) format("woff2"); }
* { box-sizing: border-box; margin: 0; }
body { min-width: 1600px; background: ${t.bg}; color: ${t.ink}; font-family: "Noto Sans SC", "Microsoft YaHei", sans-serif; -webkit-font-smoothing: antialiased; }
.paper { position: relative; overflow: hidden; background:
  radial-gradient(1200px 700px at 85% 10%, ${t.bg} 0%, transparent 70%),
  radial-gradient(900px 600px at 0% 100%, ${t.bg2} 0%, transparent 70%), ${t.bg}; }
.paper::after { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .5; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .4 0 0 0 0 .33 0 0 0 0 .22 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)'/%3E%3C/svg%3E"); }
.win { border-radius: 14px; overflow: hidden; background: ${t.frame}; border: 1px solid ${t.line};
  box-shadow: 0 1px 0 rgba(255,255,255,.4) inset, 0 40px 80px -30px rgba(40,25,10,.45), 0 18px 36px -18px rgba(40,25,10,.30); }
.win img { display: block; width: 100%; }
`

const TEXT = {
  zh: { h1: '所有邮箱，<br><em>一个</em>收件箱。', sub: 'QQ、网易、Gmail、Outlook、iCloud、企业邮统一收发。AI 帮你读信、标重点、列待办、起草回复，发不发由你决定。',
    chips: ['Windows', 'macOS', '邮件只存在本机', '自带 AI 密钥', '开源 · AGPL-3.0'], rule: 'All your mailboxes, one inbox.' },
  en: { h1: 'All your mailboxes,<br><em>one</em> inbox.', sub: 'Gmail, Outlook, iCloud, QQ, NetEase and any IMAP account in one place. AI reads each email, flags what matters, lists to-dos and drafts replies. You decide what gets sent.',
    chips: ['Windows', 'macOS', 'Mail stays on your device', 'Bring your own AI key', 'Open source · AGPL-3.0'], rule: '' },
}
const hero = (t, img, lang = 'zh') => { const x = TEXT[lang]; return `<html><head><style>${base(t)}
.paper { height: 900px; padding: 92px 0 0 96px; }
.icon { width: 112px; height: 112px; display: block; margin-left: -10px; filter: drop-shadow(0 14px 22px rgba(80,40,10,.25)); }
.brand { margin-top: 26px; font: italic 400 34px "Instrument Serif", serif; color: ${t.sec}; letter-spacing: .01em; }
h1 { margin-top: 10px; font: 700 64px/1.18 "Noto Serif SC", serif; letter-spacing: -.01em; }
h1 em { font-style: normal; color: ${t.accent}; }
h1.en { font: italic 400 72px/1.08 "Instrument Serif", serif; letter-spacing: -.005em; }
h1.en em { font-style: italic; }
.sub { margin-top: 22px; width: 470px; font-size: 19px; line-height: 1.75; color: ${t.sec}; }
.chips { margin-top: 30px; display: flex; gap: 10px; flex-wrap: wrap; width: 360px; }
.chips span { padding: 7px 14px; border-radius: 999px; font-size: 14px; background: ${t.chip}; border: 1px solid ${t.line}; color: ${t.ink}; }
.win { position: absolute; left: 640px; top: 96px; width: 1160px; }
.rule { position: absolute; left: 96px; bottom: 64px; font: italic 400 20px "Instrument Serif", serif; color: ${t.sec}; opacity: .8; }
</style></head><body><div class="paper">
<img class="icon" src="${icon}">
<div class="brand">Kojoo Mail</div>
<h1${lang === 'en' ? ' class="en"' : ''}>${x.h1}</h1>
<div class="sub">${x.sub}</div>
<div class="chips"${lang === 'en' ? ' style="width: 480px"' : ''}>${x.chips.map((c) => `<span>${c}</span>`).join('')}</div>
${x.rule ? `<div class="rule">${x.rule}</div>` : ''}
<div class="win"><img src="${img}"></div>
</div></body></html>` }

// 分享预览图（GitHub Settings → Social preview 手动上传，1280×640）
const social = (t, img) => `<html><head><style>${base(t)}
body { min-width: 0; }
.paper { width: 1280px; height: 640px; padding: 70px 0 0 72px; }
.icon { width: 76px; height: 76px; display: block; margin-left: -6px; filter: drop-shadow(0 10px 16px rgba(80,40,10,.25)); }
.brand { margin-top: 16px; font: italic 400 28px "Instrument Serif", serif; color: ${t.sec}; }
h1 { margin-top: 6px; font: 700 50px/1.2 "Noto Serif SC", serif; letter-spacing: -.01em; }
h1 em { font-style: normal; color: ${t.accent}; }
.en { margin-top: 14px; font: italic 400 30px "Instrument Serif", serif; color: ${t.sec}; }
.chips { position: absolute; left: 72px; bottom: 64px; display: flex; gap: 8px; flex-wrap: wrap; width: 400px; }
.chips span { padding: 5px 12px; border-radius: 999px; font-size: 13px; background: ${t.chip}; border: 1px solid ${t.line}; }
.win { position: absolute; left: 540px; top: 70px; width: 900px; }
</style></head><body><div class="paper">
<img class="icon" src="${icon}">
<div class="brand">Kojoo Mail</div>
<h1>所有邮箱，<br><em>一个</em>收件箱。</h1>
<div class="en">All your mailboxes, one inbox.</div>
<div class="chips"><span>Windows · macOS</span><span>AI 读信、列待办、起草回复</span><span>邮件只存在本机</span><span>开源 · AGPL-3.0</span></div>
<div class="win"><img src="${img}"></div>
</div></body></html>`

// 功能图：截图放在纸色底上；crop = [x, y, w, h]（截图的 CSS 像素，截图本身是 1360×820）
const feature = (t, img, crop) => {
  const [x, y, w, h] = crop || [0, 0, 1360, 820]
  const W = w, scale = 1 // 不放大，免得糊
  return `<html><head><style>${base(t)}
.paper { display: inline-block; padding: 56px 64px; }
.win { width: ${W}px; height: ${Math.round(h * scale)}px; position: relative; }
.win img { position: absolute; width: ${Math.round(1360 * scale)}px; left: ${-Math.round(x * scale)}px; top: ${-Math.round(y * scale)}px; }
</style></head><body><div class="paper"><div class="win"><img src="${img}"></div></div></body></html>`
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 })
  const render = async (html, name) => {
    await page.setContent(html)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(200)
    const el = await page.$('.paper')
    await el.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 88 })
    console.log(name)
  }
  await render(hero(THEMES.light, shot('inbox')), 'hero-light')
  await render(hero(THEMES.dark, shot('dark')), 'hero-dark')
  await render(hero(THEMES.light, shot('inbox'), 'en'), 'hero-light-en')
  await render(hero(THEMES.dark, shot('dark'), 'en'), 'hero-dark-en')
  await page.setViewportSize({ width: 1280, height: 640 })
  await render(social(THEMES.light, shot('inbox')), 'social-preview')
  await page.setViewportSize({ width: 1600, height: 900 })
  await render(feature(THEMES.light, shot('inbox'), [600, 44, 760, 776]), 'feature-ai')
  await render(feature(THEMES.light, shot('digest')), 'feature-digest')
  await render(feature(THEMES.light, shot('compose')), 'feature-compose')
  await render(feature(THEMES.light, shot('todo')), 'feature-todo')
  await render(feature(THEMES.dark, shot('dark')), 'feature-dark')
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
