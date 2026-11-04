import { Fragment, useEffect, useState } from 'react'
import { Icon } from '../icons'
import { useApp } from '../store'
import { api, errText, on, type Todo } from '../lib/api'
import { dueLabel } from '../lib/format'
import { Empty, Seg, useMenu } from '../ui'

function bucket(t: Todo) {
  if (t.done) return '已完成'
  if (!t.due) return '以后'
  const d = new Date(t.due * 1000)
  const now = new Date()
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 86400000)
  if (diff < 0) return '逾期'
  if (diff === 0) return '今天'
  if (diff < 7) return '本周'
  return '以后'
}
const ORDER = ['逾期', '今天', '本周', '以后', '已完成']

const dueAt = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(18, 0, 0, 0); return Math.floor(d.getTime() / 1000) }

export default function TodoPage() {
  const s = useApp()
  const [filter, setFilter] = useState('all')
  const [list, setList] = useState<Todo[] | null>(null)
  const [sel, setSel] = useState<number | null>(null)
  const [newText, setNewText] = useState('')
  const menu = useMenu()

  const load = () => api.todos(filter).then((v) => { setList(v); if (sel && !v.some((t) => t.id === sel)) setSel(null) }).catch((e) => s.toast(errText(e), { kind: 'err' }))
  useEffect(() => { load() }, [filter])
  useEffect(() => { const u = on('mail-changed', () => load()); const u2 = on('ai-state', () => load()); return () => { u.then((f) => f()); u2.then((f) => f()) } }, [filter])

  const todo = list?.find((t) => t.id === sel) || null
  const set = async (id: number, p: Parameters<typeof api.todoSet>[1]) => { await api.todoSet(id, p); load(); s.refreshMeta() }
  const open = (list || []).filter((t) => !t.done).length
  const overdue = (list || []).filter((t) => bucket(t) === '逾期').length
  const sorted = [...(list || [])].sort((a, b) => ORDER.indexOf(bucket(a)) - ORDER.indexOf(bucket(b)))

  const dueMenu = (el: HTMLElement, t: Todo) => menu.openBelow(el, [
    { label: '今天', run: () => set(t.id, { due: dueAt(0) }) },
    { label: '明天', run: () => set(t.id, { due: dueAt(1) }) },
    { label: '下周一', run: () => { const d = new Date(); set(t.id, { due: dueAt(((8 - d.getDay()) % 7) || 7) }) } },
    'sep',
    { label: '不设截止', run: () => set(t.id, { due: null }) },
  ])

  return (
    <div className="todo-page">
      <section className="todo-list">
        <div className="list-head" style={{ padding: '16px 20px 10px' }}>
          <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
            <h1>待办</h1>
            <span style={{ fontSize: 12.5, color: 'var(--ter)' }}>{open} 项未完成{overdue ? ` · ${overdue} 项逾期` : ''}</span>
          </div>
          <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ width: 360, maxWidth: '100%' }}><Seg value={filter} onChange={setFilter} options={[['all', '全部'], ['today', '今天'], ['week', '本周'], ['done', '已完成']]} /></div>
            <form className="row" style={{ marginLeft: 'auto', gap: 6 }} onSubmit={async (e) => {
              e.preventDefault()
              if (!newText.trim()) return
              try { await api.todoAdd(newText, null, null); setNewText(''); load(); s.refreshMeta() } catch (er) { s.toast(errText(er), { kind: 'err' }) }
            }}>
              <input className="field inset" style={{ width: 220, maxWidth: '100%' }} placeholder="新建待办，回车添加" value={newText} onChange={(e) => setNewText(e.target.value)} aria-label="新建待办" />
            </form>
          </div>
        </div>
        <div className="rows" style={{ padding: '0 12px 20px' }}>
          {list && list.length === 0 ? (
            <Empty icon="todo" title={filter === 'done' ? '还没有完成的待办' : '没有待办'} sub={s.aiConfigured ? <>AI 会从需要你处理的邮件里自动提取，<br />也可以在上面直接新建</> : <>可以在上面直接新建。<br />设置 AI 后，还会从邮件里自动提取</>}>
              {!s.aiConfigured && <button className="btn sm sq" onClick={s.openAiSettings}>去设置 AI</button>}
            </Empty>
          ) : sorted.map((t, i) => {
            const b = bucket(t)
            const showH = i === 0 || bucket(sorted[i - 1]) !== b
            const acc = s.accounts.find((a) => a.id === t.accountId)
            return (
              <Fragment key={t.id}>
                {showH && <div className="group-h" style={{ color: b === '逾期' ? 'var(--accent-text)' : undefined, padding: '12px 12px 6px' }}>{b}</div>}
                <div className={`trow${sel === t.id ? ' sel' : ''}${t.done ? ' done' : ''}`} onClick={() => setSel(t.id)}>
                  <input type="checkbox" className="check" checked={t.done} onClick={(e) => e.stopPropagation()} onChange={(e) => set(t.id, { done: e.target.checked })} aria-label="完成" style={{ marginTop: 1 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="t">{t.text}</div>
                    {(t.srcSubject || t.srcFrom) && (
                      <div className="src"><span className="dot" style={{ background: acc?.color || 'var(--ter)' }} /><span className="truncate">{[t.srcFrom, t.srcSubject].filter(Boolean).join(' · ')}</span></div>
                    )}
                  </div>
                  <span className="row" style={{ gap: 6 }}>
                    {t.source === 'ai' && <span className="tag"><Icon name="sparkle" />AI</span>}
                    {t.due && !t.done && <span className={`tag${b === '逾期' ? ' hot' : ''}`}>{dueLabel(t.due)}</span>}
                  </span>
                </div>
              </Fragment>
            )
          })}
        </div>
      </section>

      <aside className="todo-detail">
        {!todo ? <Empty icon="todo" title="选一项待办" sub="可以改截止时间，或者直接跳到来源邮件处理" /> : (
          <>
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <input type="checkbox" className="check" style={{ width: 20, height: 20, marginTop: 4 }} checked={todo.done} onChange={(e) => set(todo.id, { done: e.target.checked })} aria-label="完成" />
              <textarea defaultValue={todo.text} key={todo.id} aria-label="待办内容" rows={2}
                style={{ flex: 1, border: 0, outline: 0, background: 'transparent', resize: 'none', font: '600 17px/1.4 var(--sans)', color: 'var(--ink)' }}
                onBlur={(e) => { if (e.target.value.trim() && e.target.value !== todo.text) set(todo.id, { text: e.target.value }) }} />
            </div>
            <div className="group sq">
              <div className="gr"><span style={{ color: 'var(--sec)', fontSize: 13 }}>截止</span><button className="btn sm sq" onClick={(e) => dueMenu(e.currentTarget, todo)}>{todo.due ? dueLabel(todo.due) : '不设'}<Icon name="down" size={12} /></button></div>
              <div className="gr"><span style={{ color: 'var(--sec)', fontSize: 13 }}>优先级</span>
                <Seg small value={todo.priority === 'high' ? 'high' : 'normal'} onChange={(v) => set(todo.id, { priority: v })} options={[['normal', '普通'], ['high', '高']]} />
              </div>
              <div className="gr"><span style={{ color: 'var(--sec)', fontSize: 13 }}>来源</span><span style={{ fontSize: 13 }}>{todo.source === 'ai' ? 'AI 从邮件里提取' : '手动添加'}</span></div>
            </div>
            {todo.msgId && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ter)', margin: '0 0 6px 2px' }}>来源邮件</div>
                <button className="group sq" style={{ width: '100%', textAlign: 'left', border: 0, padding: 12, cursor: 'pointer', color: 'var(--ink)' }}
                  onClick={async () => {
                    s.set({ page: 'mail', view: { kind: 'all' }, filter: 'all', search: '' })
                    await s.loadList()
                    s.select(todo.msgId!)
                  }}>
                  <div style={{ fontSize: 12, color: 'var(--sec)' }}>{todo.srcFrom}</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600, marginTop: 3 }}>{todo.srcSubject || '（无主题）'}</div>
                  <div style={{ fontSize: 12, color: 'var(--navy)', marginTop: 6 }}>打开邮件 →</div>
                </button>
              </div>
            )}
            <div className="row" style={{ gap: 8 }}>
              {todo.msgId && s.aiConfigured && (
                <button className="btn primary sq grow" onClick={async () => {
                  try { const m = await api.get(todo.msgId!); s.toast('正在起草…', { ttl: 2500 }); const t = await api.aiDraft(m.id, 'pro', m.ai?.replyLang || 'auto', `重点完成这件事：${todo.text}`); s.openCompose('reply', m, { prefill: { body: t } }) } catch (e) { s.toast(errText(e), { kind: 'err' }) }
                }}>起草回复</button>
              )}
              <button className="btn sq" onClick={() => set(todo.id, { due: dueAt(1) })}>推迟到明天</button>
              <button className="tb" aria-label="删除待办" data-tip="删除" onClick={async () => { await api.todoDelete(todo.id); setSel(null); load(); s.refreshMeta() }}><Icon name="trash" /></button>
            </div>
          </>
        )}
      </aside>
      {menu.node}
    </div>
  )
}
