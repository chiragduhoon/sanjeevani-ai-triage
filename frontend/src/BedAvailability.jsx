import React, { useState } from 'react'
import { BED_TYPES } from './mockData'
import { s } from './styles'

export default function BedAvailability() {
  const [bedRequested, setBedRequested] = useState(null)
  const [beds, setBeds] = useState(BED_TYPES)

  const handleRequestBed = (bedType) => {
    if (beds[bedType].available > 0) {
      setBedRequested(bedType)
      // Simulate bed assignment
      setBeds(prev => ({
        ...prev,
        [bedType]: { ...prev[bedType], available: prev[bedType].available - 1 }
      }))
    }
  }

  const getBedIcon = (type) => {
    const icons = {
      ICU: '🏥',
      EMERGENCY: '🚑',
      GENERAL: '🛏️',
      PRIVATE: '🏨',
    }
    return icons[type] || '🛏️'
  }

  const getBedColor = (type) => {
    const colors = {
      ICU: { bg: '#F0F9FF', border: '#0284C7', text: '#0C2340' },
      EMERGENCY: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
      GENERAL: { bg: '#F0FDF4', border: '#16A34A', text: '#166534' },
      PRIVATE: { bg: '#F5F3FF', border: '#A855F7', text: '#581C87' },
    }
    return colors[type] || colors.GENERAL
  }

  return (
    <div style={s.card}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
        Hospital Bed Availability
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {Object.entries(beds).map(([bedType, { total, available }]) => {
          const color = getBedColor(bedType)
          const occupancy = ((total - available) / total * 100).toFixed(0)
          const isRequested = bedRequested === bedType

          return (
            <div
              key={bedType}
              style={{
                padding: 12,
                borderRadius: 8,
                background: color.bg,
                border: `2px solid ${color.border}`,
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 8 }}>
                {getBedIcon(bedType)}
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: color.text, margin: '0 0 6px' }}>
                {bedType}
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: color.text, margin: '0 0 6px' }}>
                {available}/{total} Available
              </p>
              <div style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: 'rgba(0,0,0,0.1)',
                overflow: 'hidden',
                marginBottom: 8,
              }}>
                <div style={{
                  height: '100%',
                  width: `${100 - occupancy}%`,
                  background: color.border,
                  transition: 'width 0.3s',
                }} />
              </div>
              <p style={{ fontSize: 10, color: color.text, margin: 0 }}>
                {occupancy}% Occupied
              </p>

              {isRequested && (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: '#059669',
                  color: 'white',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                }}>
                  ✓ Assigned
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!bedRequested && (
        <div>
          <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>
            Request a bed based on your medical condition and availability.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {Object.keys(beds).map(bedType => (
              <button
                key={bedType}
                onClick={() => handleRequestBed(bedType)}
                disabled={beds[bedType].available === 0}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: `1px solid ${getBedColor(bedType).border}`,
                  background: beds[bedType].available > 0 ? getBedColor(bedType).bg : '#F3F4F6',
                  color: beds[bedType].available > 0 ? getBedColor(bedType).text : '#9CA3AF',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: beds[bedType].available > 0 ? 'pointer' : 'default',
                  opacity: beds[bedType].available > 0 ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
              >
                Request {bedType}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
