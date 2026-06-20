import React, { useState } from 'react'
import { s } from './styles'

export default function DoctorLogin({ onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const DOCTOR_PIN = '1234' // Simple 4-digit PIN for demo

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === DOCTOR_PIN) {
      onLogin()
    } else {
      setError('Incorrect PIN. Try again.')
      setPin('')
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 32, maxWidth: 400,
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px', textAlign: 'center' }}>
          Doctor Dashboard
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', textAlign: 'center' }}>
          Enter your PIN to access
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            placeholder="Enter 4-digit PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.slice(0, 6))
              setError('')
            }}
            maxLength="6"
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB',
              fontSize: 18, textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'monospace',
              outline: 'none', marginBottom: 16,
            }}
            autoFocus
          />

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#991B1B', fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: 'none',
              background: pin.length === 4 ? '#059669' : '#D1D5DB', color: 'white',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              opacity: pin.length === 4 ? 1 : 0.6,
            }}
            disabled={pin.length !== 4}
          >
            Login
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '16px 0 0', textAlign: 'center' }}>
          Demo PIN: 1234
        </p>
      </div>
    </div>
  )
}
