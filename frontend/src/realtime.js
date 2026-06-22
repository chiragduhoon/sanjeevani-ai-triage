// Centralized real-time helpers.
//
// Why this exists: every page used to hardcode `ws://localhost:8000/ws/doctor`,
// which only works on the machine running the backend. From a phone on the LAN, or
// once the app is served by the backend in production, that host is wrong and live
// updates silently fail. Deriving the host from window.location fixes all of that:
// in dev it rides the Vite `/ws` proxy (see vite.config.js); in prod it targets
// whatever host served the page.

/** Build an absolute ws(s):// URL for a same-origin path like "/ws/doctor". */
export function getWsUrl(path) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}

/**
 * Open a self-healing WebSocket to the doctor channel.
 *
 * Reconnects automatically with capped exponential backoff on close/error so a
 * backend restart or a network blip recovers on its own instead of leaving the
 * view permanently stale.
 *
 * @param {(message: any) => void} onMessage  parsed JSON message handler
 * @param {(connected: boolean) => void} [onStatus]  connection state changes
 * @returns {{ close: () => void }}  call close() to tear down and stop retrying
 */
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
        return // ignore non-JSON frames (e.g. "pong")
      }
      onMessage(message)
    }

    ws.onerror = () => {
      // onclose fires right after; let it drive the reconnect.
      setStatus(false)
    }

    ws.onclose = () => {
      setStatus(false)
      if (closed) return
      // 1s, 2s, 4s, 8s ... capped at 15s
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
        // Drop handlers so the teardown close() doesn't schedule a reconnect.
        ws.onclose = null
        ws.onerror = null
        try { ws.close() } catch {}
      }
    },
  }
}
