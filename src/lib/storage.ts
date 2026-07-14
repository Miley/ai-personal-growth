import type { GatewaySettings, Memory, MemoryScope } from '../types'

const memoriesKey = 'another-me:memories'
const settingsKey = 'another-me:gateway-settings'

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadMemories(scope: MemoryScope): Memory[] {
  return readJson<Memory[]>(memoriesKey, [])
    .filter((memory) => memory.scope === scope)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function saveMemory(input: Pick<Memory, 'scope' | 'text'>): Memory[] {
  const memories = readJson<Memory[]>(memoriesKey, [])
  const memory: Memory = {
    id: `memory-${crypto.randomUUID()}`,
    scope: input.scope,
    text: input.text.trim(),
    createdAt: new Date().toISOString(),
  }
  const next = [memory, ...memories]
  localStorage.setItem(memoriesKey, JSON.stringify(next))
  return next.filter((item) => item.scope === input.scope)
}

export function deleteMemory(id: string): void {
  const next = readJson<Memory[]>(memoriesKey, []).filter((memory) => memory.id !== id)
  localStorage.setItem(memoriesKey, JSON.stringify(next))
}

export function clearMemories(scope: MemoryScope): Memory[] {
  const next = readJson<Memory[]>(memoriesKey, []).filter((memory) => memory.scope !== scope)
  localStorage.setItem(memoriesKey, JSON.stringify(next))
  return []
}

export function loadSettings(): GatewaySettings {
  return readJson<GatewaySettings>(settingsKey, {
    apiBaseUrl: '',
  })
}

export function saveSettings(settings: GatewaySettings): void {
  localStorage.setItem(settingsKey, JSON.stringify(settings))
}

export function clearAllLocalData(): void {
  localStorage.removeItem(memoriesKey)
  localStorage.removeItem(settingsKey)
}
