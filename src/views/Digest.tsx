import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { useApp } from '../store'
import { api, errText, on, type Digest, type DigestItem, type Overview } from '../lib/api'
import { dueLabel, shortTime } from '../lib/format'
import { Kojoo, Loader } from '../ui'

const daysAgo = (t: number) => Math.max(1, Math.floor((Date.now() / 1000 - t) / 86400))

/** 今日简报：要回复的、账单、到期待办、待跟进、可以一键整理的通知订阅；开头一段 AI 概要 */
export default function DigestPage() {
  const s = useApp()
  const [d, setD] = useState<Digest | null>(null)
  const [ov, setOv] = useState<Overview | null>(null)
  const [ovBusy, setOvBusy] = useState(false)
  const [ovErr, setOvErr] = useState('')

  const load = () => api.digest().then(setD).catch((e) => s.toast(errText(e), { kind: 'err' }))
  const loadOverview = async (force = false) => {
    if (!s.aiConfigured) return
    setOvBusy(true); setOvErr('')
    try { setOv(await api.digestOverview(force)) } catch (e) { setOvErr(errText(e)) } finally { setOvBusy(false) }
  }
  useEffect(() => {
    load(); loadOverview()
    // 邮件有变化时刷新清单（概要不自动重写，省额度；点刷新再写）
    let t: ReturnType<typeof setTimeout> | null = null
    const u = on('mail-changed', () => { if (t) clearTimeout(t); t = setTimeout(load, 600) })
    return () => { u.then((f) => f()); if (t) clearTimeout(t) }
  }, [])

  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  const hour = new Date().getHours()
  const hello = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
  const tidy = async () => {
    s.set({ page: 'mail', view: { kind: 'all' }, filter: 'all', cats: [], search: '', ask: null, selected: null, open: null, checked: new Set() })
    await s.loadList()
    await s.tidy()
  }

  const row = (x: DigestItem, right?: React.ReactNode, view?: 'followup' | 'bills') => (
    <button key={x.id} className="dg-row" onClick={() => s.openMsg(x.id, view ? { kind: view } : undefined)}>
      <span className={`dg-dot${!x.seen ? ' on' : ''}`} />
      <span className="dg-main">
        <span className="dg-top"><b className="truncate">{x.who}</b>{x.high && <span className="tag hot">高优先</span>}<span className="dg-time">{right ?? shortTime(x.date)}</span></span>
        <span className="dg-subj truncate">{x.subject || '（无主题）'}</span>
        {x.summary && <span className="dg-sum">{x.summary}</span>}
      </span>
    </button>
  )

  return (
    <div className="digest">
      <div className="dg-wrap">
        <header className="dg-head">
          <div>
            <h1>{hello}</h1>
            <div className="dg-date">{today}{d ? ` · 过去 24 小时收到 ${d.newCount} 封` : ''}</div>
          </div>
          <button className="tb" aria-label="刷新" data-tip="刷新简报" onClick={() => { load(); loadOverview(true) }}><Icon name="refresh" /></button>
        </header>

        {!s.aiConfigured && (
          <div className="group sq dg-ov" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="sparkle" style={{ color: 'var(--sec)', flex: 'none' }} />
            <span className="grow" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sec)' }}>还没设置 AI。今日概要和「要回复」要靠 AI 读信判断，设置好后这里会自动出现；待办、待跟进现在就能用。</span>
            <button className="btn sm sq" style={{ flex: 'none' }} onClick={s.openAiSettings}>去设置</button>
          </div>
        )}
        {s.aiConfigured && (
          <div className="ai-card sq dg-ov">
            <div className="ai-strip">
              {ovBusy ? <span style={{ color: '#F2A487', display: 'inline-flex' }}><Kojoo width={26} stroke={8} /></span> : <Icon name="sparkle" style={{ color: '#F2A487' }} />}
              <span className="t">今日概要</span>
              <span className="s truncate">{ovBusy ? '正在看今天的邮件…' : ov ? `${new Date(ov.at * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 生成` : ''}</span>
            </div>
            <div className="dg-ov-body">
              {ovBusy && !ov ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><div className="skel" style={{ height: 9, width: '92%' }} /><div className="skel" style={{ height: 9, width: '78%' }} /><div className="skel" style={{ height: 9, width: '60%' }} /></div>
              ) : ovErr && !ov ? (
                <span style={{ color: 'var(--sec)' }}>概要没生成出来：{ovErr.slice(0, 120)} <button className="btn link sm" onClick={() => loadOverview(true)}>重试</button></span>
              ) : ov?.text}
            </div>
          </div>
        )}

        {!d ? <Loader text="" width={160} /> : (
          <>
            <Section icon="reply" title="要回复" count={d.reply.length} empty={s.aiConfigured ? '最近三天的询盘、待办和私人来信都处理过了' : '设置 AI 后，这里会列出需要你回复的询盘、待办和私人来信'}>
              {d.reply.map((x) => row(x))}
            </Section>

            {d.todos.length > 0 && (
              <Section icon="todo" title="今明两天的待办" count={d.todos.length} more={{ label: '全部待办', run: () => s.set({ page: 'todo', selected: null }) }}>
                {d.todos.map((t) => (
                  <button key={t.id} className="dg-row" onClick={() => (t.msgId ? s.openMsg(t.msgId) : s.set({ page: 'todo', selected: null }))}>
                    <span className="dg-dot" />
                    <span className="dg-main">
                      <span className="dg-top"><span className="truncate" style={{ fontSize: 13.5 }}>{t.text}</span>{t.due && <span className={`tag${t.due * 1000 < Date.now() + 86400000 ? ' hot' : ''}`}>{dueLabel(t.due)}</span>}</span>
                    </span>
                  </button>
                ))}
              </Section>
            )}

            {d.followupTotal > 0 && (
              <Section icon="wait" title="待跟进" count={d.followupTotal} hint="发出 3 天以上，对方还没回" more={{ label: '全部', run: () => s.go({ kind: 'followup' }) }}>
                {d.followups.map((x) => row(x, `${daysAgo(x.date)} 天没回`, 'followup'))}
              </Section>
            )}

            {d.bills.length > 0 && (
              <Section icon="receipt" title="最近一周的账单" count={d.bills.length} more={{ label: '账单发票', run: () => s.go({ kind: 'bills' }) }}>
                {d.bills.map((x) => row(x, undefined, 'bills'))}
              </Section>
            )}

            {d.bulkUnread > 0 && (
              <div className="group sq dg-bulk">
                <div className="gr">
                  <Icon name="inbox" style={{ color: 'var(--ter)' }} />
                  <span className="lbl grow">另外还有 {d.bulkUnread} 封没读的通知和订阅</span>
                  <button className="btn sm sq" onClick={tidy}><Icon name="sparkle" size={14} />一键整理</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, count, hint, empty, more, children }: { icon: string; title: string; count: number; hint?: string; empty?: string; more?: { label: string; run: () => void }; children: React.ReactNode }) {
  return (
    <section className="dg-sec">
      <div className="dg-sec-h">
        <Icon name={icon} size={15} />
        <span>{title}</span>
        {count > 0 && <span className="num">{count}</span>}
        {hint && <span className="hint">{hint}</span>}
        {more && <button className="btn link sm" style={{ marginLeft: 'auto' }} onClick={more.run}>{more.label} →</button>}
      </div>
      <div className="group sq">
        {count === 0 && empty ? <div className="dg-empty">{empty}</div> : children}
      </div>
    </section>
  )
}
