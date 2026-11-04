import { useEffect, useMemo, useRef, useState } from 'react'
import { ask } from '../lib/ask'
import DOMPurify from 'dompurify'
import { Icon } from '../icons'
import { useApp } from '../store'
import { api, errText, type MsgFull } from '../lib/api'
import { addrText, fullTime, size } from '../lib/format'
import { Avatar, Empty, Kojoo, Loader, useMenu } from '../ui'
import { laterOptions, mailMenu } from './MailList'
import { IS_MAC } from '../lib/platform'

export default function Reader() {
  const s = useApp()
  const m = s.open
  const menu = useMenu()
  const idx = s.items.findIndex((x) => x.id === s.selected)

  if (!s.selected) {
    return (
      <section className="reader">
        <Empty icon="mail" title={s.items.length ? '选一封邮件阅读' : ' '} sub={s.items.length ? <>用 <span className="kbd">J</span> <span className="kbd">K</span> 上下切换，<span className="kbd">E</span> 归档</> : undefined} />
      </section>
    )
  }
  if (!m) {
    return (
      <section className="reader">
        {s.openError ? (
          <Empty icon="alert" title="打不开这封邮件" sub={s.openError}><button className="btn sm" onClick={() => s.select(s.selected)}>重试</button></Empty>
        ) : <Loader text="正在下载邮件…" />}
      </section>
    )
  }

  const acc = s.accounts.find((a) => a.id === m.accountId)
  const compose = (mode: 'reply' | 'replyAll' | 'forward') => s.openCompose(mode, m)
  const nav = (d: number) => { const n = s.items[idx + d]; if (n) s.select(n.id) }

  return (
    <section className="reader" aria-label="阅读">
      <div className="reader-bar">
        <button className="tb" aria-label="回复" data-tip="回复  R" onClick={() => compose('reply')}><Icon name="reply" /></button>
        <button className="tb" aria-label="全部回复" data-tip="全部回复  A" onClick={() => compose('replyAll')}><Icon name="replyAll" /></button>
        <button className="tb" aria-label="转发" data-tip="转发  F" onClick={() => compose('forward')}><Icon name="forward" /></button>
        <span className="sep" />
        {m.role !== 'archive' && m.role !== 'all' && <button className="tb" aria-label="归档" data-tip="归档  E" onClick={() => s.move([m.id], 'archive', '归档')}><Icon name="archive" /></button>}
        <button className={`tb${m.flagged ? ' on' : ''}`} aria-label={m.flagged ? '取消重点' : '标为重点'} data-tip={m.flagged ? '取消重点  S' : '标为重点  S'} onClick={() => s.mark([m.id], { flagged: !m.flagged })}><Icon name="flag" /></button>
        <button className="tb" aria-label="稍后处理" data-tip="稍后处理" onClick={(e) => menu.openBelow(e.currentTarget, laterOptions().map(([label, t]) => ({ label, icon: 'clock', run: () => s.later([m.id], t) })))}><Icon name="clock" /></button>
        <button className="tb" aria-label="删除" data-tip={m.role === 'trash' ? '彻底删除' : '删除  Del'} onClick={async () => (m.role === 'trash' ? await ask('彻底删除这封邮件？删除后无法恢复。') && s.removeForever([m.id]) : s.move([m.id], 'trash', '删除'))}><Icon name="trash" /></button>
        <span className="mono" style={{ marginLeft: 'auto', marginRight: 2, fontSize: 12, color: 'var(--ter)' }}>{idx >= 0 ? `${idx + 1} / ${s.total}` : ''}</span>
        <button className="tb" aria-label="上一封" data-tip="上一封  K" disabled={idx <= 0} onClick={() => nav(-1)}><Icon name="up" /></button>
        <button className="tb" aria-label="下一封" data-tip="下一封  J" disabled={idx < 0 || idx >= s.items.length - 1} onClick={() => nav(1)}><Icon name="down" /></button>
        <button className="tb" aria-label="更多" data-tip="更多" onClick={(e) => menu.openBelow(e.currentTarget, [{ label: '打印', icon: 'doc', run: () => printMail(m) }, 'sep', ...mailMenu(m, [m.id]).filter((x) => x === 'sep' || !['回复', '全部回复', '转发'].includes(x.label))])}><Icon name="more" /></button>
      </div>
      <div className="reader-scroll">
        <h2>{m.subject || '（无主题）'}</h2>
        <div className="sender">
          <Avatar name={m.fromName} email={m.fromAddr} />
          <div style={{ fontSize: 13, lineHeight: 1.45, minWidth: 0, userSelect: 'text' }}>
            <b>{m.fromName || m.fromAddr}</b> {m.fromName && <span style={{ color: 'var(--ter)' }}>&lt;{m.fromAddr}&gt;</span>}
            <div className="truncate" style={{ fontSize: 12, color: 'var(--ter)' }}>
              发给 {acc ? acc.label || acc.email : ''}{m.to.length > 0 && ` · ${m.to.map(addrText).join('，')}`}{m.cc.length > 0 && ` · 抄送 ${m.cc.map((a) => a.name || a.email).join('，')}`}
            </div>
          </div>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ter)', whiteSpace: 'nowrap' }}>{fullTime(m.date)}</span>
        </div>

        {s.view.kind === 'followup' && m.role === 'sent' && !s.search && <FollowNote m={m} />}
        <AiCard m={m} />

        {m.atts.length > 0 && (
          <div className="att-row">
            {m.atts.map((a) => (
              <span key={a.idx} className="row" style={{ gap: 2 }}>
                <button className="att sq" title="用默认程序打开" onClick={async () => {
                  try { await api.openAttachment(m.id, a.idx) } catch (e) { s.toast(errText(e), { kind: 'err', ttl: 8000 }) }
                }}>
                  <span className="ext">{(a.name.split('.').pop() || 'FILE').slice(0, 4).toUpperCase()}</span>
                  <span className="truncate" style={{ maxWidth: 220 }}>{a.name}</span>
                  <span className="num" style={{ color: 'var(--ter)' }}>{size(a.size)}</span>
                </button>
                <button className="tb" aria-label={`保存 ${a.name}`} data-tip="保存到「下载」" onClick={async () => {
                  try { const p = await api.saveAttachment(m.id, a.idx); s.toast(`已保存到 ${p}`) } catch (e) { s.toast(errText(e), { kind: 'err' }) }
                }}><Icon name="download" size={15} /></button>
              </span>
            ))}
          </div>
        )}
        <MailBody m={m} />
      </div>
      {menu.node}
    </section>
  )
}

