import React, { useState, useEffect } from 'react'

export default function CriticalAlert({ patient, onAcknowledge }) {
  const [isVisible, setIsVisible] = useState(true)
  const [soundPlayed, setSoundPlayed] = useState(false)

  useEffect(() => {
    if (soundPlayed) return

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()

      // Three-beep alarm pattern
      const beepAt = (startTime, freq = 1000) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.4, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25)
        osc.start(startTime)
        osc.stop(startTime + 0.25)
      }

      beepAt(audioContext.currentTime, 1200)
      beepAt(audioContext.currentTime + 0.3, 1000)
      beepAt(audioContext.currentTime + 0.6, 1200)
    } catch {}

    setSoundPlayed(true)
  }, [soundPlayed])

  const handleAcknowledge = () => {
    setIsVisible(false)
    if (onAcknowledge) onAcknowledge()
  }

  if (!isVisible) return null

  return (
    <>
      {/* Flashing top banner */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        background: '#DC2626',
        color: 'white',
        textAlign: 'center',
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.08em',
        zIndex: 9999,
        animation: 'criticalBlink 0.7s step-end infinite',
      }}>
        ⚠️ CRITICAL PATIENT — IMMEDIATE ATTENTION REQUIRED ⚠️
      </div>

      {/* Overlay + Modal */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        paddingTop: 48,
      }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 32,
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)',
          border: '3px solid #DC2626',
          animation: 'criticalPulse 1s ease-in-out infinite',
        }}>
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'criticalBlink 0.6s step-end infinite',
              border: '2px solid #DC2626',
            }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#DC2626', margin: 0 }}>
                CRITICAL ALERT
              </h2>
              {patient.patientName && (
                <p style={{ fontSize: 13, color: '#991B1B', margin: '4px 0 0', fontWeight: 600 }}>
                  Patient: {patient.patientName}
                  {patient.patientId && <span style={{ fontFamily: 'monospace', marginLeft: 8 }}>({patient.patientId})</span>}
                </p>
              )}
            </div>
          </div>

          <div style={{
            background: '#FEF2F2', border: '2px solid #DC2626',
            borderRadius: 8, padding: 16, marginBottom: 20,
          }}>
            <p style={{ fontSize: 13, color: '#991B1B', margin: '0 0 12px', fontWeight: 600 }}>
              Critical patient detected — requires immediate attention.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
              <div>
                <p style={{ fontWeight: 600, color: '#DC2626', margin: '0 0 4px' }}>Risk Level</p>
                <p style={{ color: '#6B7280', margin: 0 }}>{patient.risk_level || 'CRITICAL'}</p>
              </div>
              <div>
                <p style={{ fontWeight: 600, color: '#DC2626', margin: '0 0 4px' }}>Status</p>
                <p style={{ color: '#6B7280', margin: 0 }}>Awaiting Immediate Care</p>
              </div>
            </div>

            {patient.emergency_flags && patient.emergency_flags.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontWeight: 600, color: '#DC2626', margin: '0 0 6px', fontSize: 12 }}>
                  Emergency Flags
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {patient.emergency_flags.map((flag, idx) => (
                    <span key={idx} style={{
                      fontSize: 11, padding: '4px 8px', borderRadius: 4,
                      background: '#FECACA', color: '#991B1B', fontWeight: 500,
                    }}>
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {patient.symptoms && (
            <div style={{
              background: '#F0F9FF', border: '1px solid #BFE7F7',
              borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12,
            }}>
              <p style={{ fontWeight: 600, color: '#0284C7', margin: '0 0 6px' }}>Reported Symptoms</p>
              <p style={{ color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                {Array.isArray(patient.symptoms) ? patient.symptoms.join(', ') : patient.symptoms}
              </p>
            </div>
          )}

          <button
            onClick={handleAcknowledge}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 8, border: 'none',
              background: '#DC2626', color: 'white', fontSize: 14, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✓ Acknowledge & Go to Patient
          </button>
        </div>
      </div>

      <style>{`
        @keyframes criticalBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes criticalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4), 0 20px 25px -5px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(220,38,38,0.1), 0 20px 25px -5px rgba(0,0,0,0.4); }
        }
      `}</style>
    </>
  )
}
