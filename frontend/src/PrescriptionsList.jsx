import React from 'react'
import { s } from './styles'

export default function PrescriptionsList({ prescriptions = [] }) {
  if (!prescriptions || prescriptions.length === 0) {
    return (
      <div style={s.card}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
          💊 Prescriptions
        </h3>
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: '#F3F4F6',
          border: '1px solid #D1D5DB',
          textAlign: 'center',
        }}>
          <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
            No active prescriptions. Doctor will add prescriptions after review.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
        💊 Active Prescriptions
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {prescriptions.map((rx, idx) => (
          <div
            key={idx}
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#FFFBEB',
              border: '1px solid #FBBF24',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: '0 0 4px' }}>
                  {rx.medicine_name || rx.name}
                </p>
                {rx.prescribing_doctor && (
                  <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>
                    Prescribed by: {rx.prescribing_doctor}
                  </p>
                )}
                {rx.prescribedDate && (
                  <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>
                    📅 {rx.prescribedDate}
                  </p>
                )}
              </div>
              {rx.status && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: rx.status === 'Active' ? '#DCFCE7' : '#FEE2E2',
                  color: rx.status === 'Active' ? '#166534' : '#991B1B',
                }}>
                  {rx.status}
                </span>
              )}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              fontSize: 12,
              color: '#6B7280',
            }}>
              <div>
                <p style={{ fontWeight: 500, color: '#92400E', marginBottom: 2, margin: 0 }}>Dosage</p>
                <p style={{ margin: 0 }}>{rx.dosage || rx.strength || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 500, color: '#92400E', marginBottom: 2, margin: 0 }}>Frequency</p>
                <p style={{ margin: 0 }}>{rx.frequency || 'N/A'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 500, color: '#92400E', marginBottom: 2, margin: 0 }}>Duration</p>
                <p style={{ margin: 0 }}>{rx.duration || 'As needed'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 500, color: '#92400E', marginBottom: 2, margin: 0 }}>Refills</p>
                <p style={{ margin: 0 }}>{rx.refills || '0'}</p>
              </div>
            </div>

            {rx.instructions && (
              <div style={{
                marginTop: 8,
                padding: 8,
                borderRadius: 4,
                background: 'rgba(0,0,0,0.05)',
                fontSize: 11,
                color: '#6B7280',
              }}>
                <strong>Instructions:</strong> {rx.instructions}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        background: '#F0F9FF',
        border: '1px solid #BFE7F7',
        fontSize: 12,
        color: '#0284C7',
      }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
          ℹ️ Important Reminders
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Take medications exactly as prescribed</li>
          <li>Do not stop taking medication without consulting your doctor</li>
          <li>Report any side effects to your doctor immediately</li>
          <li>Keep medications in their original containers</li>
        </ul>
      </div>
    </div>
  )
}
