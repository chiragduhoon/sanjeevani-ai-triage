import React, { useState, useEffect } from 'react'
import { s } from './styles'

const WARD_COLORS = {
  ICU:       { bg: '#F0F9FF', border: '#0284C7', text: '#0C2340' },
  EMERGENCY: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
  GENERAL:   { bg: '#F0FDF4', border: '#16A34A', text: '#166534' },
  PRIVATE:   { bg: '#F5F3FF', border: '#A855F7', text: '#581C87' },
}
const colorFor = (ward) => WARD_COLORS[ward] || { bg: '#F9FAFB', border: '#6B7280', text: '#374151' }

const HOSPITAL_PIN = '4321'

function PinGate({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (pin === HOSPITAL_PIN) {
      sessionStorage.setItem('sanjeevani_hospital_auth', 'true')
      onLogin()
    } else {
      setError('Incorrect PIN. Try again.')
      setPin('')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 32, maxWidth: 400, width: '90%' }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>
          🏥 Hospital Bed Desk
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', textAlign: 'center' }}>
          Staff access — enter PIN
        </p>
        <form onSubmit={submit}>
          <input
            type="password" inputMode="numeric" placeholder="Enter 4-digit PIN"
            value={pin} maxLength={6} autoFocus
            onChange={(e) => { setPin(e.target.value.slice(0, 6)); setError('') }}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB',
              fontSize: 18, textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'monospace',
              outline: 'none', marginBottom: 16, boxSizing: 'border-box',
            }}
          />
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#991B1B', fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>{error}</div>
          )}
          <button type="submit" disabled={pin.length !== 4}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: 'none',
              background: pin.length === 4 ? '#0284C7' : '#D1D5DB', color: 'white',
              fontSize: 14, fontWeight: 600, cursor: pin.length === 4 ? 'pointer' : 'default',
            }}>
            Login
          </button>
        </form>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '16px 0 0', textAlign: 'center' }}>
          Demo PIN: 4321
        </p>
      </div>
    </div>
  )
}