/** 待跟进：发出几天对方没回。可以让 AI 写一封跟进，或者不再提醒 */
function FollowNote({ m }: { m: MsgFull }) {
  const s = useApp()
  const [busy, setBusy] = useState(false)
  const days = Math.max(1, Math.floor((Date.now() / 1000 - m.date) / 86400))
  const to = m.to.map((a) => a.email).join(', ')
  const acc = s.accounts.find((a) => a.id === m.accountId)
  const write = async () => {
    if (!s.aiConfigured || (acc && !acc.aiAllowed)) { s.openCompose('reply', m, { prefill: { to } }); return }
    setBusy(true)
    try { const body = await api.aiFollowup(m.id); s.openCompose('reply', m, { prefill: { to, body } }) } catch (e) { s.toast(errText(e), { kind: 'err' }) } finally { setBusy(false) }
  }
  const skip = async () => {
    try {
      await api.followupSet(m.id, true)
      s.toast('这封不再提醒跟进', { action: { label: '撤销', run: () => { api.followupSet(m.id, false).catch(() => {}) } }, ttl: 6000 })
    } catch (e) { s.toast(errText(e), { kind: 'err' }) }
  }
  return (
    <div className="follow-note sq">
      <Icon name="wait" size={15} />
      <span className="grow">发出 {days} 天了，{m.to[0]?.name || m.to[0]?.email || '对方'}还没回。</span>
      <button className="btn sm sq" disabled={busy} onClick={write}>{busy ? '正在起草…' : s.aiConfigured && acc?.aiAllowed !== false ? '让 AI 写跟进' : '写跟进'}</button>
      <button className="btn link sm" onClick={skip}>不用跟进</button>
    </div>
  )
}

