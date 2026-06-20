import React, { useState, useEffect } from 'react'
import { RISK_COLORS } from './styles'

export default function AmbulanceButton({ riskLevel }) {
  const [status, setStatus] = useState('Idle')
  const [estimatedTime, setEstimatedTime] = useState(null)
  const [requested, setRequested] = useState(false)

  const handleCallAmbulance = () => {
    setRequested(true)
    setStatus('Requested')

    // Actually dial India's ambulance number (108) on supported devices
    window.location.href = 'tel:108'

    // Simulate dispatch progression
    setTimeout(() => {
      setStatus('Dispatched')
      setEstimatedTime('8-10 minutes')
    }, 2000)

    setTimeout(() => {
      setStatus('Arriving')
      setEstimatedTime('2-3 minutes')
    }, 6000)
  }

  const statusColors = {
    'Idle': '#D1D5DB',
    'Requested': '#FBBF24',
    'Dispatched': '#F97316',
    'Arriving': '#EF4444',
    'On-site': '#059669',
  }

  const statusBg = {
    'Idle': '#F3F4F6',
    'Requested': '#FFFBEB',
    'Dispatched': '#FEF3C7',
    'Arriving': '#FEE2E2',
    'On-site': '#ECFDF5',
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={handleCallAmbulance}
        disabled={requested}
        style={{
          width: '100%',
          padding: '16px 24px',
          borderRadius: 8,
          border: 'none',
          background: requested ? '#DC2626' : '#EF4444',
          color: 'white',
          fontSize: 14,
          fontWeight: 700,
          cursor: requested ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: requested ? 0.9 : 1,
          transition: 'all 0.2s',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7v3h2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9h2V7l-10-5z" />
          <circle cx="12" cy="18" r="1" />
        </svg>
        {requested ? 'Ambulance Called (108)' : 'Call Ambulance — 108'}
      </button>

      {/* Indian emergency numbers */}
      <div style={{
        marginTop: 10,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
      }}>
        <a
          href="tel:108"
          style={{
            textDecoration: 'none', padding: '10px 12px', borderRadius: 8,
            background: '#FEE2E2', border: '1px solid #FCA5A5', textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: '#991B1B', fontWeight: 600 }}>🚑 Ambulance</p>
          <p style={{ margin: '2px 0 0', fontSize: 18, color: '#DC2626', fontWeight: 800 }}>108</p>
        </a>
        <a
          href="tel:112"
          style={{
            textDecoration: 'none', padding: '10px 12px', borderRadius: 8,
            background: '#FEF3C7', border: '1px solid #FCD34D', textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: '#92400E', fontWeight: 600 }}>🆘 Emergency</p>
          <p style={{ margin: '2px 0 0', fontSize: 18, color: '#D97706', fontWeight: 800 }}>112</p>
        </a>
      </div>
      <p style={{ fontSize: 11, color: '#6B7280', margin: '8px 0 0', textAlign: 'center' }}>
        India: 108 (Ambulance) · 112 (National Emergency) · 102 (Govt. Ambulance)
      </p>

      {requested && (
        <div style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 8,
          background: statusBg[status],
          border: `1px solid ${statusColors[status]}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: statusColors[status],
              animation: status === 'Arriving' ? 'blink 0.6s infinite' : 'none',
            }} />
            <span style={{
              fontSize: 13,
              fontWeight: 600,
              color: statusColors[status],
            }}>
              Status: {status}
            </span>
          </div>
          {estimatedTime && (
            <p style={{
              fontSize: 12,
              color: '#6B7280',
              margin: 0,
            }}>
              ⏱️ Estimated arrival: {estimatedTime}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
