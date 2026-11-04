// 常见邮箱的服务器设置。Gmail、Outlook 支持一键登录（OAuth）；QQ、网易、iCloud 不对第三方开放，只能用授权码
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
    id: 'qq', name: 'QQ 邮箱', glyph: 'QQ', method: '授权码', imapHost: 'imap.qq.com', imapPort: 993, smtpHost: 'smtp.qq.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['qq.com', 'foxmail.com', 'vip.qq.com'], codeLabel: '授权码',
    help: '在 QQ 邮箱网页版「设置 → 账号」里开启 IMAP/SMTP 服务后生成，不是 QQ 密码。', helpUrl: 'https://wx.mail.qq.com/list/readtemplate?name=app_intro.html#/agreement/authorizationCode',
  },
  {
    id: '163', name: '网易邮箱', glyph: '163', method: '授权码', imapHost: 'imap.163.com', imapPort: 993, smtpHost: 'smtp.163.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['163.com'], codeLabel: '授权码', help: '登录网易邮箱网页版，点顶部「设置 → POP3/SMTP/IMAP」，开启「IMAP/SMTP 服务」，按提示发一条短信验证后会显示授权码（只显示一次，记下来）。忘了可以关掉再开一次重新生成。',
    helpUrl: 'https://mail.163.com', helpLabel: '打开网易邮箱网页版',
  },
  {
    id: '126', name: '126 邮箱', glyph: '126', method: '授权码', imapHost: 'imap.126.com', imapPort: 993, smtpHost: 'smtp.126.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['126.com'], codeLabel: '授权码', help: '登录 126 邮箱网页版，点顶部「设置 → POP3/SMTP/IMAP」，开启「IMAP/SMTP 服务」，按提示发一条短信验证后会显示授权码（只显示一次，记下来）。忘了可以关掉再开一次重新生成。',
    helpUrl: 'https://mail.126.com', helpLabel: '打开 126 邮箱网页版',
  },
  {
    id: 'gmail', name: 'Gmail', glyph: 'G', method: '应用专用密码', imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465, smtpTls: true,
    saveSent: false, domains: ['gmail.com', 'googlemail.com'], codeLabel: '应用专用密码',
    help: '先给谷歌账号开两步验证，再到「谷歌账号 → 安全 → 应用专用密码」生成 16 位密码。国内需要能访问谷歌的网络。', helpUrl: 'https://myaccount.google.com/apppasswords',
    oauth: { brand: '谷歌' },
  },
  {
    id: 'outlook', name: 'Outlook', glyph: 'O', method: '一键登录', imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp-mail.outlook.com', smtpPort: 587, smtpTls: false,
    saveSent: false, domains: ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'outlook.com.cn', 'live.cn'], codeLabel: '密码',
    help: 'Outlook、Hotmail、Live 和用微软账号登录的企业邮箱。', oauth: { brand: '微软' },
  },
  {
    id: 'icloud', name: 'iCloud', glyph: '', method: '应用专用密码', imapHost: 'imap.mail.me.com', imapPort: 993, smtpHost: 'smtp.mail.me.com', smtpPort: 587, smtpTls: false,
    saveSent: true, domains: ['icloud.com', 'me.com', 'mac.com'], codeLabel: '应用专用密码',
    help: '在 appleid.apple.com「登录与安全 → App 专用密码」里生成。', helpUrl: 'https://appleid.apple.com',
  },
  {
    id: 'kojoo', name: 'kojoo.co', glyph: 'k', method: '邮箱密码', imapHost: 'mail.songxxai.com', imapPort: 993, smtpHost: 'mail.songxxai.com', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: ['kojoo.co'], codeLabel: '密码', help: '就是登录 kojoo 网页邮箱的密码。', hidden: true,
  },
  {
    id: 'imap', name: '其他邮箱', glyph: '@', method: 'IMAP / SMTP', imapHost: '', imapPort: 993, smtpHost: '', smtpPort: 465, smtpTls: true,
    saveSent: true, domains: [], codeLabel: '密码或授权码', help: '企业邮箱、阿里邮箱等：服务器地址可以在邮箱的「设置 → 客户端」里找到。',
  },
]

/** 这个邮箱现在能不能一键登录 */
export const canOAuth = (p: Provider, enabled: string[]) => !!p.oauth && enabled.includes(p.id)
export const methodOf = (p: Provider, enabled: string[]) => (canOAuth(p, enabled) ? '一键登录' : p.id === 'outlook' ? '暂不可用' : p.method)

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