function AiCard({ m }: { m: MsgFull }) {
  const s = useApp()
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const menu = useMenu()
  const ai = m.ai
  useEffect(() => setBusy(false), [m.id, ai?.state, ai?.model, ai?.error])

  if (!s.aiConfigured && !ai) return null
  if (ai && ai.state === 3) return null // 本地规则判为通知/广告，不显示批注
  const acc = s.accounts.find((a) => a.id === m.accountId)
  if (acc && !acc.aiAllowed) return null // 不用 AI 的账号：不显示批注，也不给「重新生成」「起草」的入口

  const running = busy || (!ai && m.aiPending)
  const regen = async () => {
    setBusy(true)
    try { await api.aiAnalyze(m.id) } catch (e) { setBusy(false); s.toast(errText(e), { kind: 'err' }) }
  }
  if (!ai && !running) {
    return (
      <div className="ai-card sq">
        <div className="row" style={{ padding: '8px 10px 8px 14px', gap: 10, fontSize: 12.5, color: 'var(--sec)' }}>
          <Icon name="sparkle" style={{ color: 'var(--accent)' }} />
          <span className="grow">这封邮件还没有 AI 批注{s.aiUsedToday >= (s.settings?.aiDailyLimit ?? 200) ? '（今天的自动分析额度用完了）' : ''}</span>
          <button className="btn sm sq" onClick={regen}>让 AI 分析</button>
        </div>
      </div>
    )
  }
  const draftWith = async (tone: string) => {
    s.toast('正在起草…', { ttl: 2500 })
    try {
      const text = await api.aiDraft(m.id, tone, ai?.replyLang || 'auto', '')
      s.openCompose('reply', m, { prefill: { body: text } })
    } catch (e) { s.toast(errText(e), { kind: 'err' }) }
  }

  if (ai && ai.state === 4 && !busy) {
    // 账号设成只分类：显示类别，想看摘要和建议回复再点完整分析
    return (
      <div className="ai-card sq">
        <div className="row" style={{ padding: '8px 10px 8px 14px', gap: 10, fontSize: 12.5 }}>
          <Icon name="sparkle" style={{ color: 'var(--accent)' }} />
          <span className="tag">{ai.category}{ai.priority === 'high' ? ' · 高优先' : ''}</span>
          <span className="grow truncate" style={{ color: 'var(--sec)' }}>{ai.reason}</span>
          <button className="btn sm sq" onClick={regen}>完整分析</button>
        </div>
      </div>
    )
  }
  if (ai && ai.state === 2 && !busy) {
    return (
      <div className="ai-card sq">
        <div className="row" style={{ padding: '10px 14px', gap: 10, fontSize: 12.5 }}>
          <Icon name="alert" style={{ color: 'var(--amber-text)' }} />
          <span className="grow">AI 这次没分析成功：{ai.error.slice(0, 120)}</span>
          <button className="btn sm" onClick={regen}>重试</button>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-card sq">
      <div className="ai-strip">
        {running ? <span style={{ color: '#F2A487', display: 'inline-flex' }}><Kojoo width={26} stroke={8} /></span> : <Icon name="sparkle" style={{ color: '#F2A487' }} />}
        <span className="t">批注</span>
        <span className="s truncate">{running ? '正在读这封邮件…' : ai!.reason || ai!.summary}</span>
        {!running && ai!.model && <span className="model">{ai!.model.replace(/^claude-/, '').replace(/-(\d)-(\d)$/, '-$1.$2')}</span>}
        {!running && <button className="tb" aria-label={collapsed ? '展开批注' : '收起批注'} onClick={() => setCollapsed(!collapsed)}><Icon name={collapsed ? 'down' : 'up'} size={15} /></button>}
      </div>
      {running ? (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skel" style={{ height: 9, width: '90%' }} /><div className="skel" style={{ height: 9, width: '72%' }} /><div className="skel" style={{ height: 9, width: '55%' }} />
        </div>
      ) : !collapsed && (
        <>
          {ai!.facts.length > 0 && (
            <div className="facts">
              {ai!.facts.map((f, i) => (
                <div key={i} className={`fact sq${/期望|截止|期限|due|deadline/i.test(f.k) ? ' hl' : ''}`}><div className="k">{f.k}</div><div className="v" title={f.v}>{f.v}</div></div>
              ))}
            </div>
          )}
          {ai!.summary && <div className="ai-summary">{ai!.summary}</div>}
          {m.todos.length > 0 && (
            <div className="todo-mini">
              {m.todos.map((t) => (
                <label key={t.id} className={`todo-line${t.done ? ' done' : ''}`}>
                  <input type="checkbox" className="check" checked={t.done} onChange={async (e) => { await api.todoSet(t.id, { done: e.target.checked }); s.reloadOpen(); s.refreshMeta() }} />
                  <span className="grow">{t.text}</span>
                  {t.due && !t.done && <span className="tag hot">{new Date(t.due * 1000).toDateString() === new Date().toDateString() ? '今天' : new Date(t.due * 1000).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>}
                </label>
              ))}
            </div>
          )}
          {ai!.reply && (
            <>
              <div className="reply-box sq">
                <div className="k">建议回复{ai!.replyLang ? ` · ${{ en: '英文', zh: '中文', it: '意大利语', de: '德语', fr: '法语', es: '西班牙语', ja: '日语' }[ai!.replyLang] || ai!.replyLang}` : ''}</div>
                <div className="v">{ai!.reply.length > 400 ? ai!.reply.slice(0, 400) + '…' : ai!.reply}</div>
              </div>
              <div className="ai-actions">
                <button className="btn primary sq" onClick={() => s.openCompose('reply', m, { prefill: { body: ai!.reply } })}>填入回复</button>
                <button className="btn sq" onClick={(e) => menu.openBelow(e.currentTarget, [
                  { label: '专业得体', run: () => draftWith('pro') },
                  { label: '友好亲切', run: () => draftWith('friendly') },
                  { label: '简洁直接', run: () => draftWith('brief') },
                ])}>换个语气</button>
                <button className="tb" aria-label="重新生成" data-tip="用精细模型重新分析" onClick={regen}><Icon name="refresh" /></button>
              </div>
            </>
          )}
          {!ai!.reply && (
            <div className="ai-actions" style={{ justifyContent: 'flex-end', paddingTop: 2 }}>
              <button className="btn sm sq" onClick={() => draftWith('pro')}>让 AI 起草回复</button>
              <button className="tb" aria-label="重新生成" data-tip="用精细模型重新分析" onClick={regen}><Icon name="refresh" /></button>
            </div>
          )}
        </>
      )}
      {menu.node}
    </div>
  )
}

/** 邮件 HTML 清洗后包成独立文档：去脚本和表单，CSP 拦远程资源（allowRemote 时放行图片） */
function mailDoc(html: string, allowRemote: boolean, head = '') {
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta', 'base', 'frame', 'frameset'],
    FORBID_ATTR: ['srcset'],
    ADD_ATTR: ['target'],
  })
  const img = allowRemote ? 'data: https: http:' : 'data:'
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${img}; style-src 'unsafe-inline'; font-src data:">`
  const base = `<style>html,body{margin:0;padding:0;background:#fff;color:#1F2A37;font:14px/1.6 -apple-system,'Segoe UI','Microsoft YaHei',sans-serif;word-break:break-word}img{max-width:100%;height:auto}a{color:#1B4A80}table{max-width:100%}pre{white-space:pre-wrap}</style>`
  const out = clean.replace(/<head[^>]*>/i, (h) => h + csp + base).replace(/^(?![\s\S]*<head)/, csp + base)
  return head ? out.replace(/<body[^>]*>/i, (b) => b + head) : out
}

