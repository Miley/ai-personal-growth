import { useState } from 'react'
import { clearAllLocalData, saveSettings } from '../lib/storage'
import type { GatewaySettings } from '../types'

export function Settings({ initial, onSaved }: { initial: GatewaySettings; onSaved: (settings: GatewaySettings) => void }) {
  const [settings, setSettings] = useState(initial)
  const [saved, setSaved] = useState(false)
  const update = (key: keyof GatewaySettings, value: string) => setSettings((current) => ({ ...current, [key]: value }))

  return (
    <section className="mode-page settings-page">
      <header className="mode-header"><span className="eyebrow">设置</span><h1>云端与隐私</h1><p>不配置也能使用本地演示、阅读和隐私管理；配置后才会在你点击发送时调用阿里云服务。</p></header>
      <div className="privacy-card"><strong>默认规则</strong><ul><li>不自动读取相册。</li><li>原始图片和录音只用于本次处理，默认不保存。</li><li>只有你确认后，文字摘要才进入长期记忆。</li></ul></div>
      <label className="field-label">阿里云 AI 服务地址<input value={settings.apiBaseUrl} onChange={(event) => update('apiBaseUrl', event.target.value)} placeholder="https://…fcapp.run" /></label>
      <p className="composer-notice">百炼 API Key 只保存在阿里云函数计算中，不会保存到这台设备。语音转写已内置，无需另填端点。</p>
      <button className="primary" onClick={() => { saveSettings(settings); onSaved(settings); setSaved(true) }}>保存设置</button>{saved && <span className="saved">已保存到本机。</span>}
      <hr />
      <button className="danger" onClick={() => { if (window.confirm('确定删除这台设备上的所有记忆和网关设置吗？')) { clearAllLocalData(); window.location.reload() } }}>删除全部本地数据</button>
    </section>
  )
}
