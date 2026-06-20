import React from 'react'
import { RISK_COLORS, s } from './styles'

export default function TriageResult({ result }) {
  const colors = RISK_COLORS[result.risk_level] || RISK_COLORS.LOW
  return (
    <div style={{ ...s.card, borderLeft: `4px solid ${colors.border}`, background: colors.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ ...s.badge, background: colors.badge, fontSize: 14, padding: '6px 14px' }}>
          {result.risk_level}
        </span>
        {result.is_emergency && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: '#DC2626', padding: '4px 10px',
            borderRadius: 20, border: '1px solid #FECACA', background: '#FEF2F2',
          }}>Emergency detected</span>
        )}
      </div>

      <p style={s.label}>Symptoms identified</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {result.symptoms?.map((sym, i) => (
          <span key={i} style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 20,
            border: `1px solid ${colors.border}`, color: colors.text, background: 'white',
          }}>{sym}</span>
        ))}
      </div>

      <p style={s.label}>Medical summary</p>
      <p style={s.detail}>{result.medical_summary}</p>

      <p style={{ ...s.label, marginTop: 12 }}>Recommended action</p>
      <p style={{ ...s.detail, fontWeight: 500 }}>{result.recommended_action}</p>

      {result.emergency_flags?.length > 0 && (
        <div style={{
          marginTop: 14, padding: 12, borderRadius: 6,
          background: '#7F1D1D', color: '#FECACA', fontSize: 13,
        }}>
          <span style={{ fontWeight: 600 }}>Emergency flags:</span> {result.emergency_flags.join(', ')}
        </div>
      )}
    </div>
  )
}
