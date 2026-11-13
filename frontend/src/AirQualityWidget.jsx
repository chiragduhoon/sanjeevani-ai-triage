import React, { useState } from 'react'
import { apiUrl } from './api.js'
import { s } from './styles'

// Free, keyless reverse-geocode — resolves coordinates to a locality name
// client-side. Only the resulting name (never the coordinates) is attached to
// the triage submission.
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

const BAND_COLORS = {
  Good: '#059669', Satisfactory: '#65A30D', Moderate: '#D97706',
  Poor: '#EA580C', 'Very Poor': '#DC2626', Severe: '#991B1B',
}

export default function AirQualityWidget({ onChange, lang = 'en' }) {
  const isHindi = lang === 'hi'
  const [status, setStatus] = useState('idle') // idle | loading | ready | error
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const check = () => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError(isHindi ? 'यह डिवाइस लोकेशन सपोर्ट नहीं करता।' : 'Location is not supported on this device.')
      return
    }
    setStatus('loading')
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const [geoRes, aqRes] = await Promise.all([
            fetch(`${REVERSE_GEOCODE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=en`).catch(() => null),
            fetch(apiUrl(`/api/air-quality?lat=${lat}&lon=${lon}`)),
          ])
          const geo = geoRes && geoRes.ok ? await geoRes.json() : null
          const locality = geo ? [geo.locality || geo.city, geo.principalSubdivision].filter(Boolean).join(', ') : ''
          const aq = await aqRes.json()

          if (!aq.success) {
            setStatus('error')
            setError(isHindi ? 'हवा की गुणवत्ता नहीं मिल सकी।' : 'Could not fetch air quality.')
            return
          }

          const result = { locality, aqi: aq.aqi, band: aq.band, dominant: aq.dominant }
          setData(result)
          setStatus('ready')
          if (onChange) onChange(result)
        } catch {
          setStatus('error')
          setError(isHindi ? 'हवा की गुणवत्ता नहीं मिल सकी।' : 'Could not fetch air quality.')
        }
      },
      () => {
        setStatus('error')
        setError(isHindi ? 'लोकेशन की अनुमति नहीं मिली।' : 'Location permission was denied.')
      },
      { timeout: 10000 }
    )
  }

  return (
    <div style={{ ...s.card, marginBottom: 20 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: s.colors.gray[600], textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
        {isHindi ? '🌫️ स्थानीय हवा की गुणवत्ता (वैकल्पिक)' : '🌫️ Local air quality (optional)'}
      </p>

      {status === 'idle' && (
        <>
          <p style={{ fontSize: 12, color: s.colors.gray[500], margin: '0 0 10px' }}>
            {isHindi
              ? 'अगर आपको सांस या दिल से जुड़ी दिक्कत है, तो यह AI को बेहतर सलाह देने में मदद करता है।'
              : 'If your symptoms are respiratory or cardiac, this helps the AI give more relevant advice.'}
          </p>
          <button
            onClick={check}
            style={{
              padding: '10px 16px', borderRadius: 8, border: `1px solid ${s.colors.gray[300]}`,
              background: s.colors.gray[50], color: s.colors.gray[700], fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📍 {isHindi ? 'हवा की गुणवत्ता जांचें' : 'Check air quality'}
          </button>
        </>
      )}

      {status === 'loading' && (
        <p style={{ fontSize: 13, color: s.colors.gray[500], margin: 0 }}>
          {isHindi ? 'जांच रहे हैं…' : 'Checking…'}
        </p>
      )}

      {status === 'error' && (
        <>
          <p style={{ fontSize: 12, color: s.colors.danger, margin: '0 0 8px' }}>{error}</p>
          <button onClick={check} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${s.colors.gray[300]}`, background: 'white', fontSize: 12, cursor: 'pointer' }}>
            {isHindi ? 'फिर कोशिश करें' : 'Retry'}
          </button>
        </>
      )}

      {status === 'ready' && data && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
            color: 'white', background: BAND_COLORS[data.band] || s.colors.gray[500],
          }}>
            AQI {data.aqi} · {data.band}
          </span>
          {data.locality && (
            <span style={{ fontSize: 12, color: s.colors.gray[500] }}>{data.locality}</span>
          )}
        </div>
      )}
    </div>
  )
}
