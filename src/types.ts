export type MemoryScope = 'companion' | 'practice' | 'english'

export interface Memory {
  id: string
  scope: MemoryScope
  text: string
  createdAt: string
}

export interface MemoryExport {
  version: 1
  exportedAt: string
  source: 'iphone-pwa'
  memories: Memory[]
}

export interface GatewaySettings {
  apiBaseUrl: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: string
  imageDataUrl?: string
}

export type PracticeLevel = 'quick' | 'standard' | 'deep'

export interface PracticeScenario {
  id: string
  category: 'social' | 'upward' | 'meeting'
  title: string
  setup: string
  goal: string
  partnerOpening: string
}

export type ReadingLevel = 'starter' | 'bridge' | 'steady'

export interface ReadingUnit {
  id: string
  level: ReadingLevel
  category: 'parenting' | 'travel' | 'world'
  title: string
  minutes: number
  paragraphs: string[]
  notes: Record<string, string>
  question: string
  answerHint: string
}
