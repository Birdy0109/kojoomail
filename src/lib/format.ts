import type { Account, Addr } from './api'
import { EN, L } from './i18n'

const pad = (n: number) => String(n).padStart(2, '0')
const WEEK_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const weekday = (d: Date) => (EN ? WEEK_EN : WEEK_ZH)[d.getDay()]
/** 月-日（英文 Nov 4） */
const monthDay = (d: Date) => (EN ? `${MON_EN[d.getMonth()]} ${d.getDate()}` : `${d.getMonth() + 1}-${pad(d.getDate())}`)

/** 列表里的时间：今天显示时刻，昨天显示「昨天」，一周内显示星期，再早显示日期 */
export function shortTime(ts: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86400000)
  if (diff === 0) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (diff === 1) return L('昨天', 'Yesterday')
  if (diff < 7 && diff > 0) return weekday(d)
  if (d.getFullYear() === now.getFullYear()) return monthDay(d)
  return EN ? `${MON_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fullTime(ts: number) {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 分组标题：今天 / 昨天 / 本周 / 更早 */
export function dayGroup(ts: number) {
  const d = new Date(ts * 1000)
  const now = new Date()
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86400000)
  if (diff <= 0) return L('今天', 'Today')
  if (diff === 1) return L('昨天', 'Yesterday')
  if (diff < 7) return L('本周', 'This week')
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return L('本月', 'This month')
  return L('更早', 'Earlier')
}

export function ago(ts: number) {
  const s = Date.now() / 1000 - ts
  if (s < 60) return L('刚刚', 'Just now')
  if (s < 3600) return L(`${Math.floor(s / 60)} 分钟前`, `${Math.floor(s / 60)} min ago`)
  if (s < 86400) return L(`${Math.floor(s / 3600)} 小时前`, `${Math.floor(s / 3600)} h ago`)
  const n = Math.floor(s / 86400)
  return L(`${n} 天前`, `${n} ${n === 1 ? 'day' : 'days'} ago`)
}

export function dueLabel(ts: number | null) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 86400000)
  if (diff < 0) return diff === -1 ? L('昨天到期', 'Due yesterday') : L(`逾期 ${-diff} 天`, `${-diff} days overdue`)
  if (diff === 0) return d.getHours() === 18 && d.getMinutes() === 0 ? L('今天', 'Today') : `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (diff === 1) return L('明天', 'Tomorrow')
  if (diff < 7) return weekday(d)
  return monthDay(d)
}

export const size = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`)

const PALETTE = [
  ['#F3E3DC', '#9A3216'], ['#DCE5F0', '#1B4A80'], ['#E0ECE4', '#2F6447'], ['#ECE2F0', '#6B3F7E'],
  ['#F2EAD3', '#7A5500'], ['#E3E6EA', '#3A4552'],
]
const PALETTE_DARK = [
  ['#3A2620', '#F2A487'], ['#1E2C3E', '#9DBFEE'], ['#1D3027', '#7CC39C'], ['#2E2234', '#C9A4D8'],
  ['#332A16', '#E7B84A'], ['#262B33', '#C4CBD4'],
]
export function avatarColors(seed: string, dark: boolean) {
  let h = 0
  for (const c of seed.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const p = dark ? PALETTE_DARK : PALETTE
  return p[h % p.length]
}

export function initials(name: string, email: string) {
  const n = (name || email.split('@')[0] || '?').trim()
  const cjk = n.match(/[一-鿿]/)
  if (cjk) return cjk[0]
  const words = n.split(/[\s._-]+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

export const who = (a: { fromName: string; fromAddr: string }) => a.fromName || a.fromAddr
export const addrText = (a: Addr) => (a.name ? `${a.name} <${a.email}>` : a.email)
export const accountLabel = (a: Account) => a.label || a.email

export const ACCOUNT_COLORS = ['#D4441F', '#1B4A80', '#3E7C5A', '#8A5A9E', '#A86A00', '#4E5866']

export function parseAddrs(s: string): Addr[] {
  return s
    .split(/[,;，；\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const m = x.match(/^(.*)<([^>]+)>$/)
      if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim() }
      return { name: '', email: x }
    })
}

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
