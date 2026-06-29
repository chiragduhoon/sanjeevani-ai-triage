import { wsUrl } from './api.js'

export function getWsUrl(path) {
  return wsUrl(path)
}

export function connectDoctorSocket({ onMessage, onStatus }) {
  let ws = null
  let retry = 0
  let retryTimer = null
  let closed = false
  const setStatus = (v) => { if (onStatus) onStatus(v) }
  const open = () => {
    if (closed) return
    ws = new WebSocket(getWsUrl('/ws/doctor'))
    ws.onopen = () => {
      retry = 0
      setStatus(true)
    }
    ws.onmessage = (event) => {
      let message
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }
      onMessage(message)
    }
    ws.onerror = () => {
      setStatus(false)
    }
    ws.onclose = () => {
      setStatus(false)
      if (closed) return
      const delay = Math.min(1000 * 2 ** retry, 15000)
      retry += 1
      retryTimer = setTimeout(open, delay)
    }
  }
  open()
  return {
    close() {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      if (ws) {
        ws.onclose = null
        ws.onerror = null
        try { ws.close() } catch {}
      }
    },
  }
}
