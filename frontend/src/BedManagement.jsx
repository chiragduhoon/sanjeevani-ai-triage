import React, { useState } from 'react'
import { BED_TYPES } from './mockData'
import { s } from './styles'

export default function BedManagement() {
  const [beds, setBeds] = useState(BED_TYPES)
  const [assignments, setAssignments] = useState({})

  const getBedColor = (type) => {
    const colors = {
      ICU: { bg: '#F0F9FF', border: '#0284C7', text: '#0C2340' },
      EMERGENCY: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
      GENERAL: { bg: '#F0FDF4', border: '#16A34A', text: '#166534' },
      PRIVATE: { bg: '#F5F3FF', border: '#A855F7', text: '#581C87' },
    }
    return colors[type] || colors.GENERAL
  }

  const getNextBedNumber = (type) => {
    const assigned = assignments[type] || []
    return assigned.length + 1
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
        🏥 Hospital Bed Management
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {Object.entries(beds).map(([bedType, { total, available }]) => {
          const color = getBedColor(bedType)
          const occupancy = total - available

          return (
            <div
              key={bedType}
              style={{
                padding: 12,
                borderRadius: 8,
                background: color.bg,
                border: `2px solid ${color.border}`,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: color.text, margin: '0 0 8px' }}>
                {bedType}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                fontSize: 11,
              }}>
                <div>
                  <p style={{ color: color.text, opacity: 0.7, margin: '0 0 2px' }}>Occupied</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: color.text, margin: 0 }}>
                    {occupancy}
                  </p>
                </div>
                <div>
                  <p style={{ color: color.text, opacity: 0.7, margin: '0 0 2px' }}>Available</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: color.text, margin: 0 }}>
                    {available}
                  </p>
                </div>
              </div>
              <div style={{
                marginTop: 8,
                height: 6,
                borderRadius: 3,
                background: 'rgba(0,0,0,0.1)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${(occupancy / total) * 100}%`,
                  background: color.border,
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Assignments */}
      {Object.keys(assignments).length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
            Current Bed Assignments
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(assignments).map(([bedType, patients]) =>
              patients.map((patient, idx) => (
                <div
                  key={`${bedType}-${idx}`}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    background: getBedColor(bedType).bg,
                    border: `1px solid ${getBedColor(bedType).border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 12 }}>
                    <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>
                      {bedType} - Bed {idx + 1}
                    </p>
                    <p style={{ fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                      {patient}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAssignments(prev => ({
                        ...prev,
                        [bedType]: prev[bedType].filter((_, i) => i !== idx),
                      }))
                      setBeds(prev => ({
                        ...prev,
                        [bedType]: { ...prev[bedType], available: prev[bedType].available + 1 },
                      }))
                    }}
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
                    Discharge
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {(!assignments || Object.keys(assignments).length === 0) && (
        <div style={{
          padding: 12,
          borderRadius: 8,
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          textAlign: 'center',
        }}>
          <p style={{ color: '#6B7280', fontSize: 12, margin: 0 }}>
            No bed assignments yet. Assign beds from the patient queue.
          </p>
        </div>
      )}
    </div>
  )
}
