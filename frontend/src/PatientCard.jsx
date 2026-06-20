import React from 'react'
import { RISK_COLORS, s } from './styles'

export default function PatientCard({ patient, index, expanded, onToggle, onViewFullDetails }) {
  const colors = RISK_COLORS[patient.risk_level] || RISK_COLORS.LOW
  const open = expanded === index

  return (
    <div
      onClick={() => onViewFullDetails?.()}
      style={{
        padding: 16, borderRadius: 8,
        borderLeft: `4px solid ${colors.border}`,
        border: `1px solid ${open ? colors.border : '#F3F4F6'}`,
        background: open ? colors.bg : 'white',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ ...s.badge, background: colors.badge }}>{patient.risk_level}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {patient.patientName && (
            <span style={{ display: 'block', fontSize: 14, color: '#111827', fontWeight: 700 }}>
              {patient.patientName}
              {patient.patientId && (
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', fontFamily: 'monospace', marginLeft: 6 }}>
                  {patient.patientId}
                </span>
              )}
            </span>
          )}
          <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
            {patient.symptoms?.join(', ')}
          </span>
        </div>
        {patient.queueStatus && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
            background: '#F3F4F6', color: '#6B7280', flexShrink: 0,
          }}>
            {patient.queueStatus.replace('_', ' ')}
          </span>
        )}
        <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>{patient.time}</span>
        {/* Chevron toggles inline expand without selecting */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(open ? null : index) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
          title={open ? 'Collapse' : 'Expand details'}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={s.label}>Medical summary</p>
          <p style={s.detail}>{patient.medical_summary}</p>
          <p style={{ ...s.label, marginTop: 12 }}>Recommended action</p>
          <p style={s.detail}>{patient.recommended_action}</p>
          {patient.emergency_flags?.length > 0 && (
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 6,
              background: '#7F1D1D', color: '#FECACA', fontSize: 13,
            }}>
              <span style={{ fontWeight: 600 }}>Emergency flags:</span> {patient.emergency_flags.join(', ')}
            </div>
          )}
          <p style={{ ...s.label, marginTop: 12 }}>Original transcript</p>
          <p style={{ ...s.detail, fontStyle: 'italic', color: '#6B7280' }}>"{patient.transcript}"</p>
        </div>
      )}

      {/* Primary action — always visible */}
      <button
        onClick={(e) => { e.stopPropagation(); onViewFullDetails?.() }}
        style={{
          marginTop: 12, width: '100%',
          padding: '8px 12px', borderRadius: 6, border: 'none',
          background: '#2563EB', color: 'white', fontSize: 12, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Open patient → Prescribe / Notes
      </button>
    </div>
  )
}
