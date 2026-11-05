import { L } from './i18n'
// 运行在哪个系统上：Mac 用系统的红绿灯窗口按钮，快捷键显示 ⌘，说明文字换成 Mac 的叫法
export const IS_MAC = /Macintosh|Mac OS X/.test(navigator.userAgent)
/** 把说明文字里的 Ctrl、Del 换成当前系统的按键 */
export const keyText = (t: string) => (IS_MAC ? t.replace(/Ctrl ?/g, '⌘').replace(/\bDel\b/g, '⌫') : t)
/** 程序在后台时图标在哪 */
export const TRAY = IS_MAC ? L('菜单栏', 'menu bar') : L('托盘', 'tray')
/** 密码存在哪 */
export const VAULT = IS_MAC ? L('系统钥匙串', 'Keychain') : L('Windows 凭据管理器', 'Windows Credential Manager')
export const DATA_DIR = IS_MAC ? '~/Library/Application Support/KojooMail' : '%APPDATA%\\KojooMail'
