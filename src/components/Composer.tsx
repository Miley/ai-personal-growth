import { useRef, useState } from 'react'
import type { GatewaySettings } from '../types'
import { transcribeAudio } from '../lib/modelStudio'
import { isAiGatewayConfigured } from '../lib/apiGateway'

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: (imageDataUrl?: string) => void
  disabled?: boolean
  settings: GatewaySettings
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function Composer({ value, onChange, onSend, disabled, settings }: Props) {
  const [imageDataUrl, setImageDataUrl] = useState<string>()
  const [recording, setRecording] = useState(false)
  const [notice, setNotice] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)

  const chooseImage = async (file?: File) => {
    if (!file) return
    setImageDataUrl(await readAsDataUrl(file))
    setNotice('图片只在点击发送时才会上传用于当次理解。')
  }

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      recorder.ondataavailable = (event) => chunks.push(event.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (!isAiGatewayConfigured(settings)) {
          setNotice('录音只保留在本次浏览器会话；配置阿里云 AI 服务地址后，可自动转成文字。')
          return
        }
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        setNotice('正在转写…')
        try {
          onChange(await transcribeAudio(await readAsDataUrl(audio), settings))
          setNotice('已将本次语音转成文字。')
        } catch {
          setNotice('转写没有成功，请检查百炼工作空间、密钥和网络连接。')
        }
      }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setNotice('正在录音；再次点击结束。')
    } catch {
      setNotice('需要麦克风权限才能录音。')
    }
  }

  const submit = () => {
    if ((!value.trim() && !imageDataUrl) || disabled) return
    onSend(imageDataUrl)
    onChange('')
    setImageDataUrl(undefined)
    setNotice('')
  }

  return (
    <div className="composer">
      {imageDataUrl && (
        <div className="image-preview">
          <img src={imageDataUrl} alt="待发送图片预览" />
          <button type="button" onClick={() => setImageDataUrl(undefined)}>移除</button>
        </div>
      )}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="写一点、说一点，或者发一张图…"
        rows={3}
      />
      <div className="composer-actions">
        <label className="icon-button">
          图片
          <input type="file" accept="image/*" onChange={(event) => chooseImage(event.target.files?.[0])} />
        </label>
        <button type="button" className={recording ? 'recording' : ''} onClick={toggleRecording}>
          {recording ? '结束录音' : '语音'}
        </button>
        <button type="button" className="primary" onClick={submit} disabled={disabled || (!value.trim() && !imageDataUrl)}>
          {disabled ? '正在回应…' : '发送'}
        </button>
      </div>
      {notice && <p className="composer-notice">{notice}</p>}
    </div>
  )
}
