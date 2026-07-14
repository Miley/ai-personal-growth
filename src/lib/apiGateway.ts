import type { GatewaySettings } from '../types'

export function configuredApiBaseUrl(settings?: GatewaySettings): string {
  return String(settings?.apiBaseUrl || import.meta.env.VITE_AI_API_BASE || '').replace(/\/$/, '')
}

export function isAiGatewayConfigured(settings?: GatewaySettings): boolean {
  return Boolean(configuredApiBaseUrl(settings))
}

export async function requestAi<T>(action: string, payload: object, settings?: GatewaySettings): Promise<T> {
  const apiBaseUrl = configuredApiBaseUrl(settings)
  if (!apiBaseUrl) throw new Error('尚未配置阿里云 AI 服务地址。')

  const response = await fetch(apiBaseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  })
  if (!response.ok) throw new Error('云端服务暂时不可用。')
  return response.json() as Promise<T>
}
