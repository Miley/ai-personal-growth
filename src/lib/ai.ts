import type { GatewaySettings } from '../types'
import type { ReadingLevel } from '../types'
import type { SpeechFeedback, SpeechTemplate } from '../types'
import { isAiGatewayConfigured, requestAi } from './apiGateway'
import { createLocalSpeechFeedback } from './learning'

const companionSystemPrompt = `你是一个温和、清醒、私密的 AI 同伴。先复述和澄清用户的经历，再给一个可选视角。不要诊断心理问题，不要假装真人，不要替用户做决定。回复使用简洁中文。`

export async function getCompanionReply(
  text: string,
  settings?: GatewaySettings,
  imageDataUrl?: string,
): Promise<string> {
  if (!isAiGatewayConfigured(settings)) {
    return `我听到你说：“${text.trim()}”。这件事里，你现在更想谈谈当时没说话的原因，还是那个其实想说却没有说出口的想法？`
  }

  const data = await requestAi<{ text: string }>('chat', { text, imageDataUrl }, settings)
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('云端没有返回有效回复。')
  return data.text.trim()
}

export interface GeneratedReading {
  title: string
  body: string
}

export async function createReadingFromImage(
  imageDataUrl: string | undefined,
  settings: GatewaySettings | undefined,
  level: ReadingLevel,
): Promise<GeneratedReading> {
  if (!imageDataUrl || !isAiGatewayConfigured(settings)) {
    return {
      title: 'A Small Moment',
      body: 'This is a simple English reading draft from a small moment in your day. Look at one detail, name it, and say how it makes you feel. When your image gateway is configured, this page can create a reading from the photo you choose.',
    }
  }

  const data = await requestAi<GeneratedReading>('reading', { imageDataUrl, level }, settings)
  if (!data.title?.trim() || !data.body?.trim()) throw new Error('图片阅读没有返回可用内容。')
  return { title: data.title.trim(), body: data.body.trim() }
}

function isSpeechFeedback(value: unknown): value is Omit<SpeechFeedback, 'source'> {
  if (!value || typeof value !== 'object') return false
  const feedback = value as Partial<SpeechFeedback>
  return Boolean(
    typeof feedback.overall === 'string'
    && Array.isArray(feedback.strengths)
    && feedback.strengths.length >= 2
    && feedback.strengths.every((item) => typeof item === 'string')
    && feedback.priority
    && typeof feedback.priority.title === 'string'
    && typeof feedback.priority.evidence === 'string'
    && typeof feedback.priority.action === 'string'
    && typeof feedback.modelOpening === 'string'
    && typeof feedback.nextPractice === 'string',
  )
}

export async function getSpeechFeedback(
  template: SpeechTemplate,
  transcript: string,
  settings?: GatewaySettings,
): Promise<SpeechFeedback> {
  if (!isAiGatewayConfigured(settings)) return createLocalSpeechFeedback(transcript)

  try {
    const data = await requestAi<Omit<SpeechFeedback, 'source'>>('speech-feedback', {
      template: {
        title: template.title,
        objective: template.objective,
        imitationFocus: template.imitationFocus,
        sample: template.paragraphs.join('\n'),
      },
      transcript,
    }, settings)
    if (!isSpeechFeedback(data)) throw new Error('演讲反馈格式无效。')
    return { ...data, source: 'ai' }
  } catch {
    return createLocalSpeechFeedback(transcript)
  }
}
