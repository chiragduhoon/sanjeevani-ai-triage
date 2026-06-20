import React, { useState, useEffect } from 'react'
import { getPatientHistory, deletePatient, getPatientsByRiskLevel } from './patientHistoryStorage'
import PatientHistoryDetail from './PatientHistoryDetail'
import { RISK_COLORS, s } from './styles'

export default function PatientHistory({ onSelectPatient }) {
  const [history, setHistory] = useState([])
  const [filterRisk, setFilterRisk] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedForDetail, setSelectedForDetail] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    const data = getPatientHistory()
    setHistory(data.reverse())
  }

  const handleDelete = (patientId) => {
    if (window.confirm('Delete this patient record?')) {
      deletePatient(patientId)
      loadHistory()
    }
  }

  const filteredHistory = history.filter(p => {
    const riskMatch = filterRisk === 'ALL' || p.risk_level === filterRisk
    const term = searchTerm.toLowerCase()
    const searchMatch = !searchTerm ||
      p.patientId?.toLowerCase().includes(term) ||
      p.patientName?.toLowerCase().includes(term) ||
      p.symptoms?.join(' ').toLowerCase().includes(term) ||
      p.transcript?.toLowerCase().includes(term)
    return riskMatch && searchMatch
  })

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
          📚 Patient History
        </h3>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#6B7280',
          background: '#F3F4F6',
          padding: '4px 8px',
          borderRadius: 4,
        }}>
          {filteredHistory.length} records
        </span>
      </div>

      {/* Search and Filter */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, ID, symptoms, or transcript..."
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid #D1D5DB',
            fontSize: 12,
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map(risk => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                background: filterRisk === risk ? '#2563EB' : 'white',
                color: filterRisk === risk ? 'white' : '#6B7280',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      {filteredHistory.length === 0 ? (
        <div style={{
          padding: 24,
          textAlign: 'center',
          background: '#F9FAFB',
          borderRadius: 8,
        }}>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
            {history.length === 0 ? 'No patient history yet' : 'No patients match your search'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredHistory.map(patient => {
            const colors = RISK_COLORS[patient.risk_level] || RISK_COLORS.LOW

            return (
              <div
                key={patient.patientId}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: 8,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.text,
                        background: colors.badge,
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}>
                        {patient.risk_level}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>
                        {patient.patientName
                          ? <>{patient.patientName} <span style={{ fontFamily: 'monospace', fontSize: 10, opacity: 0.8 }}>({patient.patientId})</span></>
                          : patient.patientId}
                      </span>
                    </div>

                    <p style={{
                      fontSize: 12,
                      color: colors.text,
                      margin: '4px 0 0',
                      lineHeight: 1.4,
                    }}>
                      {patient.symptoms?.join(', ')}
                    </p>

                    <div style={{
                      display: 'flex',
                      gap: 12,
                      marginTop: 6,
                      fontSize: 10,
                      color: colors.text,
                      opacity: 0.8,
                    }}>
                      <span>📅 {patient.displayDate}</span>
                      <span>⏰ {patient.displayTime}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setSelectedForDetail(patient)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 4,
                        border: 'none',
                        background: '#2563EB',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(patient.patientId)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 4,
                        border: 'none',
                        background: '#EF4444',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: colors.text,
                  opacity: 0.7,
                }}>
                  {patient.queueStatus === 'DISCHARGED' || patient.reviewed ? (
                    <span style={{ fontWeight: 600 }}>✓ Discharged</span>
                  ) : patient.doctorInstructions ? (
                    <span>✓ Doctor reviewed</span>
                  ) : (
                    <span>⏳ Awaiting review</span>
                  )}
                  {patient.prescriptions?.length > 0 && (
                    <span> • {patient.prescriptions.length} prescription(s)</span>
                  )}
                  {patient.notes && (
                    <span> • Has notes</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary Stats */}
      {history.length > 0 && (
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #E5E7EB',
        }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
            History Summary
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: 8,
          }}>
            {['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].map(risk => {
              const count = history.filter(p => p.risk_level === risk).length
              const riskColors = RISK_COLORS[risk]
              return (
                <div
                  key={risk}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    background: riskColors.bg,
                    border: `1px solid ${riskColors.border}`,
                    textAlign: 'center',
                  }}
                >
                  <p style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: riskColors.text,
                    margin: '0 0 4px',
                  }}>
                    {count}
                  </p>
                  <p style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: riskColors.text,
                    margin: 0,
                  }}>
                    {risk}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedForDetail && (
        <PatientHistoryDetail
          patient={selectedForDetail}
          onClose={() => setSelectedForDetail(null)}
        />
      )}
    </div>
  )
}
