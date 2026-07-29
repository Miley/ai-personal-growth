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

export interface SpeechTemplate {
  id: string
  category: 'briefing' | 'persuasion' | 'story' | 'reflection'
  title: string
  audience: string
  minutes: number
  objective: string
  paragraphs: string[]
  studyPoints: string[]
  imitationFocus: string
}

export interface SpeechFeedback {
  source: 'ai' | 'local'
  overall: string
  strengths: string[]
  priority: {
    title: string
    evidence: string
    action: string
  }
  modelOpening: string
  nextPractice: string
}

export interface SpeechPracticeRecord {
  id: string
  date: string
  templateId: string
  templateTitle: string
  transcript: string
  feedback: SpeechFeedback
  createdAt: string
}

export type ReadingLevel = 'starter' | 'bridge' | 'steady'

export interface ReadingUnit {
  id: string
  level: ReadingLevel
  category: 'everyday' | 'parenting' | 'travel' | 'world'
  title: string
  minutes: number
  paragraphs: string[]
  notes: Record<string, string>
  question: string
  answerHint: string
}
