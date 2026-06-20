import React from 'react'

export default function EmergencyAlert({ patient }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, padding: '14px 20px',
      background: '#DC2626', color: 'white', zIndex: 1000,
      animation: 'slideDown 0.3s ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 680, margin: '0 auto' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontWeight: 700, fontSize: 15 }}>CRITICAL PATIENT INCOMING</span>
        <span style={{ fontSize: 13, opacity: 0.9, marginLeft: 'auto' }}>{patient.symptoms?.join(', ')}</span>
      </div>
    </div>
  )
}
