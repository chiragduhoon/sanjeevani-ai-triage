import React, { useState, useEffect } from 'react'
import { connectDoctorSocket } from './realtime'
import { s } from './styles'

const WARD_COLORS = {
  ICU:       { bg: '#F0F9FF', border: '#0284C7', text: '#0C2340' },
  EMERGENCY: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
  GENERAL:   { bg: '#F0FDF4', border: '#16A34A', text: '#166534' },
  PRIVATE:   { bg: '#F5F3FF', border: '#A855F7', text: '#581C87' },
}
const colorFor = (w) => WARD_COLORS[w] || { bg: '#F9FAFB', border: '#6B7280', text: '#374151' }

export default function BedManagement() {
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

    const conn = connectDoctorSocket({
      onMessage: (m) => {
        if (m.type === 'beds_update' && m.beds) setBeds(m.beds)
      },
    })
    return () => { cancelled = true; conn.close() }
  }, [])

  const wards = Object.entries(beds)

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>🏥 Hospital Bed Status</h3>
        <a href="/hospital" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#0284C7', fontWeight: 600 }}>
          Open Bed Desk →
        </a>
      </div>
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 16px' }}>
        Live view — beds are admitted/discharged at the Hospital Bed Desk
      </p>

      {/* Ward summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {wards.map(([ward, d]) => {
          const c = colorFor(ward)
          const occupied = d.total - d.available
          return (
            <div key={ward} style={{ padding: 12, borderRadius: 8, background: c.bg, border: `2px solid ${c.border}` }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: c.text, margin: '0 0 8px' }}>{ward}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div>
                  <p style={{ color: c.text, opacity: 0.7, margin: '0 0 2px' }}>Occupied</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>{occupied}</p>
                </div>
                <div>
                  <p style={{ color: c.text, opacity: 0.7, margin: '0 0 2px' }}>Available</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: c.text, margin: 0 }}>{d.available}</p>
                </div>
              </div>
              <div style={{ marginTop: 8, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${d.total ? (occupied / d.total) * 100 : 0}%`, background: c.border }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Admitted patients */}
      {wards.some(([, d]) => (d.occupied || []).length > 0) ? (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Admitted patients</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wards.flatMap(([ward, d]) =>
              (d.occupied || []).slice().sort((a, b) => a.bed - b.bed).map((o) => {
                const c = colorFor(ward)
                return (
                  <div key={`${ward}-${o.bed}`} style={{
                    padding: 10, borderRadius: 6, background: c.bg, border: `1px solid ${c.border}`,
                  }}>
                    <p style={{ fontWeight: 600, color: '#111827', margin: 0, fontSize: 12 }}>
                      {ward}-{o.bed} · {o.patient}
                    </p>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>Since {o.since}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: 12, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', textAlign: 'center' }}>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>No patients currently admitted.</p>
        </div>
      )}
    </div>
  )
}
