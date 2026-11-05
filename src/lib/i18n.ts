// 界面语言：设置里的 language = auto | zh | en；auto 看系统语言（中文系统用中文，其他用英文）。
// 写法：L('中文', 'English')，中英文写在一起，改文案时两边一起改。
// 语言在页面加载时就要确定（不少文案是模块级常量），所以用 localStorage 记住上次的结果；
// 启动拿到设置后如果和记住的不一样，记下新的并重新加载页面（只在改语言时发生一次）。
// 这个文件不能 import 别的模块：它要最先求值。

export type Lang = 'zh' | 'en'
export type LangPref = 'auto' | Lang

const KEY = 'kjm-lang'

// 第一次启动、还没记住时的猜测；拿到后端的结果后以后端为准
const systemLang = (): Lang => (/^zh\b/i.test(navigator.language || '') ? 'zh' : 'en')

const read = (): Lang => {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'zh' || v === 'en') return v
  } catch { /* 读不到就按系统 */ }
  return systemLang()
}

export const LANG: Lang = read()
export const EN = LANG === 'en'
document.documentElement.lang = EN ? 'en' : 'zh-CN'

/** 按当前语言二选一 */
export const L = (zh: string, en: string) => (EN ? en : zh)

/** 后端定的界面语言（「跟随系统」也由后端判断，前后端不会不一致）和当前显示的不一样时：记下来并重新加载。
 *  返回 true 表示即将重新加载。记不住（存储不可用）就不重新加载，否则会一直刷新 */
export function syncLang(want: Lang): boolean {
  if (want === LANG) return false
  try {
    localStorage.setItem(KEY, want)
    if (localStorage.getItem(KEY) !== want) return false
  } catch { return false }
  location.reload()
  return true
}

/** 数量 + 名词：英文按单复数（1 email / 2 emails），中文原样拼 */
export const plural = (n: number, zh: string, one: string, many = one + 's') => (EN ? `${n} ${n === 1 ? one : many}` : `${n} ${zh}`)

/** AI 分类存的是中文标识（询盘、账单…），显示时按语言换 */
const CAT_EN: Record<string, string> = { 询盘: 'Inquiry', 待办: 'To-do', 账单: 'Bill', 通知: 'Notification', 订阅: 'Newsletter', 个人: 'Personal', 其他: 'Other' }
export const catLabel = (c: string) => (EN ? CAT_EN[c] ?? c : c)
