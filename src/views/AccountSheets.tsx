import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { useApp } from '../store'
import { api, errText } from '../lib/api'
import { ACCOUNT_COLORS, ago, fullTime } from '../lib/format'
import { PROVIDERS, canOAuth, guessHosts, methodOf, providerFor, type Provider } from '../lib/providers'
import { Kojoo, Sheet } from '../ui'

export function ProviderGlyph({ p }: { p: Provider }) {
  if (p.id === 'icloud') return <span className="g"><Icon name="cloud" size={14} /></span>
  if (p.id === 'imap') return <span className="g"><Icon name="at" size={14} /></span>
  // 等宽字体里 O 像 0，换成正文字体
  if (p.id === 'outlook') return <span className="g" style={{ font: '600 12.5px var(--sans)' }}>O</span>
  if (p.id === 'kojoo') return <span className="g" style={{ font: "italic 400 17px/1 'Instrument Serif', serif", paddingBottom: 2 }}>k</span>
  return <span className="g" style={{ fontSize: p.glyph.length > 2 ? 9.5 : 11 }}>{p.glyph}</span>
}

export function AddAccount() {
  const s = useApp()
  const preset = typeof s.addAccount === 'string' && s.addAccount !== 'pick' ? PROVIDERS.find((p) => p.id === s.addAccount) : undefined
  const [p, setP] = useState<Provider>(preset || PROVIDERS[0])
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [label, setLabel] = useState('')
  // 发件人名字：对方收件箱里显示的名字。默认沿用已有账号的
  const [name, setName] = useState(s.accounts.find((a) => a.displayName)?.displayName ?? '')
  const [color, setColor] = useState(ACCOUNT_COLORS[s.accounts.length % ACCOUNT_COLORS.length])
  const [adv, setAdv] = useState(false)
  const [h, setH] = useState({ imapHost: p.imapHost, imapPort: p.imapPort, smtpHost: p.smtpHost, smtpPort: p.smtpPort, smtpTls: p.smtpTls, username: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // Gmail 也能改用应用专用密码
  const [usePass, setUsePass] = useState(false)
  // 浏览器里正在登录
  const [waiting, setWaiting] = useState(false)
  const oauthOn = canOAuth(p, s.oauth) && !usePass
  const unavailable = !!p.oauth && !canOAuth(p, s.oauth) && p.id === 'outlook'

  useEffect(() => { setH({ imapHost: p.imapHost, imapPort: p.imapPort, smtpHost: p.smtpHost, smtpPort: p.smtpPort, smtpTls: p.smtpTls, username: '' }); setErr(''); setUsePass(false); if (p.id === 'imap') setAdv(true) }, [p.id])
  // 关掉窗口时，浏览器那边的登录也不再等
  useEffect(() => () => { api.oauthCancel().catch(() => {}) }, [])
  // 输入邮箱后自动识别服务商 / 猜服务器
  useEffect(() => {
    const auto = providerFor(email)
    // 不在列表里的（kojoo）任何时候都识别；改成别的地址时退回「其他邮箱」
    if (auto && auto.id !== p.id && (p.id === 'imap' || auto.hidden)) setP(auto)
    else if (!auto && p.hidden) setP(PROVIDERS.find((x) => x.id === 'imap')!)
    if (p.id === 'imap' && email.includes('@')) {
      const g = guessHosts(email)
      setH((x) => ({ ...x, imapHost: x.imapHost && !x.imapHost.startsWith('imap.') ? x.imapHost : g.imap, smtpHost: x.smtpHost && !x.smtpHost.startsWith('smtp.') ? x.smtpHost : g.smtp }))
    }
  }, [email])

  // 正在验证收信发信时不能关（关了后台还在加账号）；浏览器登录中可以关，会顺带取消
  const close = () => { if (busy && !waiting) return; s.set({ addAccount: false }) }
  const done = async () => {
    const first = s.accounts.length === 0
    await s.refreshMeta()
    s.set({ addAccount: false })
    // 第一个账号：顺便提示有教程
    if (first) s.toast('已添加，正在下载邮件', { action: { label: '看教程', run: () => s.set({ page: 'settings', settingsTab: 'guide' }) }, ttl: 8000 })
    else s.toast('已添加，正在下载邮件')
    s.go({ kind: 'all' })
  }
  const oauthSubmit = async () => {
    setErr('')
    if (!name.trim()) { setErr('请填写发件人名字'); return }
    setBusy(true); setWaiting(true)
    try {
      const g = await api.oauthLogin(p.id, email.trim() || undefined)
      setWaiting(false)
      await api.addAccount({
        email: g.email, password: '', provider: p.id, displayName: name.trim(), label: label.trim() || p.name, color,
        imapHost: p.imapHost, imapPort: p.imapPort, smtpHost: p.smtpHost, smtpPort: p.smtpPort, smtpTls: p.smtpTls, saveSent: p.saveSent, oauthTicket: g.ticket,
      })
      await done()
    } catch (e) { const t = errText(e); if (t !== '已取消') setErr(t) } finally { setBusy(false); setWaiting(false) }
  }
  const submit = async () => {
    if (oauthOn) return oauthSubmit()
    if (unavailable) return
    setErr('')
    if (!name.trim()) { setErr('请填写发件人名字'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('邮箱地址不对'); return }
    if (!pass) { setErr(`请填写${p.codeLabel}`); return }
    if (!h.imapHost || !h.smtpHost) { setErr('请填写收信和发信服务器'); setAdv(true); return }
    // 收信只支持直接加密连接（SSL），143 这种明文再升级的端口连不上
    if (h.imapPort === 143) { setErr('收信服务器请用 SSL 加密端口（一般是 993），143 端口暂不支持'); setAdv(true); return }
    setBusy(true)
    try {
      await api.addAccount({
        email: email.trim(), password: pass, provider: p.id, displayName: name.trim(), label: label.trim() || p.name, color,
        username: h.username || undefined, imapHost: h.imapHost.trim(), imapPort: h.imapPort, smtpHost: h.smtpHost.trim(), smtpPort: h.smtpPort, smtpTls: h.smtpTls, saveSent: p.saveSent,
      })
      await done()
    } catch (e) { setErr(errText(e)) } finally { setBusy(false) }
  }

  const labelColor = (
    <>
    <div>
      <label className="label" htmlFor="a-name">发件人名字</label>
      <input id="a-name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="比如 张三 或 Kojoo Trading" />
      <div className="hint">对方收到信时看到的名字{name && s.accounts.some((a) => a.displayName === name) ? '（沿用了你其他邮箱的，公司邮箱记得改）' : ''}，之后可以在「设置 → 账号」里改。</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'end' }}>
      <div><label className="label" htmlFor="a-label">显示名称</label><input id="a-label" className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`比如 外贸 · ${p.name}`} /></div>
      <div>
        <div className="label" style={{ marginBottom: 9 }}>颜色</div>
        <div className="row" style={{ gap: 8, height: 26 }}>
          {ACCOUNT_COLORS.map((c) => <button key={c} aria-label={`颜色 ${c}`} onClick={() => setColor(c)} style={{ width: 18, height: 18, border: 0, borderRadius: '50%', padding: 0, background: c, cursor: 'pointer', boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 3.5px ${c}` : 'none' }} />)}
        </div>
      </div>
    </div>
    </>
  )

  return (
    <Sheet onClose={close} label="添加邮箱账号" className="">
      <div className="sh-head">
        <div className="grow"><h1>添加邮箱账号</h1><p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--sec)' }}>登录凭证只加密保存在这台电脑上。</p></div>
        <button className="tb" aria-label="关闭" onClick={close}><Icon name="x" /></button>
      </div>
      <div className="sh-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
          {PROVIDERS.filter((x) => !x.hidden).map((x) => (
            <button key={x.id} className={`pv sq${x.id === p.id || (p.hidden && x.id === 'imap') ? ' on' : ''}`} style={{ height: 'auto', flexDirection: 'column', gap: 4, padding: '10px 6px', textAlign: 'center' }} disabled={busy} onClick={() => setP(x)} aria-pressed={x.id === p.id}>
              <ProviderGlyph p={x} />
              <span style={{ fontSize: 12.5 }}>{x.name}</span>
              <span style={{ fontSize: 11, color: 'var(--sec)', fontWeight: 400 }}>{methodOf(x, s.oauth)}</span>
            </button>
          ))}
        </div>

        {oauthOn ? (
          <div className="group sq" style={{ padding: 16, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <Icon name="lock" style={{ marginTop: 2, flex: 'none' }} />
              <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                <div style={{ fontWeight: 600 }}>用{p.oauth!.brand}账号登录</div>
                <div style={{ color: 'var(--sec)' }}>点「在浏览器中登录」，在{p.oauth!.brand}的页面登录并允许 Kojoo Mail 收发邮件，完成后自动回到这里。密码只在{p.oauth!.brand}的页面上输入，Kojoo Mail 拿不到。</div>
                {p.id === 'gmail' && <div style={{ color: 'var(--sec)' }}>国内需要能访问谷歌的网络。谷歌页面如果提示「Google 尚未验证此应用」，点「高级 → 转至 Kojoo Mail」继续即可；不放心也可以点下面的「改用应用专用密码」。</div>}
                {p.id === 'outlook' && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontWeight: 600 }}>登录前先打开 IMAP：</span>
                    <span style={{ color: 'var(--sec)' }}>在 </span>
                    <a href="https://outlook.live.com/mail/0/options/mail/forwarding" onClick={(e) => { e.preventDefault(); api.openUrl('https://outlook.live.com/mail/0/options/mail/forwarding') }}>Outlook 网页版</a>
                    <span style={{ color: 'var(--sec)' }}>「设置 → 邮件 → 转发和 IMAP」里打开「允许设备和应用使用 IMAP」并保存，否则收信会被拒绝。公司邮箱由管理员统一设置。</span>
                  </div>
                )}
              </div>
            </div>
            {labelColor}
          </div>
        ) : unavailable ? (
          <div className="group sq" style={{ padding: 16, marginTop: 18, fontSize: 13, lineHeight: 1.65, color: 'var(--sec)' }}>
            Outlook 只能用微软账号授权登录，这个版本暂时不支持。可以先在 Outlook 网页版收发，或把 Outlook 的信转发到别的邮箱。
          </div>
        ) : (
        <div className="group sq" style={{ padding: 16, marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label" htmlFor="a-email">邮箱地址</label>
            <input id="a-email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={p.domains[0] ? `name@${p.domains[0]}` : 'name@company.com'} autoFocus />
          </div>
          <div>
            <div className="row" style={{ marginBottom: 6 }}>
              <label className="label" htmlFor="a-pass" style={{ margin: 0 }}>{p.codeLabel}</label>
              {p.helpUrl && <button className="btn link sm" style={{ marginLeft: 'auto', height: 18 }} onClick={() => api.openUrl(p.helpUrl!)}>{p.helpLabel ?? `如何获取${p.codeLabel}？`}</button>}
            </div>
            <input id="a-pass" className="field" type="password" value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <div className="hint">{p.help}</div>
          </div>
          {labelColor}
        </div>
        )}

        <div className="row" style={{ marginTop: 10, gap: 16 }}>
        {!oauthOn && !unavailable && <button className="btn link sm" style={{ color: 'var(--ink-2)' }} onClick={() => setAdv(!adv)}>
          <Icon name={adv ? 'down' : 'right'} size={13} />高级设置
          {!adv && <span className="mono" style={{ marginLeft: 8, fontSize: 12, color: 'var(--sec)' }}>{h.imapHost || '—'}:{h.imapPort} · {h.smtpHost || '—'}:{h.smtpPort}</span>}
        </button>}
        {p.id === 'gmail' && canOAuth(p, s.oauth) && (
          <button className="btn link sm" style={{ marginLeft: 'auto', color: 'var(--ink-2)' }} disabled={busy} onClick={() => { setUsePass(!usePass); setErr('') }}>
            {usePass ? '改用一键登录' : '改用应用专用密码'}
          </button>
        )}
        </div>
        {adv && !oauthOn && !unavailable && (
          <div className="group sq" style={{ marginTop: 8 }}>
            <div className="gr"><span className="lbl">收信服务器（IMAP）</span><div className="row" style={{ gap: 6 }}><input className="field inset mono" style={{ width: 200 }} value={h.imapHost} onChange={(e) => setH({ ...h, imapHost: e.target.value })} /><input className="field inset mono" style={{ width: 70 }} value={h.imapPort} onChange={(e) => setH({ ...h, imapPort: Number(e.target.value) || 993 })} /></div></div>
            <div className="gr"><span className="lbl">发信服务器（SMTP）</span><div className="row" style={{ gap: 6 }}><input className="field inset mono" style={{ width: 200 }} value={h.smtpHost} onChange={(e) => setH({ ...h, smtpHost: e.target.value })} /><input className="field inset mono" style={{ width: 70 }} value={h.smtpPort} onChange={(e) => { const v = Number(e.target.value) || 465; setH({ ...h, smtpPort: v, smtpTls: v === 465 }) }} /></div></div>
            <div className="gr"><div><div className="lbl">登录用户名</div><div className="sub">一般就是邮箱地址，少数企业邮箱不一样</div></div><input className="field inset" style={{ width: 200 }} value={h.username} placeholder="同邮箱地址" onChange={(e) => setH({ ...h, username: e.target.value })} /></div>
          </div>
        )}
        {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
      </div>
      <div className="sh-foot">
        <span className="row" style={{ gap: 6, fontSize: 12, color: 'var(--sec)' }}>{busy ? <><span style={{ color: 'var(--ink)', display: 'inline-flex' }}><Kojoo width={28} stroke={7} /></span>{waiting ? '正在等浏览器里完成登录…' : '正在验证收信和发信…'}</> : <><Icon name="lock" size={14} />会先验证收信和发信都能连通</>}</span>
        {/* 浏览器登录中：「取消」只停掉这次登录，不关窗口 */}
        <button className="btn sq" style={{ marginLeft: 'auto' }} disabled={busy && !waiting} onClick={waiting ? () => api.oauthCancel() : close}>取消</button>
        <button className="btn primary sq" disabled={busy || unavailable} onClick={submit}>{oauthOn ? '在浏览器中登录' : '连接'}</button>
      </div>
    </Sheet>
  )
}

export function RepairAccount() {
  const s = useApp()
  const a = s.accounts.find((x) => x.id === s.repairAccount)
  const st = a ? s.status[a.id] : undefined
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [showLog, setShowLog] = useState(false)
  // 应用专用密码登录的 Gmail，也可以在这里改成一键登录
  const [switchOAuth, setSwitchOAuth] = useState(false)
  useEffect(() => () => { api.oauthCancel().catch(() => {}) }, [])
  if (!a) return null
  const p = PROVIDERS.find((x) => x.id === a.provider) || PROVIDERS[PROVIDERS.length - 1]
  const viaOAuth = (a.auth === 'oauth' || switchOAuth) && canOAuth(p, s.oauth)
  const close = () => s.set({ repairAccount: null })
  const auth = st?.errorKind === 'auth' || !st || st.state !== 'offline'
  const submit = async () => {
    if (viaOAuth) {
      setBusy(true); setErr('')
      try {
        const g = await api.oauthLogin(p.id, a.email)
        await api.updateAccount(a.id, { oauthTicket: g.ticket })
        await s.refreshMeta()
        close(); s.toast('已重新登录，正在补齐邮件')
      } catch (e) { const t = errText(e); if (t !== '已取消') setErr(t) } finally { setBusy(false) }
      return
    }
    if (!pass) { setErr(`请填写新的${p.codeLabel}`); return }
    setBusy(true); setErr('')
    try { await api.updateAccount(a.id, { password: pass }); close(); s.toast('已重新连接，正在补齐邮件') } catch (e) { setErr(errText(e)) } finally { setBusy(false) }
  }
  const what = a.auth === 'oauth' ? '登录授权' : p.codeLabel
  return (
    <Sheet onClose={close} label={`${a.email} 无法同步`}>
      <div className="sh-head" style={{ gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="alert" size={20} /></div>
        <div className="grow">
          <h1>{st?.state === 'error' || st?.state === 'offline' ? `${a.label || a.email} 无法同步` : a.auth === 'oauth' ? `重新登录 ${a.label || a.email}` : `更换 ${a.label || a.email} 的${p.codeLabel}`}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--sec)' }}>
            {st?.state === 'offline' ? '暂时连不上邮件服务器，网络恢复后会自动重连。' : st?.state === 'error' ? `邮件服务器拒绝了登录，${what}可能已修改、过期或被撤销。期间收到的邮件不会丢，重新连接后会自动补齐。` : viaOAuth ? '在浏览器里重新登录同一个账号，验证通过后才会替换。' : '新的密码验证通过后才会替换。'}
          </p>
        </div>
        <button className="tb" aria-label="关闭" onClick={close}><Icon name="x" /></button>
      </div>
      <div className="sh-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {st && (st.state === 'error' || st.state === 'offline') && (
          <div className="group sq">
            <div className="gr" style={{ minHeight: 38, fontSize: 12.5 }}><span style={{ color: 'var(--sec)' }}>上次成功同步</span><span className="num">{st.lastOk ? `${fullTime(st.lastOk)}（${ago(st.lastOk)}）` : '还没有成功过'}</span></div>
            {st.errorKind === 'auth' && <div className="gr" style={{ minHeight: 38, fontSize: 12.5 }}><span style={{ color: 'var(--sec)' }}>自动重试</span><span>{st.fails >= 3 ? '已暂停（连续失败 3 次，避免被服务器封禁）' : `已失败 ${st.fails} 次，1 分钟后再试`}</span></div>}
            <button className="gr" style={{ width: '100%', border: 0, background: 'transparent', fontSize: 12.5, color: 'var(--sec)', cursor: 'pointer' }} aria-expanded={showLog} onClick={() => setShowLog(!showLog)}>
              <Icon name={showLog ? 'down' : 'right'} size={13} />技术细节
            </button>
            {showLog && (
              <div className="mono" style={{ padding: '0 14px 12px 31px', fontSize: 11.5, lineHeight: 1.6, color: 'var(--sec)', userSelect: 'text', wordBreak: 'break-all' }}>
                {a.imapHost}:{a.imapPort}<br />{st.error}
                {st.log.slice(-6).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        )}
        {auth && viaOAuth && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 12, fontSize: 13, lineHeight: 1.65 }}>
            <Icon name="lock" style={{ marginTop: 2, flex: 'none' }} />
            <div style={{ color: 'var(--sec)' }}>点「在浏览器中登录」，用 <span style={{ color: 'var(--ink)' }}>{a.email}</span> 登录{p.oauth!.brand}账号并允许访问，完成后自动回到这里。</div>
          </div>
        )}
        {auth && !viaOAuth && a.auth === 'oauth' && <div style={{ fontSize: 13, color: 'var(--sec)' }}>这个版本没有配置{p.oauth?.brand ?? ''}登录，没法重新授权。</div>}
        {auth && !viaOAuth && a.auth !== 'oauth' && (
          <div>
            <div className="row" style={{ marginBottom: 6 }}>
              <label className="label" htmlFor="r-pass" style={{ margin: 0 }}>新的{p.codeLabel}</label>
              {p.helpUrl && <button className="btn link sm" style={{ marginLeft: 'auto', height: 18 }} onClick={() => api.openUrl(p.helpUrl!)}>在哪里找？</button>}
            </div>
            <input id="r-pass" className="field" type="password" value={pass} autoFocus onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder={`粘贴新的${p.codeLabel}`} />
            <div className="hint">{p.help}</div>
            {canOAuth(p, s.oauth) && <button className="btn link sm" style={{ marginTop: 8, color: 'var(--ink-2)' }} onClick={() => { setSwitchOAuth(true); setErr('') }}>改用一键登录</button>}
          </div>
        )}
        {err && <div className="err">{err}</div>}
      </div>
      <div className="sh-foot">
        {st?.state === 'offline' && <button className="btn link sq" onClick={() => { api.retryAccount(a.id); close() }}>立即重试</button>}
        <button className="btn sq" style={{ marginLeft: 'auto' }} onClick={close}>稍后处理</button>
        {auth && (viaOAuth || a.auth !== 'oauth') && <button className="btn primary sq" disabled={busy} onClick={submit}>{busy ? (viaOAuth ? '等浏览器里完成登录…' : '正在验证…') : viaOAuth ? '在浏览器中登录' : '重新连接'}</button>}
      </div>
    </Sheet>
  )
}
