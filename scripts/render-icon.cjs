// 把 design/icon/ 里的两个 SVG 渲染成各尺寸 PNG（用本机 Chrome，浏览器直接按目标尺寸栅格化，比缩小大图清楚）
//   NODE_PATH=tests/e2e/node_modules node scripts/render-icon.cjs
// 产物：design/icon/png/（full-*.png 完整版、small-*.png 小尺寸版）、design/app-icon-1024.png（给 tauri icon 用）、
//       src/assets/ 和 site/ 里界面、网页用的图标。之后跑 `tauri icon design/app-icon-1024.png`，再跑 scripts/make-ico.py
const { chromium } = require('playwright-core')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const svg = (name) => fs.readFileSync(path.join(root, 'design/icon', name), 'utf8')
const FULL = svg('icon.svg')
const SMALL = svg('icon-small.svg')
const out = path.join(root, 'design/icon/png')
fs.mkdirSync(out, { recursive: true })

const jobs = [
  ...[1024, 512, 256, 128, 64, 48].map((n) => [FULL, n, path.join(out, `full-${n}.png`)]),
  ...[32, 24, 16].map((n) => [SMALL, n, path.join(out, `small-${n}.png`)]),
  [FULL, 1024, path.join(root, 'design/app-icon-1024.png')],
  [FULL, 128, path.join(root, 'src/assets/app-icon@2x.png')], // 欢迎页（64px 显示）
  [SMALL, 44, path.join(root, 'src/assets/app-icon-22@2x.png')], // 标题栏
  [SMALL, 68, path.join(root, 'site/icon.png')], // 官网 / 隐私页左上角（30px 显示，用简化版）
  [SMALL, 64, path.join(root, 'site/favicon.png')],
]

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  // 视口固定大一点再按尺寸裁：太小的视口截图会卡住
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } })
  for (const [src, n, file] of jobs) {
    const sized = src.replace('width="1024" height="1024"', `width="${n}" height="${n}"`)
    await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`)
    await page.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: n, height: n } })
    console.log(n, path.relative(root, file))
  }
  await browser.close()
})()
