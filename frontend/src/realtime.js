import { wsUrl } from './api.js'

export function getWsUrl(path) {
  return wsUrl(path)
}

// Sends a single live-location ping over a short-lived socket for an active
// emergency case. Never persisted anywhere — the backend only broadcasts it to
// connected doctor tabs, it is not written to any file or patient record.
export function sendLiveLocation({ patientId, patientName, lat, lon }) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(getWsUrl('/ws/doctor'))
    const timeout = setTimeout(() => { ws.close(); reject(new Error('timed out')) }, 8000)
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'live_location', patientId, patientName, lat, lon }))
      clearTimeout(timeout)
      setTimeout(() => ws.close(), 500)
      resolve()
    }
    ws.onerror = () => { clearTimeout(timeout); reject(new Error('connection failed')) }
  })
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
