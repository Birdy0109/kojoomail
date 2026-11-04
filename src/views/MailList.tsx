import { Fragment, useEffect, useRef, useState } from 'react'
import { ask } from '../lib/ask'
import { Icon } from '../icons'
import { useApp } from '../store'
import { api, errText, FOCUS_CATS, type Draft, type Folder, type MsgLite } from '../lib/api'
import { dayGroup, shortTime, who } from '../lib/format'
import { Avatar, Empty, Kojoo, Seg, Sheet, useMenu, type MenuItem } from '../ui'
import { folderName } from './Sidebar'

export function laterOptions(): [string, number][] {
  const now = new Date()
  const at = (d: Date, h: number) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return Math.floor(x.getTime() / 1000) }
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const monday = new Date(now); monday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7))
  const opts: [string, number][] = []
  if (now.getHours() < 17) opts.push(['今天晚些（18:00）', at(now, 18)])
  opts.push(['明天上午（9:00）', at(tomorrow, 9)], ['下周一（9:00）', at(monday, 9)])
  return opts
}

/** 这些邮件都在同一个账号里就返回账号 id（跨账号不能移到某个具体文件夹） */
function sameAccount(ids: number[]): number | null {
  const s = useApp.getState()
  const accs = new Set(ids.map((id) => (s.items.find((x) => x.id === id) ?? (s.open?.id === id ? s.open : undefined))?.accountId))
  const [a] = [...accs]
  return accs.size === 1 && a ? a : null
}

