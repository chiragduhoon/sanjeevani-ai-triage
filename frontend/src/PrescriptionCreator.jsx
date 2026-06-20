import React, { useState } from 'react'
import { s } from './styles'

export default function PrescriptionCreator({ onPrescriptionCreated }) {
  const [isCreating, setIsCreating] = useState(false)
  const [prescriptions, setPrescriptions] = useState([])
  const [form, setForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAddPrescription = () => {
    if (form.medicine_name && form.dosage && form.frequency) {
      const newRx = {
        id: Date.now(),
        ...form,
        status: 'Active',
      }
      setPrescriptions(prev => [...prev, newRx])
      setForm({
        medicine_name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
      })
      if (onPrescriptionCreated) {
        onPrescriptionCreated(newRx)
      }
    }
  }

  const handleRemovePrescription = (id) => {
    setPrescriptions(prev => prev.filter(rx => rx.id !== id))
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
        💊 Create Prescription
      </h3>

      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#10B981',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Prescription
        </button>
      ) : (
        <div style={{
          padding: 16,
          borderRadius: 8,
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
        }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
              Medicine Name *
            </label>
            <input
              type="text"
              name="medicine_name"
              value={form.medicine_name}
              onChange={handleChange}
              placeholder="e.g., Amoxicillin"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Dosage *
              </label>
              <input
                type="text"
                name="dosage"
                value={form.dosage}
                onChange={handleChange}
                placeholder="e.g., 500mg"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Frequency *
              </label>
              <input
                type="text"
                name="frequency"
                value={form.frequency}
                onChange={handleChange}
                placeholder="e.g., Twice daily"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #D1D5DB',
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
              Duration
            </label>
            <input
              type="text"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              placeholder="e.g., 7 days"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                fontSize: 12,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
              Special Instructions
            </label>
            <textarea
              name="instructions"
              value={form.instructions}
              onChange={handleChange}
              placeholder="e.g., Take with food, avoid dairy"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                fontSize: 12,
                boxSizing: 'border-box',
                minHeight: 60,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleAddPrescription}
              disabled={!form.medicine_name || !form.dosage || !form.frequency}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: form.medicine_name && form.dosage && form.frequency ? '#10B981' : '#D1D5DB',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: form.medicine_name && form.dosage && form.frequency ? 'pointer' : 'default',
              }}
            >
              Add Prescription
            </button>
            <button
              onClick={() => setIsCreating(false)}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                background: 'white',
                color: '#6B7280',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {prescriptions.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #E5E7EB' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
            Prescriptions in this session ({prescriptions.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {prescriptions.map(rx => (
              <div
                key={rx.id}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                }}
              >
                <div style={{ fontSize: 12 }}>
                  <p style={{ fontWeight: 600, color: '#166534', margin: 0 }}>
                    {rx.medicine_name}
                  </p>
                  <p style={{ fontSize: 11, color: '#16A34A', margin: '4px 0 0' }}>
                    {rx.dosage} • {rx.frequency}
                  </p>
                  {rx.duration && (
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                      Duration: {rx.duration}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemovePrescription(rx.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: '#EF4444',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
