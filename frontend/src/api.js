const BACKEND = typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : ''

export function apiUrl(path) {
  return `${BACKEND}${path}`
}

export function wsUrl(path) {
  if (BACKEND) {
    return BACKEND.replace('https://', 'wss://').replace('http://', 'ws://') + path
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}
