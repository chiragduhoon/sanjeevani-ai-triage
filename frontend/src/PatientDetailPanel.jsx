import React, { useState, useEffect } from 'react'
import { RISK_COLORS } from './styles'

const STATUS_COLORS = {
  WAITING:    { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  IN_REVIEW:  { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
  TREATED:    { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  DISCHARGED: { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
}

export default function PatientDetailPanel({ patient, onClose, onQuickAction, onDischarge }) {
  const [prescriptions, setPrescriptions] = useState([])
  const [status, setStatus] = useState(patient?.queueStatus || 'WAITING')

  useEffect(() => {
    if (!patient?.patientId) return
    // Load prescriptions from backend
    fetch(`/api/prescriptions/${patient.patientId}`)
      .then(r => r.json())
      .then(d => setPrescriptions(d.prescriptions || []))
      .catch(() => {})
  }, [patient?.patientId])

  const handleStatusChange = async (newStatus) => {
    if (!patient?.patientId) return
    setStatus(newStatus)
    try {
      await fetch(`/api/queue/${patient.patientId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {}
  }

  if (!patient) return null

  const colors = RISK_COLORS[patient.risk_level] || RISK_COLORS.LOW
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.WAITING

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 400,
      background: 'white',
      boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
      overflowY: 'auto',
      zIndex: 1000,
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'sticky',
          top: 0,
          right: 0,
          padding: 12,
          border: 'none',
          background: 'white',
          cursor: 'pointer',
          fontSize: 18,
          color: '#6B7280',
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
          zIndex: 10,
        }}
      >
        ✕
      </button>

      <div style={{ padding: 20 }}>
        {/* Header with patient name + risk badge */}
        <div style={{ marginBottom: 20 }}>
          {patient.patientName && (
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
              {patient.patientName}
            </h2>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{
              display: 'inline-block', padding: '4px 10px', borderRadius: 6,
              background: colors.bg, color: colors.text, fontSize: 12, fontWeight: 700,
            }}>
              {patient.risk_level}
            </div>
            {patient.patientId && (
              <code style={{
                fontSize: 12, color: '#6B7280', background: '#F3F4F6',
                padding: '4px 8px', borderRadius: 4, fontFamily: 'monospace',
              }}>
                {patient.patientId}
              </code>
            )}
          </div>

          {/* Queue Status Selector */}
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', margin: '0 0 6px', textTransform: 'uppercase' }}>
              Queue Status
            </p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['WAITING', 'IN_REVIEW', 'TREATED', 'DISCHARGED'].map(s => {
                const sc = STATUS_COLORS[s]
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    style={{
                      padding: '4px 8px', borderRadius: 4, border: `1px solid ${sc.border}`,
                      background: status === s ? sc.bg : 'white',
                      color: status === s ? sc.text : '#9CA3AF',
                      fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {s.replace('_', ' ')}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Assessment Time */}
        {patient.time && (
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            marginBottom: 16,
            fontSize: 12,
          }}>
            <p style={{ fontWeight: 600, color: '#6B7280', margin: '0 0 4px' }}>
              Assessment Time
            </p>
            <p style={{ margin: 0, color: '#111827', fontWeight: 500 }}>
              {patient.time}
            </p>
          </div>
        )}

        {/* Symptoms */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
            Reported Symptoms
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Array.isArray(patient.symptoms) ? (
              patient.symptoms.map((symptom, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    background: colors.bg,
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {symptom}
                </span>
              ))
            ) : (
              <span style={{
                padding: '6px 10px',
                borderRadius: 4,
                background: colors.bg,
                color: colors.text,
                fontSize: 12,
              }}>
                {patient.symptoms}
              </span>
            )}
          </div>
        </div>

        {/* Transcript */}
        {patient.transcript && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Patient's Description
            </h3>
            <p style={{
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 1.6,
              padding: 10,
              background: '#F9FAFB',
              borderRadius: 6,
              borderLeft: '3px solid ' + colors.border,
              margin: 0,
            }}>
              "{patient.transcript}"
            </p>
          </div>
        )}

        {/* Medical Summary */}
        {patient.medical_summary && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              AI Clinical Summary
            </h3>
            <p style={{
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 1.6,
              padding: 10,
              background: '#F0F9FF',
              borderRadius: 6,
              borderLeft: '3px solid #0284C7',
              margin: 0,
            }}>
              {patient.medical_summary}
            </p>
          </div>
        )}

        {/* Emergency Flags */}
        {patient.emergency_flags && patient.emergency_flags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', margin: '0 0 8px' }}>
              ⚠️ Emergency Flags
            </h3>
            <div style={{
              padding: 10,
              background: '#FEF2F2',
              borderRadius: 6,
              border: '1px solid #FECACA',
            }}>
              {patient.emergency_flags.map((flag, idx) => (
                <p key={idx} style={{
                  fontSize: 12,
                  color: '#991B1B',
                  margin: idx === 0 ? 0 : '6px 0 0',
                  paddingLeft: 16,
                }}>
                  • {flag}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Action */}
        {patient.recommended_action && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Recommended Action
            </h3>
            <p style={{
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 1.6,
              padding: 10,
              background: '#F0FDF4',
              borderRadius: 6,
              borderLeft: '3px solid #16A34A',
              margin: 0,
            }}>
              {patient.recommended_action}
            </p>
          </div>
        )}

        {/* Prescription History */}
        {prescriptions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              💊 Prescriptions ({prescriptions.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {prescriptions.map((rx, idx) => (
                <div key={idx} style={{
                  padding: 8, borderRadius: 6, background: '#FFFBEB',
                  border: '1px solid #FBBF24', fontSize: 11,
                }}>
                  <p style={{ fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>
                    {rx.medicine_name || rx.name}
                  </p>
                  <p style={{ color: '#6B7280', margin: 0 }}>
                    {rx.dosage} · {rx.frequency}{rx.duration ? ` · ${rx.duration}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {onQuickAction && (
          <div style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: '1px solid #E5E7EB',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}>
            <button
              onClick={() => onQuickAction('prescriptions')}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#0284C7',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>💊</span> Prescribe
            </button>
            <button
              onClick={() => onQuickAction('notes')}
              style={{
                padding: '10px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#A855F7',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span>📝</span> Notes
            </button>
          </div>
        )}

        {/* Discharge — mark reviewed & remove from active queue */}
        {onDischarge && status !== 'DISCHARGED' && (
          <button
            onClick={() => {
              if (window.confirm(`Mark ${patient.patientName || patient.patientId} as reviewed and discharge from the queue?`)) {
                onDischarge(patient)
              }
            }}
            style={{
              marginTop: 12, width: '100%', padding: '12px',
              borderRadius: 8, border: 'none', background: '#059669', color: 'white',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>✅</span> Mark Reviewed &amp; Discharge
          </button>
        )}
      </div>
    </div>
  )
}