/** 「移动到…」：列出这个账号的文件夹，可以按名字筛 */
export function MovePicker() {
  const s = useApp()
  const [q, setQ] = useState('')
  const pick = s.movePick
  if (!pick) return null
  const close = () => s.set({ movePick: null })
  const cur = new Set(pick.ids.map((id) => s.items.find((x) => x.id === id)?.folderId))
  const list = s.folders.filter((f) => f.accountId === pick.accountId && f.role !== 'drafts' && !cur.has(f.id) && (!q.trim() || f.name.toLowerCase().includes(q.trim().toLowerCase())))
  const go = (f: Folder) => { close(); s.move(pick.ids, `folder:${f.id}`, `移到「${f.name}」`) }
  return (
    <Sheet onClose={close} label="移动到文件夹" className="narrow">
      <div className="sh-head">
        <div className="grow"><h1>移动 {pick.ids.length} 封邮件到…</h1></div>
        <button className="tb" aria-label="关闭" onClick={close}><Icon name="x" /></button>
      </div>
      <div className="sh-body">
        <input className="field" autoFocus placeholder="按名字找文件夹" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) go(list[0]) }} />
        <div className="group sq" style={{ marginTop: 12, maxHeight: 360, overflowY: 'auto' }}>
          {list.length === 0 ? <div className="gr" style={{ color: 'var(--sec)', fontSize: 13 }}>没有可以移过去的文件夹</div> : list.map((f) => (
            <button key={f.id} className="gr" style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }} onClick={() => go(f)}>
              <Icon name="folder" size={15} style={{ color: 'var(--sec)' }} /><span className="lbl grow truncate">{f.name}</span>
              {f.path !== f.name && <span className="mono truncate" style={{ fontSize: 11.5, color: 'var(--ter)', maxWidth: 200 }}>{f.path}</span>}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

export function mailMenu(m: MsgLite, ids: number[]): MenuItem[] {
  const s = useApp.getState()
  const open = async (mode: 'reply' | 'replyAll' | 'forward') => {
    try { s.openCompose(mode, await api.get(m.id)) } catch (e) { s.toast(errText(e), { kind: 'err' }) }
  }
  const items: MenuItem[] = []
  if (ids.length === 1) {
    items.push(
      { label: '回复', icon: 'reply', key: 'R', run: () => open('reply') },
      { label: '全部回复', icon: 'replyAll', key: 'A', run: () => open('replyAll') },
      { label: '转发', icon: 'forward', key: 'F', run: () => open('forward') },
      'sep',
    )
  }
  items.push(
    { label: m.seen ? '标为未读' : '标为已读', icon: 'mail', key: 'U', run: () => s.mark(ids, { seen: !m.seen }) },
    { label: m.flagged ? '取消重点' : '标为重点', icon: 'flag', key: 'S', run: () => s.mark(ids, { flagged: !m.flagged }) },
    ...laterOptions().map(([label, t]): MenuItem => ({ label: `稍后处理：${label}`, icon: 'clock', run: () => s.later(ids, t) })),
    'sep',
  )
  if (m.role !== 'inbox') items.push({ label: '移回收件箱', icon: 'inbox', run: () => s.move(ids, 'inbox', '移回收件箱') })
  if (m.role !== 'archive' && m.role !== 'all') items.push({ label: '归档', icon: 'archive', key: 'E', run: () => s.move(ids, 'archive', '归档') })
  if (m.role === 'inbox' && ids.length === 1 && m.fromAddr) {
    items.push({ label: `归档 ${m.fromName || m.fromAddr} 的所有邮件`, icon: 'archive', run: () => s.bulkArchive({ filter: `from:${m.fromAddr}`, view: 'all', accountId: null }, `来自 ${m.fromName || m.fromAddr} 的邮件`) })
  }
  const acc = sameAccount(ids)
  if (acc) items.push({ label: '移动到…', icon: 'folder', run: () => s.set({ movePick: { ids, accountId: acc } }) })
  if (m.role !== 'junk') items.push({ label: '标为垃圾邮件', icon: 'ban', run: () => s.move(ids, 'junk', '移到垃圾邮件') })
  if (m.role === 'trash') items.push({ label: '彻底删除', icon: 'trash', danger: true, run: async () => { if (await ask(`彻底删除 ${ids.length} 封邮件？删除后无法恢复。`)) s.removeForever(ids) } })
  else items.push({ label: '删除', icon: 'trash', key: 'Del', run: () => s.move(ids, 'trash', '删除') })
  return items
}

export default function MailList() {
  const s = useApp()
  const rowsRef = useRef<HTMLDivElement>(null)
  const menu = useMenu()
  const [drafts, setDrafts] = useState<Draft[] | null>(null)
  const isDrafts = s.view.kind === 'drafts'
  // 分类页签（AI 整理）：当前视图里有邮件的分类都列出来，常用分类排前面；数字是未读
  const viewAcc = s.view.kind === 'all' || s.view.kind === 'folder' ? s.view.accountId : undefined
  const focus: string[] = viewAcc ? (s.accounts.find((a) => a.id === viewAcc)?.focus ?? []) : FOCUS_CATS.filter((c) => s.accounts.some((a) => a.focus.includes(c)))
  const rank = (c: string) => (focus.includes(c) ? 0 : 1)
  // 常用分类没邮件也常驻（「待办」还包括有没做完待办事项的信，数字里算不到）
  const cats = [...s.cats, ...(s.cats.length ? focus.filter((f) => !s.cats.some((c) => c.cat === f)).map((cat) => ({ cat, total: 0, unread: 0 })) : [])]
    .filter((c) => c.cat !== '其他' || s.filter === 'cat:其他').sort((a, b) => rank(a.cat) - rank(b.cat))
  const curCat = s.filter.startsWith('cat:') ? s.filter.slice(4) : ''
  const tabs: [string, string][] = [['all', '全部'], ['unread', '未读'], ...cats.map((c): [string, string] => [`cat:${c.cat}`, c.unread ? `${c.cat} ${c.unread > 99 ? '99+' : c.unread}` : c.cat])]
  // 选中的分类刚被清空（比如刚整理完）：页签留着，不跳走
  if (curCat && !cats.some((c) => c.cat === curCat)) tabs.push([s.filter, curCat])
  const bulkUnread = s.cats.filter((c) => c.cat === '通知' || c.cat === '订阅').reduce((n, c) => n + c.unread, 0)
  // 只有收件箱里才给「归档」类的整理
  const inInbox = s.view.kind === 'all' || (s.view.kind === 'folder' && s.folders.find((f) => f.id === (s.view as { folderId: number }).folderId)?.role === 'inbox')
  const subsTotal = inInbox ? s.cats.find((c) => c.cat === '订阅')?.total ?? 0 : 0
  const notesTotal = inInbox ? s.cats.find((c) => c.cat === '通知')?.total ?? 0 : 0
  const canTidy = !s.search && (bulkUnread > 0 || subsTotal > 0 || notesTotal > 0)
  const tidyMenu = (el: HTMLElement) => menu.openBelow(el, [
    ...(bulkUnread > 0 ? [{ label: `通知和订阅标为已读（${bulkUnread}）`, icon: 'mail', run: () => s.tidy() }] : []),
    ...(subsTotal > 0 ? [{ label: `订阅全部归档（${subsTotal}）`, icon: 'archive', run: () => s.bulkArchive({ filter: 'cat:订阅' }, '订阅邮件') }] : []),
    ...(notesTotal > 0 ? [{ label: `通知全部归档（${notesTotal}）`, icon: 'archive', run: () => s.bulkArchive({ filter: 'cat:通知' }, '通知邮件') }] : []),
  ])

  useEffect(() => {
    if (!isDrafts) return
    api.drafts().then(setDrafts).catch(() => setDrafts([]))
  }, [isDrafts, s.counts.drafts, s.compose])

  useEffect(() => {
    if (s.selected) rowsRef.current?.querySelector(`[data-id="${s.selected}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [s.selected])

  const account = (id: number) => s.accounts.find((a) => a.id === id)
  const folder = s.view.kind === 'folder' ? s.folders.find((f) => f.id === (s.view as { folderId: number }).folderId) : undefined
  const title = s.search ? '搜索结果'
    : s.view.kind === 'all' ? (s.view.accountId ? account(s.view.accountId)?.label || account(s.view.accountId)?.email || '收件箱' : '全部收件箱')
    : s.view.kind === 'important' ? '重点' : s.view.kind === 'bills' ? '账单发票' : s.view.kind === 'followup' ? '待跟进' : s.view.kind === 'later' ? '稍后处理' : s.view.kind === 'sent' ? '已发送' : s.view.kind === 'drafts' ? '草稿'
    : folder ? folderName(folder) : ''
  const unread = s.items.filter((m) => !m.seen).length
  const sub = s.loading ? '' : s.search ? `${s.total} 封` : s.view.kind === 'all' && s.filter === 'all' ? (unread ? `${s.counts.inboxUnread} 封未读` : `${s.total} 封`) : `${s.total} 封`
  const showSender = (m: MsgLite) => (m.role === 'sent' || m.role === 'drafts' ? { name: m.to[0]?.name || '', email: m.to[0]?.email || '' } : { name: m.fromName, email: m.fromAddr })

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) s.loadMore()
  }

  const checked = [...s.checked]
  const bulkBase = s.items.find((m) => m.id === checked[0])

  return (
    <section className="list" aria-label="邮件列表">
      <div className="list-head">
        <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
          <h1 className="truncate">{title}</h1>
          <span style={{ fontSize: 12.5, color: 'var(--ter)', whiteSpace: 'nowrap' }}>{isDrafts ? `${drafts?.length ?? 0} 封` : sub}</span>
          {canTidy && <button className="tb tidy" style={{ marginLeft: 'auto', alignSelf: 'center' }} aria-label="整理" data-tip="整理通知和订阅" onClick={(e) => tidyMenu(e.currentTarget)}><Icon name="sparkle" />整理<Icon name="down" size={12} /></button>}
          {!isDrafts && !s.search && folder?.role !== 'drafts' && <button className="tb" style={{ marginLeft: canTidy ? undefined : 'auto', alignSelf: 'center' }} aria-label="全部标为已读" data-tip="全部标为已读" onClick={() => s.markAllRead()}><Icon name="check" /></button>}
          {!s.search && folder && (folder.role === 'trash' || folder.role === 'junk') && (
            <button className="btn sm sq" style={{ alignSelf: 'center' }} onClick={async () => {
              if (!await ask(`清空「${folder.name}」？服务器上这个文件夹里的邮件会全部彻底删除（包括没下载到本机的旧邮件），不能恢复。`)) return
              try { const n = await api.emptyFolder(folder.id); s.toast(n ? `已清空 ${n} 封` : '已清空'); s.loadList(true) } catch (e) { s.toast(errText(e), { kind: 'err' }) }
            }}>清空</button>
          )}
          {!isDrafts && <button className="tb" style={{ alignSelf: 'center', marginLeft: s.search || folder?.role === 'drafts' ? 'auto' : undefined }} aria-label="刷新" data-tip="立即同步" onClick={() => { api.syncNow(); s.loadList(true) }}><Icon name="refresh" /></button>}
        </div>
        {checked.length > 0 && bulkBase ? (
          <div className="row" style={{ marginTop: 12, height: 30, padding: '0 4px 0 12px', borderRadius: 8, background: 'var(--invert)', color: 'var(--invert-text)' }}>
            <span className="grow" style={{ fontSize: 12.5, fontWeight: 600 }}>已选 {checked.length} 封</span>
            <button className="tb" style={{ color: 'inherit', width: 26, height: 26 }} aria-label="归档" data-tip="归档" onClick={() => s.move(checked, 'archive', '归档')}><Icon name="archive" size={15} /></button>
            <button className="tb" style={{ color: 'inherit', width: 26, height: 26 }} aria-label="标为已读" data-tip="标为已读" onClick={() => { s.mark(checked, { seen: true }); s.set({ checked: new Set() }) }}><Icon name="mail" size={15} /></button>
            {sameAccount(checked) && <button className="tb" style={{ color: 'inherit', width: 26, height: 26 }} aria-label="移动到" data-tip="移动到…" onClick={() => s.set({ movePick: { ids: checked, accountId: sameAccount(checked)! } })}><Icon name="folder" size={15} /></button>}
            <button className="tb" style={{ color: 'inherit', width: 26, height: 26 }} aria-label="删除" data-tip="删除" onClick={() => s.move(checked, 'trash', '删除')}><Icon name="trash" size={15} /></button>
            <button className="tb" style={{ color: 'inherit', width: 26, height: 26 }} aria-label="取消选择" data-tip="取消选择" onClick={() => s.set({ checked: new Set() })}><Icon name="x" size={15} /></button>
          </div>
        ) : !isDrafts && !s.search && (
          <div className="tabs-scroll" style={{ marginTop: 12 }}>
            <Seg value={s.filter} onChange={s.setFilter} options={tabs} />
          </div>
        )}
      </div>

      <div className="rows" ref={rowsRef} onScroll={onScroll}>
        {s.search && s.aiConfigured && <AskCard />}
        {isDrafts ? (
          drafts && drafts.length === 0 ? <Empty icon="draft" title="没有草稿" sub="写到一半关掉的邮件会自动存在这里" /> : (drafts || []).map((d) => (
            <div key={d.id} className="mrow" onClick={() => s.openCompose('draft', null, { draftId: d.id, draft: { ...d, accountId: d.accountId ?? s.accounts[0]?.id, html: '' } })}>
              <Avatar name={d.to[0]?.name || ''} email={d.to[0]?.email || '?'} />
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ alignItems: 'baseline', gap: 6 }}><span className="who truncate">{d.to.length ? `致 ${d.to.map((a) => a.name || a.email).join('、')}` : '（还没填收件人）'}</span><span className="time">{shortTime(d.updated)}</span></div>
                <div className="subj truncate">{d.subject || '（无主题）'}</div>
                <div className="prev">{d.body.slice(0, 120) || ' '}</div>
              </div>
            </div>
          ))
        ) : s.loading && s.items.length === 0 ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="mrow" style={{ cursor: 'default' }}>
              <div className="skel" style={{ width: 36, height: 36 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 3 }}>
                <div className="skel" style={{ height: 10, width: `${40 + i * 6}%` }} />
                <div className="skel" style={{ height: 9, width: '80%' }} />
                <div className="skel" style={{ height: 9, width: '60%' }} />
              </div>
            </div>
          ))
        ) : s.items.length === 0 ? (
          s.search ? <Empty icon="search" title={`没找到「${s.search}」`} sub="搜的是所有账号的标题、发件人和正文" />
            : s.filter !== 'all' ? <Empty icon="inbox" title="这里是空的" sub="换个筛选看看" />
            : s.view.kind === 'all' ? <Empty icon="todo" title="都处理完了" sub="新邮件会自动出现在这里" />
            : <Empty icon="inbox" title="这里是空的" />
        ) : (
          s.items.map((m, i) => {
            const g = s.view.kind === 'sent' || s.search ? null : dayGroup(m.date)
            const showG = g && (i === 0 || dayGroup(s.items[i - 1].date) !== g)
            const acc = account(m.accountId)
            const p = showSender(m)
            const isChecked = s.checked.has(m.id)
            return (
              <Fragment key={m.id}>
                {showG && <div className="group-h">{g}</div>}
                <div
                  data-id={m.id}
                  className={`mrow${s.selected === m.id ? ' sel' : ''}${!m.seen && m.role !== 'sent' ? ' unread' : ''}${isChecked ? ' checked' : ''}`}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || s.checked.size) { s.toggleCheck(m.id); return }
                    s.select(m.id)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    const ids = s.checked.has(m.id) ? checked : [m.id]
                    menu.openAt(e.clientX, e.clientY, mailMenu(m, ids))
                  }}
                >
                  {!m.seen && m.role !== 'sent' && <span className="udot" />}
                  <span onClick={(e) => { e.stopPropagation(); s.toggleCheck(m.id) }} title="选择">
                    {isChecked
                      ? <span className="avatar" style={{ background: 'var(--navy)', color: '#fff' }}><Icon name="check" size={18} /></span>
                      : <Avatar name={p.name} email={p.email} badge={s.accounts.length > 1 ? acc?.color : undefined} />}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
                      <span className="who truncate">{m.role === 'sent' ? `致 ${p.name || p.email}` : who(m)}</span>
                      {m.hasAtt && <Icon name="clip" size={13} style={{ color: 'var(--ter)', alignSelf: 'center' }} />}
                      {m.flagged && <Icon name="flag" size={13} className="flag" style={{ alignSelf: 'center' }} />}
                      <span className="time">{shortTime(m.date)}</span>
                    </div>
                    <div className="subj truncate">{m.subject || '（无主题）'}</div>
                    <div className="prev">{m.aiSummary || m.snippet || ' '}</div>
                    {s.view.kind === 'followup' && !s.search && (
                      <div className="tags"><span className="tag amber">发出 {Math.max(1, Math.floor((Date.now() / 1000 - m.date) / 86400))} 天，还没回</span></div>
                    )}
                    {(m.aiCategory === '询盘' || m.aiPriority === 'high' || m.openTodos > 0 || m.later) && (
                      <div className="tags">
                        {m.aiCategory === '询盘' && <span className="tag hot">询盘{m.aiPriority === 'high' ? ' · 高优先' : ''}</span>}
                        {m.aiCategory !== '询盘' && m.aiPriority === 'high' && <span className="tag hot">高优先</span>}
                        {m.openTodos > 0 && <span className="tag navy">{m.openTodos} 项待办</span>}
                        {m.later && m.later > Date.now() / 1000 && <span className="tag amber">稍后 · {shortTime(m.later)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            )
          })
        )}
        {s.loadingMore && <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}><div className="skel" style={{ width: 80, height: 8 }} /></div>}
      </div>
      {menu.node}
    </section>
  )
}

/** 问邮箱：搜索结果上方。像提问的搜索会自动问；普通搜索给一个「问 AI」的入口 */
function AskCard() {
  const s = useApp()
  const a = s.ask && s.ask.q === s.search ? s.ask : null
  if (!a) {
    return (
      <button className="ask-try" onClick={() => s.askAi(s.search)}>
        <Icon name="sparkle" size={15} /><span className="grow truncate">让 AI 从邮件里找答案：「{s.search}」</span><Icon name="right" size={13} />
      </button>
    )
  }
  const src = a.out?.sources ?? []
  const open = (n: number) => { const x = src.find((y) => y.n === n); if (x) s.openMsg(x.id) }
  // 回答里的 [#3]、[#1, #3] 换成可点的小标签
  const body = (a.out?.answer ?? '').split(/(\[#\d+(?:\s*[,，、]\s*#?\d+)*\])/g).map((p, i) => {
    if (!/^\[#\d/.test(p)) return p
    return (p.match(/\d+/g) || []).map(Number).filter((n) => src.some((x) => x.n === n)).map((n) => (
      <button key={`${i}-${n}`} className="ask-cite" onClick={() => open(n)} title="打开这封邮件">{n}</button>
    ))
  })
  return (
    <div className="ai-card sq ask-card">
      <div className="ai-strip">
        {a.busy ? <span style={{ color: '#F2A487', display: 'inline-flex' }}><Kojoo width={26} stroke={8} /></span> : <Icon name="sparkle" style={{ color: '#F2A487' }} />}
        <span className="t">问邮箱</span>
        <span className="s truncate">{a.busy ? '正在翻邮件…' : a.out?.keywords.length ? `搜了：${a.out.keywords.join('、')}` : ''}</span>
        {!a.busy && <button className="tb" aria-label="重新问" data-tip="重新问一次" onClick={() => s.askAi(a.q)}><Icon name="refresh" size={15} /></button>}
      </div>
      {a.busy ? (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}><div className="skel" style={{ height: 9, width: '90%' }} /><div className="skel" style={{ height: 9, width: '65%' }} /></div>
      ) : a.err ? (
        <div className="ask-body" style={{ paddingBottom: 12 }}>没问成功：{a.err.slice(0, 160)}</div>
      ) : (
        <>
          <div className="ask-body">{body}</div>
          {src.length > 0 && (
            <div className="ask-src">
              {src.map((x) => (
                <button key={x.n} onClick={() => s.openMsg(x.id)}>
                  <span className="n">{x.n}</span><span className="truncate">{x.who} · {x.subject || '（无主题）'}</span><span className="t">{shortTime(x.date)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
