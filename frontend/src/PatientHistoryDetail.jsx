import React, { useState } from 'react'
import { RISK_COLORS } from './styles'
import {
  updatePatientDetails,
  savePatientNotes,
  savePrescriptions,
  saveDoctorInstructions,
} from './patientHistoryStorage'

export default function PatientHistoryDetail({ patient, onClose }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedInstructions, setEditedInstructions] = useState(patient?.doctorInstructions || {})

  if (!patient) return null

  const colors = RISK_COLORS[patient.risk_level] || RISK_COLORS.LOW

  const handleSaveInstructions = () => {
    saveDoctorInstructions(patient.patientId, editedInstructions)
    setIsEditing(false)
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      padding: '20px',
      overflowY: 'auto',
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 32,
        maxWidth: 600,
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: 20,
        }}>
          <div>
            <h2 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#111827',
              margin: '0 0 8px',
            }}>
              Patient Record
            </h2>
            <p style={{
              fontSize: 13,
              color: '#6B7280',
              margin: 0,
            }}>
              {patient.patientId}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              color: '#6B7280',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Risk Level Badge */}
        <div style={{
          display: 'inline-block',
          padding: '8px 14px',
          borderRadius: 6,
          background: colors.bg,
          color: colors.text,
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 20,
          border: `1px solid ${colors.border}`,
        }}>
          {patient.risk_level}
        </div>

        {/* Assessment Info */}
        <div style={{
          padding: 14,
          borderRadius: 8,
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          marginBottom: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
            <div>
              <p style={{ fontWeight: 600, color: '#6B7280', margin: '0 0 4px' }}>
                Assessment Date
              </p>
              <p style={{ margin: 0, color: '#111827', fontWeight: 500 }}>
                {patient.displayDate}
              </p>
            </div>
            <div>
              <p style={{ fontWeight: 600, color: '#6B7280', margin: '0 0 4px' }}>
                Assessment Time
              </p>
              <p style={{ margin: 0, color: '#111827', fontWeight: 500 }}>
                {patient.displayTime}
              </p>
            </div>
          </div>
          {patient.updatedAt && (
            <p style={{
              fontSize: 11,
              color: '#9CA3AF',
              margin: '8px 0 0',
            }}>
              Last updated: {new Date(patient.updatedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Symptoms */}
        <div style={{ marginBottom: 20 }}>
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
          <div style={{ marginBottom: 20 }}>
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
              fontStyle: 'italic',
            }}>
              "{patient.transcript}"
            </p>
          </div>
        )}

        {/* AI Summary */}
        {patient.medical_summary && (
          <div style={{ marginBottom: 20 }}>
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
          <div style={{ marginBottom: 20 }}>
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
          <div style={{ marginBottom: 20 }}>
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

        {/* Doctor Instructions */}
        {patient.doctorInstructions && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Doctor Instructions
            </h3>
            <div style={{
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 1.6,
              padding: 10,
              background: '#F5F3FF',
              borderRadius: 6,
              borderLeft: '3px solid #A855F7',
            }}>
              {typeof patient.doctorInstructions === 'string' ? (
                <p style={{ margin: 0 }}>{patient.doctorInstructions}</p>
              ) : (
                <div>
                  {patient.doctorInstructions.diagnosis && (
                    <p style={{ margin: '0 0 8px' }}>
                      <strong>Diagnosis:</strong> {patient.doctorInstructions.diagnosis}
                    </p>
                  )}
                  {patient.doctorInstructions.treatment_plan && (
                    <p style={{ margin: '0 0 8px' }}>
                      <strong>Plan:</strong> {patient.doctorInstructions.treatment_plan}
                    </p>
                  )}
                  {patient.doctorInstructions.follow_up && (
                    <p style={{ margin: 0 }}>
                      <strong>Follow-up:</strong> {patient.doctorInstructions.follow_up}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prescriptions */}
        {patient.prescriptions && patient.prescriptions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Prescriptions ({patient.prescriptions.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {patient.prescriptions.map((rx, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    background: '#FFFBEB',
                    border: '1px solid #FBBF24',
                    fontSize: 12,
                  }}
                >
                  <p style={{ fontWeight: 600, color: '#92400E', margin: '0 0 4px' }}>
                    {rx.medicine_name || rx.name}
                  </p>
                  <p style={{ color: '#6B7280', margin: 0 }}>
                    {rx.dosage} • {rx.frequency}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {patient.notes && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
              Clinical Notes
            </h3>
            <div style={{
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 1.6,
              padding: 10,
              background: '#F9FAFB',
              borderRadius: 6,
              borderLeft: '3px solid #3B82F6',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {patient.notes}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#6B7280',
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: 20,
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
