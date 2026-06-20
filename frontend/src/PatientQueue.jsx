import React, { useState } from 'react'
import PatientCard from './PatientCard'

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 }

export default function PatientQueue({ patients, onViewPatientDetails }) {
  const [expanded, setExpanded] = useState(null)

  const sorted = [...patients].sort(
    (a, b) => (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4)
  )

  if (sorted.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p style={{ color: '#9CA3AF', marginTop: 12 }}>No patients yet. Submit symptoms from the patient view.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((p, i) => (
        <PatientCard
          key={i}
          patient={p}
          index={i}
          expanded={expanded}
          onToggle={setExpanded}
          onViewFullDetails={() => onViewPatientDetails?.(p)}
        />
      ))}
    </div>
  )
}
