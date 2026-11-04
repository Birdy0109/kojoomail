import { useState } from 'react'
import { Icon } from '../icons'
import { useApp, type View } from '../store'
import { keyText } from '../lib/platform'
import type { Folder } from '../lib/api'

const ROLE_NAME: Record<string, string> = { inbox: '收件箱', sent: '已发送', drafts: '草稿', archive: '归档', junk: '垃圾邮件', trash: '已删除', all: '所有邮件', starred: '已加星标' }
const ROLE_ICON: Record<string, string> = { inbox: 'inbox', sent: 'send', drafts: 'draft', archive: 'archive', junk: 'ban', trash: 'trash', all: 'mail', starred: 'flag' }
export const folderName = (f: Folder) => ROLE_NAME[f.role] || f.name

export default function Sidebar() {
  const s = useApp()
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const isView = (k: View['kind'], extra?: (v: View) => boolean) => s.page === 'mail' && !s.search && s.view.kind === k && (!extra || extra(s.view))

  const nav = (on: boolean, icon: string, label: string, count: number | null, click: () => void, title?: string) => (
    <button className={`nav sq${on ? ' on' : ''}`} onClick={click} aria-current={on ? 'page' : undefined} title={title}>
      <Icon name={icon} />{label}{count ? <span className="cnt">{count > 999 ? '999+' : count}</span> : null}
    </button>
  )

  const settings = s.settings
  const used = s.aiUsedToday
  const limit = settings?.aiDailyLimit || 200

  return (
    <nav className="side" aria-label="导航">
      <div className="side-scroll">
      <div className="h">智能视图</div>
      {nav(s.page === 'digest', 'sparkle', '今日简报', null, () => s.set({ page: 'digest', selected: null, open: null }), '今天要回的、要付的、要跟进的，一页看完')}
      {nav(isView('all', (v) => v.kind === 'all' && !v.accountId), 'inbox', '全部收件箱', s.counts.inboxUnread, () => s.go({ kind: 'all' }))}
      {nav(isView('important'), 'flag', '重点', s.counts.important, () => s.go({ kind: 'important' }), '标了重点的，和 AI 判断需要尽快处理的')}
      {nav(s.page === 'todo', 'todo', '待办', s.counts.todos, () => s.set({ page: 'todo', selected: null }))}
      {nav(isView('followup'), 'wait', '待跟进', s.counts.followups, () => s.go({ kind: 'followup' }), '你发出去 3 天以上、对方还没回的邮件')}
      {nav(isView('bills'), 'receipt', '账单发票', s.counts.bills, () => s.go({ kind: 'bills' }), 'AI 认出来的账单、发票、付款和扣费提醒，加上你自己建的「发票」文件夹（各账号合在一起）')}
      {nav(isView('later'), 'clock', '稍后处理', s.counts.later, () => s.go({ kind: 'later' }))}
      {nav(isView('drafts'), 'draft', '草稿', s.counts.drafts, () => s.go({ kind: 'drafts' }))}
      {nav(isView('sent'), 'send', '已发送', null, () => s.go({ kind: 'sent' }))}

      <div className="h gap" style={{ display: 'flex', alignItems: 'center' }}>
        账号
        <button className="tb" style={{ width: 22, height: 22, marginLeft: 'auto', marginRight: -4 }} aria-label="添加账号" data-tip="添加账号" onClick={() => s.set({ addAccount: 'pick' })}><Icon name="plus" size={14} /></button>
      </div>
      {s.accounts.map((a) => {
        const st = s.status[a.id]
        const folders = s.folders.filter((f) => f.accountId === a.id)
        const inbox = folders.find((f) => f.role === 'inbox')
        const on = isView('all', (v) => v.kind === 'all' && v.accountId === a.id)
        const err = st?.state === 'error'
        const expanded = !!open[a.id]
        return (
          <div key={a.id}>
            <button className={`nav sq${on ? ' on' : ''}`} style={err ? { height: 'auto', minHeight: 30, padding: '6px 10px', alignItems: 'flex-start' } : undefined}
              onClick={() => (err ? s.set({ repairAccount: a.id }) : s.go({ kind: 'all', accountId: a.id }))} title={a.email}>
              <span className={`chev${expanded ? ' open' : ''}`} style={err ? { marginTop: 2 } : undefined} role="button" aria-label={expanded ? '收起文件夹' : '展开文件夹'}
                onClick={(e) => { e.stopPropagation(); setOpen({ ...open, [a.id]: !expanded }) }}>
                <Icon name="right" size={12} />
              </span>
              <span className="dot" style={{ background: a.color, margin: err ? '5px 5px 0' : '0 5px' }} />
              <span className="grow truncate" style={{ lineHeight: err ? 1.35 : undefined }}>
                {a.label || a.email}
                {err && <span className="err-line">{st.errorKind === 'auth' ? '授权失效，点此修复' : '连接出错，点此查看'}</span>}
              </span>
              {err ? <Icon name="alert" size={15} style={{ color: 'var(--accent-text)', marginTop: 2 }} /> : inbox && inbox.unread > 0 ? <span className="cnt">{inbox.unread}</span> : null}
            </button>
            {expanded && folders.map((f) => (
              <button key={f.id} className={`nav sub sq${isView('folder', (v) => v.kind === 'folder' && v.folderId === f.id) ? ' on' : ''}`} onClick={() => s.go({ kind: 'folder', folderId: f.id, accountId: a.id })}>
                <Icon name={ROLE_ICON[f.role] || 'folder'} size={15} /><span className="grow truncate">{folderName(f)}</span>
                {f.unread > 0 && f.role !== 'sent' && f.role !== 'trash' && <span className="cnt">{f.unread}</span>}
              </button>
            ))}
          </div>
        )
      })}
      </div>

      <div className="foot">
        {s.aiConfigured && (
          <div className="usage">
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 11, color: 'var(--sec)' }}><span>今日 AI 分析</span><span className="num">{used} / {limit}</span></div>
            <div className="bar"><i style={{ width: `${Math.min(100, (used / Math.max(1, limit)) * 100)}%` }} /></div>
          </div>
        )}
        <div className="me">
          <span className="avatar sm" style={{ background: 'var(--invert)', color: 'var(--invert-text)' }}>{(s.accounts[0]?.displayName || s.accounts[0]?.email || 'K').slice(0, 1).toUpperCase()}</span>
          <div className="grow truncate" style={{ fontSize: 12.5, fontWeight: 500 }}>{s.accounts[0]?.displayName || '我的邮箱'}</div>
          <button className="tb" aria-label="设置" data-tip={keyText('设置  Ctrl ,')} data-tip-pos="up" onClick={() => s.set({ page: 'settings', settingsTab: 'general' })}><Icon name="gear" /></button>
        </div>
      </div>
    </nav>
  )
}