/** 文字里像网址或域名的部分，取主机名（小写、去 www.） */
function hostIn(t: string): string {
  const m = t.trim().match(/^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#]|$)/i)
  return m ? m[1].toLowerCase().replace(/^www\./, '') : ''
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** 打印：信头 + 正文放进一个临时的隐藏框，调系统打印对话框（不加载远程图片） */
function printMail(m: MsgFull) {
  const who = (a: { name?: string; email: string }) => esc(a.name ? `${a.name} <${a.email}>` : a.email)
  const head = `<div style="font:13px/1.7 'Segoe UI','Microsoft YaHei',sans-serif;color:#1F2A37;border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:16px">
<div style="font-size:18px;font-weight:600;margin-bottom:6px">${esc(m.subject || '（无主题）')}</div>
<div>发件人：${who({ name: m.fromName, email: m.fromAddr })}</div>
${m.to.length ? `<div>收件人：${m.to.map(who).join('，')}</div>` : ''}${m.cc.length ? `<div>抄送：${m.cc.map(who).join('，')}</div>` : ''}
<div>时间：${esc(fullTime(m.date))}</div></div>`
  const body = m.html || `<html><body><pre style="font:14px/1.7 'Segoe UI','Microsoft YaHei',sans-serif;white-space:pre-wrap">${esc(m.text)}</pre></body></html>`
  if (IS_MAC) {
    // WKWebView 里页面调不出打印：在浏览器里打开，那边 ⌘P（提示条打印时不出现）
    const tip = `<div class="kjm-tip" style="font:13px -apple-system,sans-serif;background:#FFF6D6;padding:8px 12px;margin-bottom:12px;border-radius:6px">按 ⌘P 打印这封邮件</div><style>@media print{.kjm-tip{display:none}}</style>`
    api.printHtml(mailDoc(body, false, tip + head)).catch(() => {})
    return
  }
  const f = document.createElement('iframe')
  f.setAttribute('sandbox', 'allow-same-origin allow-modals')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  f.srcdoc = mailDoc(body, false, head)
  f.onload = () => {
    const w = f.contentWindow
    if (!w) { f.remove(); return }
    // print() 在 WebView2 里可能马上返回、预览还在生成：等打印对话框关掉（afterprint）再拆，最多留 10 分钟
    const done = () => f.remove()
    w.addEventListener('afterprint', done)
    setTimeout(done, 600000)
    w.print()
  }
  document.body.appendChild(f)
}

const REMOTE_RE = /<img[^>]+src\s*=\s*["']?\s*https?:|url\(\s*["']?\s*https?:/i

function MailBody({ m }: { m: MsgFull }) {
  const s = useApp()
  const frame = useRef<HTMLIFrameElement>(null)
  const [allowRemote, setAllowRemote] = useState(false)
  const [height, setHeight] = useState(80)
  useEffect(() => { setAllowRemote(s.settings?.remoteImages === 'always'); setHeight(80) }, [m.id])

  const hasRemote = useMemo(() => REMOTE_RE.test(m.html), [m.html])
  const doc = useMemo(() => (m.html ? mailDoc(m.html, allowRemote) : ''), [m.html, allowRemote])

  const ro = useRef<ResizeObserver | null>(null)
  useEffect(() => () => ro.current?.disconnect(), [])

  const onClick = async (e: MouseEvent) => {
    const a = (e.target as Element).closest('a')
    if (!a) return
    e.preventDefault()
    const href = (a.getAttribute('href') || '').trim()
    // 钓鱼常见手法：显示的是一个网址，点过去是另一个网站
    const shown = hostIn(a.textContent || '')
    const real = hostIn(href)
    if (shown && real && shown !== real && !real.endsWith(`.${shown}`) && !await ask(`链接上写的是 ${shown}，实际会打开 ${real}。\n\n可能是钓鱼链接，确定要打开吗？`)) return
    if (/^mailto:/i.test(href)) {
      s.openCompose('new', null, { prefill: { to: decodeURIComponent(href.slice(7).split('?')[0]) } })
    } else if (/^https?:/i.test(href)) {
      api.openUrl(href).catch((err) => s.toast(`链接打不开：${errText(err)}`, { kind: 'err' }))
    }
  }
  // 用 iframe 自己的 onLoad（元素一创建就挂上）：在 useEffect 里再挂 load 监听，正文载入快时会错过，点链接就没反应
  const onLoad = () => {
    const d = frame.current?.contentDocument
    if (!d) return
    const fit = () => setHeight(Math.max(60, Math.min(d.documentElement.scrollHeight, 40000)))
    fit()
    ro.current?.disconnect()
    ro.current = new ResizeObserver(fit)
    ro.current.observe(d.documentElement)
    d.addEventListener('click', (e) => { onClickRef.current(e) })
  }
  // 监听挂在文档上只挂一次，通过 ref 调最新的处理函数
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  if (!m.html) {
    return <div style={{ marginTop: 18, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 'var(--body-size)', lineHeight: 1.75, color: 'var(--ink-2)', userSelect: 'text', maxWidth: 760 }}>{linkify(m.text)}</div>
  }
  return (
    <>
      {hasRemote && !allowRemote && (
        <div className="remote-note sq">
          <Icon name="image" size={15} />为保护隐私，已拦截远程图片（发件人可以靠它知道你读了信）
          <button className="btn link sm" style={{ marginLeft: 'auto' }} onClick={() => setAllowRemote(true)}>显示图片</button>
        </div>
      )}
      {/* HTML 邮件按白底写的：两种主题都放进白色卡片，边界清楚 */}
      <div className="mail-sheet">
        <iframe ref={frame} className="mail-frame" title="邮件正文" sandbox="allow-same-origin" srcDoc={doc} onLoad={onLoad} style={{ height }} />
      </div>
    </>
  )
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s<>"'）)]+)/g)
  return parts.map((p, i) =>
    /^https?:\/\//.test(p) ? <a key={i} href={p} onClick={(e) => { e.preventDefault(); api.openUrl(p) }}>{p}</a> : p,
  )
}
