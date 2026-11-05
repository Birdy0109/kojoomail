import { Icon } from '../icons'
import { useApp } from '../store'
import { PROVIDERS, methodOf } from '../lib/providers'
import { ProviderGlyph } from './AccountSheets'
import appIcon from '../assets/app-icon@2x.png'
import { L } from '../lib/i18n'

export default function Welcome() {
  const set = useApp((s) => s.set)
  const oauth = useApp((s) => s.oauth)
  return (
    <div className="welcome">
      <div style={{ flex: '1 1 380px', maxWidth: 440 }}>
        {/* 图标四周自带留白和投影：放大一圈再往回收，视觉上和原来 56px 的方块一样大 */}
        <img src={appIcon} alt="" width={64} height={64} style={{ display: 'block', margin: -4 }} />
        <div style={{ marginTop: 22, font: "italic 400 22px 'Instrument Serif', serif", color: 'var(--sec)' }}>Kojoo Mail</div>
        <h1 style={{ margin: '6px 0 8px', fontSize: 32, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.25 }}>{L('所有邮箱，', 'All your mailboxes,')}<br />{L('一个收件箱。', 'one inbox.')}</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--sec)' }}>{L('QQ、网易、Gmail、Outlook、iCloud、企业邮统一收发。AI 帮你读信、标重点、列待办、起草回复，发不发由你决定。', 'Gmail, Outlook, iCloud, QQ, NetEase and work mail in one place. AI reads your email, flags what matters, lists to-dos and drafts replies. You decide what gets sent.')}</p>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['inbox', L('统一收发', 'One inbox'), L('所有账号按时间排在一起，回复时自动用对的身份', 'All accounts in one timeline; replies go out from the right address')],
            ['sparkle', L('AI 批注和待办', 'AI notes and to-dos'), L('询盘自动提取数量、条款，待办集中到一处', 'Quantities and terms pulled from inquiries; to-dos in one place')],
            ['shield', L('邮件存在本机', 'Mail stays on your device'), L('邮件和密码只存在这台电脑；开了 AI 才会把要分析的邮件发给你选的模型服务', 'Mail and passwords stay on this computer. Only with AI turned on are emails sent to the model service you choose')],
          ].map(([icon, t, d]) => (
            <div key={t} className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <Icon name={icon} style={{ marginTop: 2 }} />
              <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 12.5, color: 'var(--sec)' }}>{d}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="group sq" style={{ flex: '1 1 360px', maxWidth: 400, padding: 24, boxShadow: 'var(--shadow-card), 0 16px 40px -20px rgba(15,28,42,.25)' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{L('添加第一个邮箱', 'Add your first mailbox')}</h2>
        <p style={{ margin: '4px 0 18px', fontSize: 12.5, color: 'var(--sec)' }}>{L('之后可以随时在设置里继续添加。', 'You can add more anytime in Settings.')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PROVIDERS.filter((p) => !p.hidden).map((p) => (
            <button key={p.id} className="pv sq" onClick={() => set({ addAccount: p.id })}>
              <ProviderGlyph p={p} />{p.id === 'imap' ? L('企业邮箱或其他', 'Work mail or other') : p.name}<span className="m">{methodOf(p, oauth)}</span>
            </button>
          ))}
        </div>
        <div style={{ height: .5, background: 'var(--line)', margin: '18px 0 12px' }} />
        <div style={{ fontSize: 12, color: 'var(--sec)', lineHeight: 1.6 }}>{L('QQ、网易、iCloud 不对第三方客户端开放一键登录，需要在邮箱设置里生成授权码。', "QQ, NetEase and iCloud don't offer one-click sign-in to third-party apps; create an app password in your mailbox settings.")}</div>
        <button className="btn link sm" style={{ marginTop: 8, paddingLeft: 0 }} onClick={() => set({ guide: true })}><Icon name="doc" size={14} />{L('先看看怎么用', 'How it works')}</button>
      </div>
    </div>
  )
}
