import React from 'react'
import PatientQueue from './PatientQueue'

export default function DoctorDashboard({ patients, onBack, onViewPatientDetails, onClearQueue }) {
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      window.history.back()
    }
  }

  return (
    <div>
      <button onClick={handleBack} style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none',
        border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Patient queue</h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            {patients.length} patient{patients.length !== 1 ? 's' : ''} in queue
          </p>
        </div>
        {onClearQueue && patients.length > 0 && (
          <button
            onClick={onClearQueue}
            style={{
              padding: '8px 14px', borderRadius: 6, border: '1px solid #FECACA',
              background: 'white', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Clear Queue
          </button>
        )}
      </div>

      <PatientQueue patients={patients} onViewPatientDetails={onViewPatientDetails} />
    </div>
  )
}
