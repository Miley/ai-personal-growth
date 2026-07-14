import type { GatewaySettings } from '../types'
import type { ReadingLevel } from '../types'
import { isAiGatewayConfigured, requestAi } from './apiGateway'

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
