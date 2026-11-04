import { useEffect, useState } from 'react'
import { ask } from '../lib/ask'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Icon } from '../icons'
import { useApp } from '../store'
import { api, errText, FOCUS_CATS, type Account } from '../lib/api'
import { ACCOUNT_COLORS, ago } from '../lib/format'
import { Seg, Switch } from '../ui'
import { GuideContent } from './Guide'
import { DATA_DIR, IS_MAC, TRAY, VAULT, keyText } from '../lib/platform'

// 侧栏分组，和主界面侧栏一样带小标题
const GROUPS: [string, [string, string, string][]][] = [
  ['基本', [['general', 'gear', '通用'], ['accounts', 'mail', '账号'], ['ai', 'sparkle', 'AI 与模型']]],
  ['提醒与操作', [['notify', 'bell', '通知与隐私'], ['keys', 'keyboard', '快捷键']]],
  ['帮助', [['guide', 'doc', '使用教程'], ['about', 'info', '关于']]],
]

export default function SettingsPage() {
  const s = useApp()
  const tab = s.settingsTab
  return (
    <div className="settings">
      <nav className="set-nav" aria-label="设置分类">
        <div className="row" style={{ height: 30, marginBottom: 12 }}>
          <button className="tb" aria-label="返回邮件" onClick={() => s.set({ page: 'mail' })}><Icon name="left" /></button>
          <span style={{ fontSize: 13, fontWeight: 600 }}>设置</span>
        </div>
        {GROUPS.map(([title, tabs], gi) => (
          <div key={title} role="group" aria-label={title}>
            <div className={`h${gi ? ' gap' : ''}`}>{title}</div>
            {tabs.map(([k, icon, label]) => (
              <button key={k} className={`nav sq${tab === k ? ' on' : ''}`} onClick={() => s.set({ settingsTab: k })}><Icon name={icon} />{label}</button>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '8px 10px', fontSize: 11, color: 'var(--ter)' }}>版本 {s.version}</div>
      </nav>
      <main className="set-main">
        <div className="inner">
          {tab === 'general' && <General />}
          {tab === 'accounts' && <Accounts />}
          {tab === 'ai' && <Ai />}
          {tab === 'notify' && <NotifyPrivacy />}
          {tab === 'keys' && <Keys />}
          {tab === 'guide' && <><Head title="使用教程" lead="五分钟了解 Kojoo Mail 怎么用。" /><GuideContent /></>}
          {tab === 'about' && <About />}
        </div>
      </main>
    </div>
  )
}

const Head = ({ title, lead }: { title: string; lead: string }) => <div><h1>{title}</h1><p className="lead">{lead}</p></div>

function General() {
  const s = useApp()
  const st = s.settings!
  const save = s.saveSettings
  return (
    <>
      <Head title="通用" lead="外观、字号和启动方式。" />
      <section>
        <h2 className="gh">外观</h2>
        <div className="group sq" style={{ padding: '16px 14px 14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
            {([['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']] as const).map(([k, label]) => (
              <button key={k} onClick={() => save({ theme: k })} style={{ border: 0, background: 'transparent', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', color: 'var(--ink)', fontSize: 12.5, fontWeight: st.theme === k ? 600 : 400 }}>
                <span className="sq" style={{
                  width: '100%', height: 64, borderRadius: 8, display: 'block',
                  background: k === 'light' ? '#F7F7F5' : k === 'dark' ? '#14181E' : 'linear-gradient(105deg, #F7F7F5 0 50%, #14181E 50% 100%)',
                  boxShadow: st.theme === k ? '0 0 0 2px var(--navy), 0 0 0 4.5px var(--navy-soft)' : '0 0 0 .5px var(--line)',
                }} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section>
        <h2 className="gh">文字与布局</h2>
        <div className="group sq">
          <div style={{ padding: '12px 14px 14px' }}>
            <div className="row"><label htmlFor="fs" className="lbl" style={{ fontSize: 13.5 }}>正文字号</label><span className="num" style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--sec)' }}>{st.fontSize}{st.fontSize === 13 ? ' · 标准' : ''}</span></div>
            <div className="row" style={{ marginTop: 10, gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sec)' }}>A</span>
              <input id="fs" type="range" min={12} max={16} step={0.5} value={st.fontSize} onChange={(e) => save({ fontSize: Number(e.target.value) })} style={{ flex: 1, accentColor: 'var(--navy)' }} />
              <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--sec)' }}>A</span>
            </div>
            <div className="sq" style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: 'var(--sunken)', boxShadow: 'inset 0 0 0 .5px var(--line-2)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sec)', marginBottom: 4 }}>预览</div>
              <div style={{ fontSize: st.fontSize, lineHeight: 1.6, color: 'var(--ink-2)' }}>Thank you for your inquiry. We can supply 2,000 sets with FSC certification. 感谢询价，我们可以提供 2,000 套带 FSC 认证的竹餐具。</div>
            </div>
            <div className="hint">影响读信和写信的正文。{IS_MAC ? '' : '要整体放大界面，用 Ctrl + 加号。'}</div>
          </div>
          <div className="gr"><span className="lbl">信息密度</span><Seg small value={st.density} onChange={(v) => save({ density: v })} options={[['compact', '紧凑'], ['standard', '标准'], ['cozy', '宽松']]} /></div>
          <div className="gr"><div><div className="lbl">邮件标题用宋体</div><div className="sub">读信时的标题更有阅读感</div></div><Switch label="邮件标题用宋体" on={st.serifTitles} onChange={(v) => save({ serifTitles: v })} /></div>
        </div>
      </section>
      <section>
        <h2 className="gh">启动与默认</h2>
        <div className="group sq">
          <div className="gr"><div><div className="lbl">开机自动启动</div><div className="sub">启动后在{TRAY}里收信，不弹窗口</div></div><Switch label="开机自动启动" on={st.autostart} onChange={(v) => save({ autostart: v })} /></div>
          <div className="gr"><div><div className="lbl">关闭窗口时缩到{TRAY}</div><div className="sub">继续收新邮件；要彻底退出，{IS_MAC ? '按 ⌘Q' : '右键托盘图标选「退出」'}</div></div><Switch label="关闭窗口时缩到托盘" on={st.closeToTray} onChange={(v) => save({ closeToTray: v })} /></div>
          {s.accounts.length > 1 && (
            <div className="gr"><span className="lbl">默认发件账号</span>
              <select className="field" style={{ width: 'auto', height: 28, fontSize: 12.5 }} value={st.defaultAccount ?? s.accounts[0]?.id} onChange={(e) => save({ defaultAccount: Number(e.target.value) })}>
                {s.accounts.map((a) => <option key={a.id} value={a.id}>{a.label ? `${a.label} · ${a.email}` : a.email}</option>)}
              </select>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function Accounts() {
  const s = useApp()
  return (
    <>
      <Head title="账号" lead="每个账号的名称、颜色、签名和登录密码。" />
      {s.accounts.map((a) => <AccountCard key={a.id} a={a} />)}
      <div><button className="btn primary sq" onClick={() => s.set({ addAccount: 'pick' })}><Icon name="plus" size={15} />添加账号</button></div>
    </>
  )
}

function AccountCard({ a }: { a: Account }) {
  const s = useApp()
  const st = s.status[a.id]
  const [label, setLabel] = useState(a.label)
  const [name, setName] = useState(a.displayName)
  const [sig, setSig] = useState(a.signature)
  // 常用分类：本地先变（连点几个不会互相覆盖），保存后以后端为准
  const [focus, setFocus] = useState(a.focus)
  useEffect(() => setFocus(a.focus), [a.focus.join('|')])
  const save = async (p: Parameters<typeof api.updateAccount>[1]) => { try { await api.updateAccount(a.id, p); s.refreshMeta() } catch (e) { s.toast(errText(e), { kind: 'err' }) } }
  const state = !st ? '等待连接' : st.state === 'idle' ? `已同步 · ${st.lastOk ? ago(st.lastOk) : ''}` : st.state === 'syncing' ? '正在同步' : st.state === 'connecting' ? '正在连接' : st.state === 'error' ? st.error : `离线：${st.error}`
  return (
    <section>
      <h2 className="gh row" style={{ gap: 6 }}><span className="dot" style={{ background: a.color }} />{a.email}</h2>
      <div className="group sq">
        <div className="gr"><span className="lbl">状态</span><span style={{ fontSize: 12.5, color: st?.state === 'error' ? 'var(--accent-text)' : 'var(--sec)', maxWidth: 420, textAlign: 'right' }} className="truncate">{state}</span>
          {st?.state === 'error' && <button className="btn sm sq" onClick={() => s.set({ repairAccount: a.id })}>修复</button>}
        </div>
        <div className="gr"><span className="lbl">显示名称</span><input className="field inset" style={{ width: 240, textAlign: 'right' }} value={label} placeholder="比如 外贸 · Gmail" onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== a.label && save({ label })} /></div>
        <div className="gr"><span className="lbl">发件人名字</span><input className="field inset" style={{ width: 240, textAlign: 'right' }} value={name} placeholder="收件人看到的名字" onChange={(e) => setName(e.target.value)} onBlur={() => name !== a.displayName && save({ displayName: name })} /></div>
        <div className="gr"><span className="lbl">颜色</span>
          <div className="row" style={{ gap: 8 }}>
            {ACCOUNT_COLORS.map((c) => <button key={c} aria-label={`颜色 ${c}`} onClick={() => save({ color: c })} style={{ width: 18, height: 18, borderRadius: '50%', border: 0, padding: 0, background: c, cursor: 'pointer', boxShadow: a.color === c ? `0 0 0 2px var(--card), 0 0 0 3.5px ${c}` : 'none' }} />)}
          </div>
        </div>
        <div style={{ padding: '10px 14px 12px', borderTop: '.5px solid var(--line-2)' }}>
          <div className="lbl" style={{ marginBottom: 6 }}>签名</div>
          <textarea className="field" rows={3} style={{ height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: 1.5 }} value={sig} onChange={(e) => setSig(e.target.value)} onBlur={() => sig !== a.signature && save({ signature: sig })} placeholder="写新邮件时自动加在末尾" />
        </div>
        <div className="gr" style={{ alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}><div className="lbl">常用分类</div><div className="sub">邮件列表上方的筛选页签。分类由 AI 判断；没配 AI 时只能自动认出「通知」「订阅」</div></div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 'none', maxWidth: 380 }}>
            {FOCUS_CATS.map((c) => {
              const on = focus.includes(c)
              return <button key={c} className={`btn sm sq${on ? ' primary' : ''}`} aria-pressed={on} onClick={() => { const next = on ? focus.filter((x) => x !== c) : [...focus, c]; setFocus(next); save({ focus: next }) }}>{c}</button>
            })}
          </div>
        </div>
        <div className="gr" style={{ alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10 }}>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}><div className="lbl">AI 处理</div><div className="sub">{!a.aiAllowed ? '这个账号的邮件不发给 AI，只用本地规则认出通知和订阅' : a.aiLevel === 'classify' ? '只判断类别和轻重，不写摘要、要点和回复，省用量；需要时在邮件里点「完整分析」' : '每封新邮件写摘要、要点、待办和建议回复'}</div></div>
          <Seg small value={!a.aiAllowed ? 'off' : a.aiLevel} onChange={(v) => save(v === 'off' ? { aiAllowed: false } : { aiAllowed: true, aiLevel: v as 'full' | 'classify' })} options={[['full', '完整'], ['classify', '只分类'], ['off', '不用 AI']]} />
        </div>
        <div className="gr"><div><div className="lbl">服务器</div><div className="sub mono">{a.imapHost}:{a.imapPort} · {a.smtpHost}:{a.smtpPort}</div></div>
          <button className="btn sm sq" onClick={() => s.set({ repairAccount: a.id })}>{a.auth === 'oauth' ? '重新登录' : '更换密码'}</button>
        </div>
        <div className="gr"><span className="lbl" style={{ color: 'var(--accent-text)' }}>删除这个账号</span>
          <button className="btn sm sq danger" onClick={async () => {
            if (!await ask(`从 Kojoo Mail 里删除 ${a.email}？\n只删除这台电脑上的缓存，服务器上的邮件不受影响。`)) return
            try { await api.removeAccount(a.id); await s.refreshMeta(); s.go({ kind: 'all' }) } catch (e) { s.toast(errText(e), { kind: 'err' }) }
          }}>删除</button>
        </div>
      </div>
    </section>
  )
}

// 常用的 OpenAI 兼容服务。模型名各家常改：这里只是建议值，保存密钥后输入框会列出这家实际提供的模型
const AI_PRESETS: { id: string; name: string; base: string; models: [string, string, string]; keyUrl?: string; note: string }[] = [
  { id: 'deepseek', name: 'DeepSeek', base: 'https://api.deepseek.com/v1', models: ['deepseek-v4-flash', 'deepseek-v4-pro', ''], keyUrl: 'https://platform.deepseek.com/api_keys', note: '国内直连，按用量付费，价格低，日常分析够用' },
  { id: 'qwen', name: '通义千问（阿里云百炼）', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-flash', 'qwen-plus', ''], keyUrl: 'https://bailian.console.aliyun.com/?tab=model#/api-key', note: '国内直连，新账号有免费额度' },
  { id: 'kimi', name: 'Kimi（月之暗面）', base: 'https://api.moonshot.cn/v1', models: ['', '', ''], keyUrl: 'https://platform.moonshot.cn/console/api-keys', note: '国内直连；保存密钥后在下面「模型分工」里选模型' },
  { id: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1', models: ['gpt-4.1-mini', 'gpt-4.1', ''], keyUrl: 'https://platform.openai.com/api-keys', note: '国内需要系统代理才能连上' },
  { id: 'newapi', name: 'New API / One API 网关', base: '', models: ['', '', ''], note: '自建或中转站的 New API：填站点地址（会自动补 /v1），令牌在站点「令牌」页创建；保存后在下面选模型' },
  { id: 'custom', name: '其他（OpenAI 兼容接口）', base: '', models: ['', '', ''], note: '填服务商给的接口地址（通常以 /v1 结尾）和模型名' },
]
const CUSTOM = AI_PRESETS[AI_PRESETS.length - 1]

/** AI 页右侧控件统一宽度：选择框、地址、密钥、模型名上下对齐 */
const CTRL = 320
// 窄窗口时一起缩（盖掉 .field.inset 默认的 max-width: 46%，否则输入框和选择框宽度不一样）
const COL = { width: CTRL, maxWidth: '50%', flex: 'none' } as const

const hostOf = (u: string) => { try { return new URL(u).host } catch { return u } }
// New API 的 OpenAI 兼容接口在 /v1 下；用户常只填站点首页地址
const withV1 = (u: string) => { try { const x = new URL(u); return x.pathname === '/' || x.pathname === '' ? `${x.origin}/v1` : u.replace(/\/+$/, '') } catch { return u } }

function Ai() {
  const s = useApp()
  const st = s.settings!
  const [key, setKey] = useState('')
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [show, setShow] = useState(false)
  const [test, setTest] = useState<string>('')
  const [base, setBase] = useState(st.aiBase)
  const [models, setModels] = useState({ aiModel: st.aiModel, aiModelFine: st.aiModelFine, aiModelBackup: st.aiModelBackup })
  const [choices, setChoices] = useState<string[]>([])
  // 以存下来的选择为准；早期没存选择的按地址猜
  const preset = AI_PRESETS.find((p) => p.id === st.aiProvider) ?? AI_PRESETS.find((p) => p.base && p.base === st.aiBase) ?? (st.aiBase ? CUSTOM : undefined)
  const loadChoices = () => api.aiModels().then(setChoices).catch(() => setChoices([]))
  useEffect(() => { api.hasAiKey().then((k) => { setHasKey(k); if (k) loadChoices() }) }, [])
  // 地址、模型、密钥齐了才算配好（和后端 ai::configured 一致）
  const recheck = (k: boolean, b: string, m: string) => s.set({ aiConfigured: k && !!b.trim() && !!m.trim() })
  const runTest = async () => {
    setTest('测试中…')
    try { const r = await api.aiTest(); setTest(`已连接 · ${r.model} · ${r.ms} ms`) } catch (e) { setTest(`失败：${errText(e)}`) }
  }
  const pick = async (id: string) => {
    const p = AI_PRESETS.find((x) => x.id === id)!
    if (p.id === preset?.id) return
    // 换服务商：旧密钥是上一家的，不能发给新的一家
    if (hasKey && !await ask(`换成 ${p.name}？之前保存的密钥是上一家服务商的，会一并清除，需要填这家的新密钥。`)) return
    if (hasKey) { await api.setAiKey(''); setHasKey(false); setChoices([]) }
    const m = { aiModel: p.models[0], aiModelFine: p.models[1], aiModelBackup: p.models[2] }
    setBase(p.base); setModels(m); setTest('')
    await s.saveSettings({ aiProvider: p.id, aiBase: p.base, ...m })
    recheck(false, p.base, m.aiModel)
  }
  const saveKey = async () => {
    if (!base.trim()) { s.toast('先填接口地址', { kind: 'err' }); return }
    if (!hasKey) {
      const n = s.accounts.filter((a) => a.aiAllowed).length
      const scope = st.aiAuto && st.aiScope !== 'important' ? `新到的邮件（${st.aiScope === 'all' ? '全部' : '跳过通知和广告'}）会自动` : '你手动点「让 AI 分析」、起草回复时会'
      const ok = await ask(`保存后 AI 开始工作：\n\n· ${scope}把发件人、主题和正文发到 ${hostOf(base)}，生成摘要、分类和待办\n· 涉及 ${n} 个邮箱，每天最多 ${st.aiDailyLimit} 封；可在本页「隐私与安全」里按邮箱关闭\n· 费用按这家服务的价格从你的账户扣，Kojoo Mail 不经手\n\n确定保存吗？`)
      if (!ok) return
    }
    try {
      const ok = await api.setAiKey(key)
      setKey(''); setHasKey(true); s.set({ aiConfigured: ok }); s.toast('密钥已保存'); loadChoices(); runTest()
    } catch (e) { s.toast(`密钥没保存上：${errText(e)}`, { kind: 'err' }) }
  }
  // 改了接口地址（换了主机）：旧密钥不能发给新地址，先问再清掉
  const saveBase = async () => {
    const b = preset?.id === 'newapi' ? withV1(base.trim()) : base.trim()
    setBase(b)
    if (b === st.aiBase) return
    if (hasKey && hostOf(b) !== hostOf(st.aiBase)) {
      if (!await ask(`接口地址换成了 ${hostOf(b) || '空'}，原来的密钥是上一个地址的，会一并清除，需要重新填。继续吗？`)) { setBase(st.aiBase); return }
      await api.setAiKey(''); setHasKey(false); setChoices([]); setTest('')
    }
    await s.saveSettings({ aiBase: b })
    recheck(hasKey === true && hostOf(b) === hostOf(st.aiBase), b, models.aiModel)
  }
  return (
    <>
      <Head title="AI 与模型" lead="用你自己的密钥，接你选的模型服务。密钥只加密保存在这台电脑上；不填就不用 AI，只按本地规则分类。" />
      <section>
        <h2 className="gh">模型服务</h2>
        <div className="group sq">
          <div className="gr" style={{ minHeight: 52 }}>
            <div>
              <label className="lbl" htmlFor="ai-pv">服务商</label>
              {preset && <div className="sub">{preset.note}{preset.keyUrl && <> · <button className="btn link sm" style={{ height: 'auto', padding: 0, fontSize: 'inherit', verticalAlign: 'baseline', color: 'var(--navy)' }} onClick={() => api.openUrl(preset.keyUrl!)}>获取密钥 ↗</button></>}</div>}
            </div>
            <select id="ai-pv" className="field" style={{ ...COL, height: 28, fontSize: 12.5 }} disabled={hasKey === null} value={preset?.id ?? ''} onChange={(e) => pick(e.target.value)}>
              {!preset && <option value="" disabled>请选择</option>}
              {AI_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {preset && (
            <div className="gr"><label className="lbl" htmlFor="ai-base">接口地址</label>
              <input id="ai-base" className="field inset mono" style={{ ...COL }} placeholder={preset.id === 'newapi' ? 'https://你的站点域名' : 'https://…/v1'} value={base} onChange={(e) => setBase(e.target.value)} onBlur={saveBase} />
            </div>
          )}
          {preset && (
            <div className="gr" style={{ minHeight: 52 }}>
              <div><label className="lbl" htmlFor="ai-key">API 密钥</label><div className="sub row" style={{ gap: 4 }}><Icon name="lock" size={12} />{hasKey ? '已用系统加密保存在本机' : '还没填'}</div></div>
              <div className="row" style={{ gap: 6, ...COL }}>
                {/* 显示 / 隐藏按钮放在输入框里，整组和上下的输入框一样宽 */}
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <input id="ai-key" type={show ? 'text' : 'password'} className="field inset mono" style={{ width: '100%', maxWidth: 'none', paddingRight: 30 }} placeholder={hasKey ? '已保存，输入新的可替换' : 'sk-…'} value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && key.trim() && saveKey()} />
                  <button className="tb" style={{ position: 'absolute', right: 2, top: 2, width: 24, height: 24 }} aria-label={show ? '隐藏' : '显示'} onClick={() => setShow(!show)}><Icon name="eye" size={15} /></button>
                </div>
                <button className="btn sm sq" disabled={!key.trim()} onClick={saveKey}>保存</button>
                {hasKey && <button className="btn sm sq" onClick={async () => { if (!await ask('清除密钥？清除后不再调用 AI，只按本地规则分类。')) return; await api.setAiKey(''); setHasKey(false); setChoices([]); setTest(''); recheck(false, base, models.aiModel) }}>清除</button>}
              </div>
            </div>
          )}
          {preset && (
            <div className="gr">
              <span className="dot" style={{ background: test.startsWith('已连接') ? 'var(--green)' : test.startsWith('失败') ? 'var(--accent)' : 'var(--ter)' }} />
              <span style={{ fontSize: 12.5, color: test.startsWith('失败') ? 'var(--accent-text)' : 'var(--sec)' }} className="grow truncate" title={test}>{test || (s.aiConfigured ? '已配置' : '未配置')}</span>
              <button className="btn sm sq" disabled={!hasKey} onClick={runTest}>测试连接</button>
            </div>
          )}
        </div>
      </section>
      <section>
        <h2 className="gh">模型分工</h2>
        <datalist id="ai-model-list">{choices.map((m) => <option key={m} value={m} />)}</datalist>
        <div className="group sq">
          {([['aiModel', '日常分析', '每封新邮件的摘要、分类、待办'], ['aiModelFine', '精细处理', '起草回复、点「重新生成」时；空着就用日常分析的'], ['aiModelBackup', '备用', '上面的模型连不上时自动切换，可以空着']] as const).map(([k, label, sub]) => (
            <div className="gr" key={k} style={{ minHeight: 52 }}><div><div className="lbl">{label}</div><div className="sub">{sub}</div></div>
              <input className="field inset mono" list="ai-model-list" style={{ ...COL }} placeholder={choices.length ? '点击选择或输入' : '模型名'} value={models[k]} onChange={(e) => setModels({ ...models, [k]: e.target.value })} onBlur={() => { if (models[k] !== st[k]) { s.saveSettings({ [k]: models[k].trim() }); if (k === 'aiModel') recheck(!!hasKey, base, models.aiModel) } }} />
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="gh">自动分析</h2>
        <div className="group sq">
          {/* 早期的「分析范围 → 不自动分析」（important）和开关是一回事：统一看成关 */}
          <div className="gr"><div><div className="lbl">新邮件到达时自动分析</div>{!(st.aiAuto && st.aiScope !== 'important') && <div className="sub">关着时只在你点「让 AI 分析」、起草回复时调用 AI</div>}</div>
            <Switch label="自动分析" on={st.aiAuto && st.aiScope !== 'important'} onChange={(v) => s.saveSettings({ aiAuto: v, aiScope: v && st.aiScope === 'important' ? 'skip_bulk' : st.aiScope })} />
          </div>
          {st.aiAuto && st.aiScope !== 'important' && (
            <div className="gr"><span className="lbl">分析范围</span><Seg small value={st.aiScope} onChange={(v) => s.saveSettings({ aiScope: v })} options={[['all', '全部'], ['skip_bulk', '跳过通知和广告']]} /></div>
          )}
          <div className="gr"><span className="lbl">每日上限</span>
            <div className="row" style={{ gap: 8, ...COL }}>
              <input type="number" className="field inset num" style={{ width: 90, textAlign: 'right' }} min={0} max={5000} value={st.aiDailyLimit} onChange={(e) => s.saveSettings({ aiDailyLimit: Number(e.target.value) || 0 })} />
              <span style={{ fontSize: 12.5, color: 'var(--sec)' }}>封 · 今天已用 {s.aiUsedToday}</span>
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2 className="gh">隐私与安全</h2>
        <div className="group sq">
          {s.accounts.map((a) => (
            <div className="gr" key={a.id}>
              <span className="dot" style={{ background: a.color }} />
              <div className="grow"><div className="lbl">{a.label || a.email} 允许发给 AI</div>{!a.aiAllowed && <div className="sub">已关闭：只用本地规则分类，内容不出这台电脑</div>}</div>
              <Switch label={`${a.email} 允许发给 AI`} on={a.aiAllowed} onChange={async (v) => { await api.updateAccount(a.id, { aiAllowed: v }); s.refreshMeta() }} />
            </div>
          ))}
          <div className="gr" style={{ minHeight: 52 }}>
            <Icon name="lock" style={{ color: 'var(--sec)' }} />
            <div className="grow"><div className="lbl">AI 只能起草，不能自动发送</div><div className="sub">防止来信里夹带指令让 AI 代你发信，这一项不能关闭</div></div>
            <span className="tag">始终开启</span>
          </div>
        </div>
      </section>
    </>
  )
}

function NotifyPrivacy() {
  const s = useApp()
  const st = s.settings!
  return (
    <>
      <Head title="通知与隐私" lead="什么时候打扰你，以及邮件里的追踪图片。" />
      <section>
        <h2 className="gh">新邮件通知</h2>
        <div className="group sq">
          <div className="gr" style={{ minHeight: 56 }}><div><div className="lbl">提醒哪些邮件</div><div className="sub">「重点」= AI 判断要尽快处理的、询盘；没开 AI 时提醒所有非广告邮件</div></div>
            <Seg small value={st.notify} onChange={(v) => s.saveSettings({ notify: v })} options={[['important', '只提醒重点'], ['all', '全部'], ['none', '不提醒']]} />
          </div>
          {st.notify !== 'none' && (
            <div className="gr" style={{ minHeight: 56 }}><div><div className="lbl">通知里显示主题和摘要</div><div className="sub">关掉后只显示发件人，锁屏或共享屏幕时别人看不到邮件内容</div></div>
              <Switch label="通知里显示主题和摘要" on={st.notifyPreview} onChange={(v) => s.saveSettings({ notifyPreview: v })} />
            </div>
          )}
        </div>
      </section>
      <section>
        <h2 className="gh">远程图片</h2>
        <div className="group sq">
          <div className="gr" style={{ minHeight: 56 }}><div><div className="lbl">邮件里的网络图片</div><div className="sub">发件人可以通过图片知道你什么时候读了信</div></div>
            <Seg small value={st.remoteImages} onChange={(v) => s.saveSettings({ remoteImages: v })} options={[['ask', '每次手动显示'], ['always', '总是显示']]} />
          </div>
          <div className="gr"><div><div className="lbl">撤销时间</div><div className="sub">发送、归档、删除后多少秒内可以撤销</div></div>
            <Seg small value={String(st.undoSendSecs)} onChange={(v) => s.saveSettings({ undoSendSecs: Number(v) })} options={[['0', '不等待'], ['5', '5 秒'], ['10', '10 秒']]} />
          </div>
        </div>
      </section>
    </>
  )
}

function Keys() {
  const rows: [string, string][] = [
    ['写邮件', 'C'], ['搜索', 'Ctrl K 或 /'], ['全选列表', 'Ctrl A'], ['下一封 / 上一封', 'J / K'], ['回复', 'R'], ['全部回复', 'A'], ['转发', 'F'],
    ['归档', 'E'], ['删除', 'Del'], ['标为重点', 'S'], ['标为已读 / 未读', 'U'], ['发送', 'Ctrl ↵'], ['设置', 'Ctrl ,'], ['关闭弹窗 / 取消选择', 'Esc'],
  ]
  return (
    <>
      <Head title="快捷键" lead="邮件多的时候，用键盘最快。" />
      <div className="group sq">
        {rows.map(([k, v]) => <div className="gr" key={k}><span className="lbl">{k}</span><span className="kbd">{keyText(v)}</span></div>)}
      </div>
    </>
  )
}

function About() {
  const s = useApp()
  return (
    <>
      <Head title="关于" lead="Kojoo Mail：所有邮箱，一个收件箱。" />
      <div className="group sq">
        <div className="gr"><span className="lbl">版本</span>
          <div className="row" style={{ gap: 8 }}>
            <span className="mono" style={{ fontSize: 12.5 }}>{s.version}</span>
            <button className="btn sm sq" onClick={async () => {
              try {
                const u = await api.checkUpdate()
                if (!u) { s.toast('已经是最新版'); return }
                if (await ask(`有新版本 ${u.version}${u.notes ? `

${u.notes}` : ''}

现在下载安装？装好后会自动重启。`)) s.installUpdate(u.version)
              } catch (e) { s.toast(errText(e), { kind: 'err' }) }
            }}>检查更新</button>
          </div>
        </div>
        <div className="gr"><div><div className="lbl">数据存在哪</div><div className="sub mono">{DATA_DIR}（邮件缓存和设置），密码在{VAULT}</div></div></div>
        <div className="gr"><div><div className="lbl">后台资源</div><div className="sub">每个账号只保持一条连接，空闲时等服务器推送，不轮询；AI 一次只处理一封</div></div></div>
        <div className="gr" style={{ minHeight: 52 }}>
          <div><div className="lbl">遇到问题</div><div className="sub">导出连接、同步、发信的记录发给开发者。邮箱地址会打码，不含密码和邮件内容</div></div>
          <button className="btn sm sq" onClick={async () => { try { const p = await api.exportDiagnostics(); s.toast(`已保存：${p}`) } catch (e) { s.toast(errText(e), { kind: 'err' }) } }}>导出诊断信息</button>
        </div>
        <div className="gr"><span className="lbl">彻底退出</span><button className="btn sm sq" onClick={() => { getCurrentWindow().hide(); api.quit() }}>退出 Kojoo Mail</button></div>
      </div>
    </>
  )
}
