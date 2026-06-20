import React from 'react'
import { s } from './styles'

export default function DoctorInstructions({ instructions }) {
  if (!instructions) {
    return (
      <div style={s.card}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
          Doctor's Instructions
        </h3>
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: '#F3F4F6',
          border: '1px solid #D1D5DB',
          textAlign: 'center',
        }}>
          <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
            Awaiting doctor review... Doctor instructions will appear here once reviewed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
        Doctor's Review & Instructions
      </h3>

      {instructions.diagnosis && (
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
            📋 Diagnosis Summary
          </h4>
          <p style={{
            fontSize: 13,
            color: '#6B7280',
            lineHeight: 1.6,
            margin: 0,
            padding: 10,
            background: '#F9FAFB',
            borderRadius: 6,
            borderLeft: '3px solid #3B82F6',
          }}>
            {instructions.diagnosis}
          </p>
        </div>
      )}

      {instructions.treatment_plan && (
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
            💊 Treatment Plan
          </h4>
          <p style={{
            fontSize: 13,
            color: '#6B7280',
            lineHeight: 1.6,
            margin: 0,
            padding: 10,
            background: '#F9FAFB',
            borderRadius: 6,
            borderLeft: '3px solid #10B981',
          }}>
            {instructions.treatment_plan}
          </p>
        </div>
      )}

      {instructions.follow_up && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
            🔄 Follow-up Actions
          </h4>
          <ol style={{
            fontSize: 13,
            color: '#6B7280',
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: 20,
            backgroundColor: '#F9FAFB',
            padding: '10px 10px 10px 24px',
            borderRadius: 6,
            borderLeft: '3px solid #F59E0B',
          }}>
            {Array.isArray(instructions.follow_up) ? (
              instructions.follow_up.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))
            ) : (
              <li>{instructions.follow_up}</li>
            )}
          </ol>
        </div>
      )}

      {instructions.medications && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
            💉 Recommended Medications
          </h4>
          <ul style={{
            fontSize: 13,
            color: '#6B7280',
            lineHeight: 1.8,
            margin: 0,
            paddingLeft: 20,
            backgroundColor: '#F9FAFB',
            padding: '10px 10px 10px 24px',
            borderRadius: 6,
            borderLeft: '3px solid #EF4444',
          }}>
            {Array.isArray(instructions.medications) ? (
              instructions.medications.map((med, idx) => (
                <li key={idx}>{med}</li>
              ))
            ) : (
              <li>{instructions.medications}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