export default function HospitalPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('sanjeevani_hospital_auth') === 'true'
  )
  const [beds, setBeds] = useState({})
  const [connected, setConnected] = useState(false)
  const [admitName, setAdmitName] = useState({})       // ward -> name being typed
  const [newWard, setNewWard] = useState('')
  const [newWardTotal, setNewWardTotal] = useState('')

  const loadBeds = async () => {
    try {
      const res = await fetch('/api/beds')
      if (res.ok) setBeds(await res.json())
    } catch {}
  }

  useEffect(() => {
    if (!authed) return
    loadBeds()

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//localhost:8000/ws/doctor`)
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      if (m.type === 'beds_update' && m.beds) setBeds(m.beds)
    }
    return () => ws.close()
  }, [authed])

  if (!authed) return <PinGate onLogin={() => setAuthed(true)} />

  const api = async (url, opts) => {
    try {
      const res = await fetch(url, opts)
      if (res.ok) setBeds(await res.json())
      else {
        const err = await res.json().catch(() => ({}))
        alert(err.detail || 'Action failed')
      }
    } catch {
      alert('Could not reach backend. Is it running on :8000?')
    }
  }

  const setTotal = (ward, total) =>
    api(`/api/beds/${ward}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total }),
    })

  const admit = (ward) => {
    const name = (admitName[ward] || '').trim()
    if (!name) { alert('Enter patient name'); return }
    api(`/api/beds/${ward}/admit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient: name }),
    })
    setAdmitName((p) => ({ ...p, [ward]: '' }))
  }

  const discharge = (ward, bed) =>
    api(`/api/beds/${ward}/discharge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bed }),
    })

  const removeWard = (ward) => {
    if (window.confirm(`Delete ward ${ward}? This frees all its records.`))
      api(`/api/beds/${ward}`, { method: 'DELETE' })
  }

  const addWard = () => {
    const name = newWard.trim().toUpperCase()
    const total = parseInt(newWardTotal, 10)
    if (!name || !total || total < 1) { alert('Enter a ward name and capacity'); return }
    setTotal(name, total)
    setNewWard(''); setNewWardTotal('')
  }

  const wards = Object.entries(beds)
  const totals = wards.reduce(
    (acc, [, d]) => {
      acc.total += d.total
      acc.available += d.available
      return acc
    },
    { total: 0, available: 0 }
  )

  return (
    <div style={{
      maxWidth: 900, margin: '0 auto', padding: '32px 16px 64px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1F2937',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>🏥 Hospital Bed Desk</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Maintain and update ward bed records
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: connected ? '#059669' : '#EF4444' }} />
          <span style={{ fontSize: 12, color: connected ? '#059669' : '#EF4444', fontWeight: 500 }}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div style={{ ...s.card, display: 'flex', gap: 32 }}>
        <div>
          <p style={s.label}>Total Beds</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#111827' }}>{totals.total}</p>
        </div>
        <div>
          <p style={s.label}>Available</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#059669' }}>{totals.available}</p>
        </div>
        <div>
          <p style={s.label}>Occupied</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#DC2626' }}>
            {totals.total - totals.available}
          </p>
        </div>
      </div>

      {/* Wards */}
      {wards.map(([ward, data]) => {
        const c = colorFor(ward)
        const occupied = data.occupied || []
        return (
          <div key={ward} style={{ ...s.card, borderLeft: `4px solid ${c.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: c.text, margin: 0 }}>{ward}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: data.available > 0 ? '#059669' : '#DC2626' }}>
                  {data.available} / {data.total} available
                </span>
                <button onClick={() => removeWard(ward)} style={{
                  padding: '4px 8px', borderRadius: 4, border: '1px solid #FCA5A5',
                  background: 'white', color: '#DC2626', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                }}>Delete ward</button>
              </div>
            </div>

            {/* Occupancy bar */}
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{
                height: '100%', background: c.border,
                width: `${data.total ? ((data.total - data.available) / data.total) * 100 : 0}%`,
              }} />
            </div>

            {/* Capacity controls + admit */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>Capacity</span>
                <button onClick={() => setTotal(ward, Math.max(0, data.total - 1))} style={stepBtn}>−</button>
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{data.total}</span>
                <button onClick={() => setTotal(ward, data.total + 1)} style={stepBtn}>+</button>
              </div>

              <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 220 }}>
                <input
                  value={admitName[ward] || ''}
                  onChange={(e) => setAdmitName((p) => ({ ...p, [ward]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && admit(ward)}
                  placeholder="Patient name to admit"
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB',
                    fontSize: 12, boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => admit(ward)}
                  disabled={data.available <= 0}
                  style={{
                    padding: '8px 14px', borderRadius: 6, border: 'none',
                    background: data.available > 0 ? c.border : '#D1D5DB', color: 'white',
                    fontSize: 12, fontWeight: 600, cursor: data.available > 0 ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Admit
                </button>
              </div>
            </div>

            {/* Occupant list */}
            {occupied.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {occupied.slice().sort((a, b) => a.bed - b.bed).map((o) => (
                  <div key={o.bed} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 10, borderRadius: 6, background: c.bg, border: `1px solid ${c.border}`,
                  }}>
                    <div style={{ fontSize: 12 }}>
                      <p style={{ fontWeight: 700, color: c.text, margin: 0 }}>
                        {ward}-{o.bed} · {o.patient}
                      </p>
                      <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>Since {o.since}</p>
                    </div>
                    <button onClick={() => discharge(ward, o.bed)} style={{
                      padding: '5px 10px', borderRadius: 4, border: 'none',
                      background: '#EF4444', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>Discharge</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>No patients admitted in this ward.</p>
            )}
          </div>
        )
      })}

      {/* Add new ward */}
      <div style={{ ...s.card, background: '#F9FAFB' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Add a ward</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={newWard} onChange={(e) => setNewWard(e.target.value)}
            placeholder="Ward name (e.g. PEDIATRIC)"
            style={{ flex: 2, minWidth: 160, padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 12, boxSizing: 'border-box' }}
          />
          <input
            value={newWardTotal} onChange={(e) => setNewWardTotal(e.target.value)}
            type="number" min="1" placeholder="Beds"
            style={{ width: 100, padding: '8px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 12, boxSizing: 'border-box' }}
          />
          <button onClick={addWard} style={{
            padding: '8px 16px', borderRadius: 6, border: 'none', background: '#0284C7',
            color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>Add ward</button>
        </div>
      </div>
    </div>
  )
}

const stepBtn = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid #D1D5DB',
  background: 'white', color: '#374151', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
