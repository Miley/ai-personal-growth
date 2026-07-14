import { useState } from 'react'
import { Companion } from './components/Companion'
import { MemoryCenter } from './components/MemoryCenter'
import { Practice } from './components/Practice'
import { Reader } from './components/Reader'
import { Settings } from './components/Settings'
import { loadSettings } from './lib/storage'
import type { GatewaySettings } from './types'

type Tab = 'home' | 'companion' | 'practice' | 'reader' | 'memory' | 'settings'

export function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [settings, setSettings] = useState<GatewaySettings>(loadSettings)
  const [memoryVersion, setMemoryVersion] = useState(0)
  const refreshMemories = () => setMemoryVersion((version) => version + 1)

  const home = <section className="home"><header className="hero"><span className="eyebrow">另一个我</span><h1>给自己一个<br />能慢慢说话的地方。</h1><p>陪伴、表达和英语，不必一次做得很好。</p></header><div className="home-grid"><button onClick={() => setTab('companion')}><span>记录此刻</span><strong>和她聊聊</strong><small>文字、语音、图片都可以从这里开始。</small></button><button onClick={() => setTab('practice')}><span>练一次表达</span><strong>先开口，再延续</strong><small>用低压力对话练社交、向上沟通和会议表达。</small></button><button onClick={() => setTab('reader')}><span>读一点英语</span><strong>从你的生活读起</strong><small>旅行、亲子和世界阅读，按需看解释。</small></button></div><div className="privacy-strip">默认不保存原始图片和录音；你确认的文字才会留下。</div></section>

  return <main className="app-shell">{tab === 'home' && home}{tab === 'companion' && <Companion settings={settings} onMemoryChanged={refreshMemories} />}{tab === 'practice' && <Practice />}{tab === 'reader' && <Reader onMemoryChanged={refreshMemories} settings={settings} />}{tab === 'memory' && <MemoryCenter version={memoryVersion} onChanged={refreshMemories} />}{tab === 'settings' && <Settings initial={settings} onSaved={setSettings} />}<nav className="bottom-nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>主页</button><button className={tab === 'companion' ? 'active' : ''} onClick={() => setTab('companion')}>同伴</button><button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>表达</button><button className={tab === 'reader' ? 'active' : ''} onClick={() => setTab('reader')}>英语</button><button className={tab === 'memory' ? 'active' : ''} onClick={() => setTab('memory')}>记忆</button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>设置</button></nav></main>
}
