import type { GatewaySettings } from '../types'
import { isAiGatewayConfigured, requestAi } from './apiGateway'

export async function transcribeAudio(audioDataUrl: string, settings: GatewaySettings): Promise<string> {
  if (!isAiGatewayConfigured(settings)) throw new Error('请先配置阿里云 AI 服务地址。')

  const data = await requestAi<{ text: string }>('transcribe', { audioDataUrl }, settings)
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('云端没有返回可用的转写文字。')
  return data.text.trim()
}
