// 确认框。dialog 插件会把 window.confirm 换成异步版本（返回 Promise，同步判断永远为真，点取消也照样执行），
// 所以代码里不要直接用 confirm()，一律 `if (!(await ask(...))) return`
import { message } from '@tauri-apps/plugin-dialog'

const OK = '确定'

export async function ask(text: string): Promise<boolean> {
  const r = await message(text, { title: 'Kojoo Mail', kind: 'warning', buttons: { ok: OK, cancel: '取消' } })
  // 自定义按钮时系统一般返回按钮上的字；退回系统标准弹框时返回 'Ok'。关掉弹框、按 Esc 都算取消
  return r === OK || r === 'Ok'
}
