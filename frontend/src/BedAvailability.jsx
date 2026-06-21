import React, { useState, useEffect } from 'react'
import { s } from './styles'

const WARD_ICONS = { ICU: '🏥', EMERGENCY: '🚑', GENERAL: '🛏️', PRIVATE: '🏨' }
const WARD_COLORS = {
  ICU:       { bg: '#F0F9FF', border: '#0284C7', text: '#0C2340' },
  EMERGENCY: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
  GENERAL:   { bg: '#F0FDF4', border: '#16A34A', text: '#166534' },
  PRIVATE:   { bg: '#F5F3FF', border: '#A855F7', text: '#581C87' },
}
const colorFor = (w) => WARD_COLORS[w] || { bg: '#F9FAFB', border: '#6B7280', text: '#374151' }

export default function BedAvailability() {
  const [beds, setBeds] = useState({})

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/beds')
        if (res.ok && !cancelled) setBeds(await res.json())
      } catch {}
    }
    load()

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//localhost:8000/ws/doctor`)
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.type === 'beds_update' && m.beds) setBeds(m.beds)
    }
    return () => { cancelled = true; ws.close() }
  }, [])

  const wards = Object.entries(beds)

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
        Hospital Bed Availability
      </h3>
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 16px' }}>
        Live — updated by the hospital bed desk
      </p>

      {wards.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Loading bed availability…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {wards.map(([ward, d]) => {
            const c = colorFor(ward)
            const occupancy = d.total ? Math.round(((d.total - d.available) / d.total) * 100) : 0
            return (
              <div key={ward} style={{ padding: 12, borderRadius: 8, background: c.bg, border: `2px solid ${c.border}` }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{WARD_ICONS[ward] || '🛏️'}</div>
                <p style={{ fontSize: 12, fontWeight: 600, color: c.text, margin: '0 0 6px' }}>{ward}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: '0 0 6px' }}>
                  {d.available}/{d.total} Available
                </p>
                <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${100 - occupancy}%`, background: c.border, transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: 10, color: c.text, margin: 0 }}>{occupancy}% Occupied</p>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#F0F9FF', border: '1px solid #BFE7F7' }}>
        <p style={{ fontSize: 12, color: '#0284C7', margin: 0 }}>
          ℹ️ To request a bed, please contact hospital reception. Availability above reflects real-time records.
        </p>
      </div>
    </div>
  )
}
