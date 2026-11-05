// 常见邮箱的服务器设置。Gmail、Outlook 支持一键登录（OAuth）；QQ、网易、iCloud 不对第三方开放，只能用授权码
import { L } from './i18n'
export type Provider = {
  id: string; name: string; glyph: string; method: string
  imapHost: string; imapPort: number; smtpHost: string; smtpPort: number; smtpTls: boolean
  saveSent: boolean; domains: string[]; codeLabel: string; help: string; helpUrl?: string
  /** helpUrl 按钮的文字（默认「如何获取…？」） */
  helpLabel?: string
  /** 不在选择列表里出现，只在输入这个域名的邮箱时自动识别 */
  hidden?: boolean
  /** 支持一键登录（还要这个版本配了客户端 ID，见 store.oauth） */
  oauth?: { brand: string }
}

export const PROVIDERS: Provider[] = [
  {
    id: 'qq', name: L('QQ 邮箱', 'QQ Mail'), glyph: 'QQ', method: L('授权码', 'App password'), imapHost: 'imap.qq.com', imapPort: 993, smtpHost: 'smtp.qq.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['qq.com', 'foxmail.com', 'vip.qq.com'], codeLabel: L('授权码', 'app password'),
    help: L('在 QQ 邮箱网页版「设置 → 账号」里开启 IMAP/SMTP 服务后生成，不是 QQ 密码。', 'In QQ Mail on the web, go to Settings → Accounts (设置 → 账号), turn on the IMAP/SMTP service and generate an app password (授权码). It is not your QQ password.'), helpUrl: 'https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode',
  },
  {
    id: '163', name: L('网易邮箱', 'NetEase 163 Mail'), glyph: '163', method: L('授权码', 'App password'), imapHost: 'imap.163.com', imapPort: 993, smtpHost: 'smtp.163.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['163.com'], codeLabel: L('授权码', 'app password'), help: L('登录网易邮箱网页版，点顶部「设置 → POP3/SMTP/IMAP」，开启「IMAP/SMTP 服务」，按提示发一条短信验证后会显示授权码（只显示一次，记下来）。忘了可以关掉再开一次重新生成。', 'Sign in to 163 Mail on the web, click Settings → POP3/SMTP/IMAP (设置 → POP3/SMTP/IMAP) at the top and turn on the IMAP/SMTP service (IMAP/SMTP 服务). After you verify with a text message, an app password (授权码) is shown once; write it down. If you lose it, turn the service off and on again to get a new one.'),
    helpUrl: 'https://mail.163.com', helpLabel: L('打开网易邮箱网页版', 'Open 163 Mail on the web'),
  },
  {
    id: '126', name: L('126 邮箱', 'NetEase 126 Mail'), glyph: '126', method: L('授权码', 'App password'), imapHost: 'imap.126.com', imapPort: 993, smtpHost: 'smtp.126.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['126.com'], codeLabel: L('授权码', 'app password'), help: L('登录 126 邮箱网页版，点顶部「设置 → POP3/SMTP/IMAP」，开启「IMAP/SMTP 服务」，按提示发一条短信验证后会显示授权码（只显示一次，记下来）。忘了可以关掉再开一次重新生成。', 'Sign in to 126 Mail on the web, click Settings → POP3/SMTP/IMAP (设置 → POP3/SMTP/IMAP) at the top and turn on the IMAP/SMTP service (IMAP/SMTP 服务). After you verify with a text message, an app password (授权码) is shown once; write it down. If you lose it, turn the service off and on again to get a new one.'),
    helpUrl: 'https://mail.126.com', helpLabel: L('打开 126 邮箱网页版', 'Open 126 Mail on the web'),
  },
  {
    id: 'gmail', name: 'Gmail', glyph: 'G', method: L('应用专用密码', 'App password'), imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpTls: true,
    saveSent: false, domains: ['gmail.com', 'googlemail.com'], codeLabel: L('应用专用密码', 'app password'),
    help: L('先给谷歌账号开两步验证，再到「谷歌账号 → 安全 → 应用专用密码」生成 16 位密码。国内需要能访问谷歌的网络。', 'Turn on 2-Step Verification for your Google account, then go to Google Account → Security → App passwords to generate a 16-character password. You need a network that can reach Google.'), helpUrl: 'https://myaccount.google.com/apppasswords',
    oauth: { brand: L('谷歌', 'Google') },
  },
  {
    id: 'outlook', name: 'Outlook', glyph: 'O', method: L('一键登录', 'One-click sign-in'), imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp-mail.outlook.com', smtpPort: 587, smtpTls: false,
    saveSent: false, domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.com.cn', 'live.cn'], codeLabel: L('密码', 'password'),
    help: L('Outlook、Hotmail、Live 和用微软账号登录的企业邮箱。', 'Outlook, Hotmail, Live and work mailboxes that sign in with a Microsoft account.'), oauth: { brand: L('微软', 'Microsoft') },
  },
  {
    id: 'icloud', name: 'iCloud', glyph: '', method: L('应用专用密码', 'App password'), imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587, smtpTls: false,
    saveSent: true, domains: ['icloud.com', 'me.com', 'mac.com'], codeLabel: L('应用专用密码', 'app password'),
    help: L('在 appleid.apple.com「登录与安全 → App 专用密码」里生成。', 'Generate one at appleid.apple.com under Sign-In and Security → App-Specific Passwords.'), helpUrl: 'https://appleid.apple.com',
  },
  {
    id: 'kojoo', name: 'kojoo.co', glyph: 'k', method: L('邮箱密码', 'Password'), imapHost: 'mail.songxxai.com', imapPort: 993, smtpHost: 'mail.songxxai.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['kojoo.co'], codeLabel: L('密码', 'password'), help: L('就是登录 kojoo 网页邮箱的密码。', 'The password you use for kojoo webmail.'), hidden: true,
  },
  {
    id: 'imap', name: L('其他邮箱', 'Other mail'), glyph: '@', method: 'IMAP / SMTP', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: [], codeLabel: L('密码或授权码', 'password or app password'), help: L('企业邮箱、阿里邮箱等：服务器地址可以在邮箱的「设置 → 客户端」里找到。', 'Work mail, Aliyun Mail and others: find the server addresses in your mailbox under Settings → Client (设置 → 客户端) or similar.'),
  },
]

/** 这个邮箱现在能不能一键登录 */
export const canOAuth = (p: Provider, enabled: string[]) => !!p.oauth && enabled.includes(p.id)
export const methodOf = (p: Provider, enabled: string[]) => (canOAuth(p, enabled) ? L('一键登录', 'One-click sign-in') : p.id === 'outlook' ? L('暂不可用', 'Not available') : p.method)

export const providerFor = (email: string) => {
  const d = email.split('@')[1]?.toLowerCase() || ''
  return PROVIDERS.find((p) => p.domains.includes(d))
}

/** 其他邮箱：按常见规则猜服务器 */
export const guessHosts = (email: string) => {
  const d = email.split('@')[1]?.toLowerCase() || ''
  if (!d) return { imap: '', smtp: '' }
  if (d.includes('outlook') || d.includes('hotmail') || d.includes('live.')) return { imap: 'outlook.office365.com', smtp: 'smtp-mail.outlook.com' }
  if (d === 'aliyun.com') return { imap: 'imap.aliyun.com', smtp: 'smtp.aliyun.com' }
  return { imap: `imap.${d}`, smtp: `smtp.${d}` }
}
