import React, { useState, useEffect, useRef } from 'react'
import VoiceInput from './VoiceInput'
import TriageResult from './TriageResult'
import AmbulanceButton from './AmbulanceButton'
import ImmediateGuidance from './ImmediateGuidance'
import AppointmentBooking from './AppointmentBooking'
import BedAvailability from './BedAvailability'
import DoctorInstructions from './DoctorInstructions'
import PrescriptionsList from './PrescriptionsList'
import { generatePatientId, savePatientHistory, getPatientById } from './patientHistoryStorage'
import { RISK_COLORS, s } from './styles'

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 }

export default function PatientPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [allPatients, setAllPatients] = useState([])
  const [activeTab, setActiveTab] = useState('assessment')
  const [doctorInstructions, setDoctorInstructions] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [savedPatientId, setSavedPatientId] = useState(null)
  const [patientName, setPatientName] = useState('')
  const [lookupPatientId, setLookupPatientId] = useState('')
  const [returnPatient, setReturnPatient] = useState(null)

  // Ref so WS handler always has latest patientId without stale closure
  const savedPatientIdRef = useRef(null)

  useEffect(() => {
    savedPatientIdRef.current = savedPatientId
  }, [savedPatientId])

  useEffect(() => {
    if (!result) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//localhost:8000/ws/doctor`)

    ws.onopen = () => console.log('Patient: connected to updates')

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.type === 'triage_result') {
        setAllPatients((prev) => [...prev, { ...message }])
      }

      // Real-time prescription push from doctor
      if (
        message.type === 'prescription_update' &&
        message.patientId === savedPatientIdRef.current
      ) {
        setPrescriptions(message.prescriptions || [])
        // Also persist to localStorage
        const existing = getPatientById(savedPatientIdRef.current)
        if (existing) {
          import('./patientHistoryStorage').then(m =>
            m.savePrescriptions(savedPatientIdRef.current, message.prescriptions)
          )
        }
      }
    }

    return () => ws.close()
  }, [result])

  // Poll the backend for prescriptions so they always appear even if the
  // real-time WebSocket message is missed (reconnect, timing, etc.)
  useEffect(() => {
    if (!savedPatientId) return

    let cancelled = false
    const fetchRx = async () => {
      try {
        const res = await fetch(`/api/prescriptions/${savedPatientId}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.prescriptions) {
          setPrescriptions((prev) =>
            data.prescriptions.length !== prev.length ? data.prescriptions : prev
          )
        }
      } catch {}
    }

    fetchRx() // immediate
    const interval = setInterval(fetchRx, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [savedPatientId])

  const handleTranscript = async (transcript) => {
    setLoading(true)
    setResult(null)
    setAllPatients([])
    setPrescriptions([])

    const patientId = generatePatientId(patientName)

    try {
      const res = await fetch('/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, patientId, patientName: patientName.trim() }),
      })
      const data = await res.json()
      const resultData = { ...data, transcript, time: new Date().toLocaleTimeString() }
      setResult(resultData)

      if (!data.error) {
        savePatientHistory(data, transcript, patientId, patientName.trim())
        setSavedPatientId(patientId)

        // Load any existing prescriptions from localStorage (same-device)
        const existingRecord = getPatientById(patientId)
        if (existingRecord?.prescriptions?.length) {
          setPrescriptions(existingRecord.prescriptions)
        }
      }
    } catch (err) {
      console.error(err)
      setResult({ error: 'Could not reach the backend. Is it running on localhost:8000?' })
    } finally {
      setLoading(false)
    }
  }

  const getQueuePosition = () => {
    if (!result || allPatients.length === 0) return null
    const sorted = [...allPatients].sort(
      (a, b) => (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4)
    )
    const position = sorted.findIndex((p) => p.time === result.time) + 1
    return { position, total: sorted.length }
  }

  const queuePos = getQueuePosition()
  const colors = result ? RISK_COLORS[result.risk_level] || RISK_COLORS.LOW : null

  return (
    <div style={{
      maxWidth: 680, margin: '0 auto', padding: '32px 16px 64px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1F2937',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
          Sanjeevani
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>Patient Assessment</p>
      </div>

      {!result && !returnPatient ? (
        <>
          {/* Returning Patient Section */}
          <div style={{
            ...s.card,
            background: '#F0F9FF',
            borderLeft: '4px solid #0284C7',
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0C2340', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
              Returning patient?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={lookupPatientId}
                onChange={(e) => setLookupPatientId(e.target.value)}
                placeholder="Enter your Patient ID (e.g., CHIRAG-001)"
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 6,
                  border: '1px solid #BFE7F7', fontSize: 12, boxSizing: 'border-box',
                }}
              />
              <button
                onClick={async () => {
                  const id = lookupPatientId.trim()
                  const patient = getPatientById(id)
                  // Always pull the latest prescriptions from the backend
                  // (doctor may have prescribed from another device/browser)
                  let backendRx = []
                  try {
                    const res = await fetch(`/api/prescriptions/${id}`)
                    if (res.ok) backendRx = (await res.json()).prescriptions || []
                  } catch {}

                  if (patient) {
                    setReturnPatient({
                      ...patient,
                      prescriptions: backendRx.length ? backendRx : (patient.prescriptions || []),
                    })
                  } else if (backendRx.length) {
                    // No local record but prescriptions exist on the server
                    setReturnPatient({
                      patientId: id,
                      prescriptions: backendRx,
                      symptoms: [],
                      displayDate: '—',
                      displayTime: '—',
                    })
                  } else {
                    alert('No record found for that Patient ID')
                  }
                }}
                disabled={!lookupPatientId.trim()}
                style={{
                  padding: '10px 16px', borderRadius: 6, border: 'none',
                  background: lookupPatientId.trim() ? '#0284C7' : '#D1D5DB',
                  color: 'white', fontSize: 12, fontWeight: 600,
                  cursor: lookupPatientId.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap',
                }}
              >
                View History
              </button>
            </div>
          </div>

          {/* Patient Name Input */}
          <div style={s.card}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
              Your name
            </p>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter your name (e.g., Chirag)"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 6,
                border: patientName.trim() ? '1px solid #2563EB' : '1px solid #D1D5DB',
                fontSize: 14, boxSizing: 'border-box',
              }}
            />
            {patientName.trim() && (
              <p style={{ fontSize: 11, color: '#6B7280', margin: '6px 0 0' }}>
                Your Patient ID will be: <strong style={{ color: '#2563EB' }}>
                  {patientName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}-001
                </strong> (or next available number)
              </p>
            )}
          </div>

          {/* Voice input card */}
          <div style={s.card}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>
              Describe your symptoms
            </p>
            <VoiceInput onTranscriptReady={handleTranscript} />
          </div>

          {loading && (
            <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 20, height: 20, border: '2.5px solid #E5E7EB', borderTopColor: '#2563EB',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0,
              }} />
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Analyzing symptoms with AI...</p>
            </div>
          )}
        </>
      ) : returnPatient ? (
        <>
          {/* Returning Patient History View */}
          <button
            onClick={() => { setReturnPatient(null); setLookupPatientId('') }}
            style={{
              padding: 0, border: 'none', background: 'none', color: '#2563EB',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 16,
            }}
          >
            ← Back to New Assessment
          </button>

          <div style={{
            ...s.card, background: '#F0F9FF', borderLeft: '4px solid #0284C7', marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#0C2340', margin: '0 0 8px', textTransform: 'uppercase' }}>
              Your Patient ID
            </p>
            {returnPatient.patientName && (
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0C2340', margin: '0 0 8px' }}>
                {returnPatient.patientName}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{
                flex: 1, padding: '10px 12px', borderRadius: 6, background: 'white',
                border: '1px solid #BFE7F7', fontSize: 12, fontFamily: 'monospace',
                color: '#0284C7', fontWeight: 600,
              }}>
                {returnPatient.patientId}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(returnPatient.patientId); alert('Copied!') }}
                style={{
                  padding: '8px 12px', borderRadius: 6, border: '1px solid #BFE7F7',
                  background: 'white', color: '#0284C7', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Copy
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#0C2340', margin: '8px 0 0', opacity: 0.8 }}>
              Assessment on: {returnPatient.displayDate} at {returnPatient.displayTime}
            </p>
          </div>

          <TriageResult result={returnPatient} />

          {returnPatient.doctorInstructions && (
            <div style={{ marginTop: 16 }}>
              <DoctorInstructions instructions={returnPatient.doctorInstructions} />
            </div>
          )}

          {returnPatient.prescriptions && returnPatient.prescriptions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <PrescriptionsList prescriptions={returnPatient.prescriptions} />
            </div>
          )}
        </>
      ) : (
        <>
          {result.error ? (
            <div style={{ ...s.card, borderLeft: '4px solid #DC2626', background: '#FEF2F2' }}>
              <p style={{ color: '#991B1B', fontWeight: 500, margin: 0 }}>{result.error}</p>
            </div>
          ) : (
            <>
              {/* Patient ID Display */}
              {savedPatientId && (
                <div style={{
                  ...s.card, background: '#ECFDF5', borderLeft: '4px solid #059669', marginBottom: 16,
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#065F46', margin: '0 0 4px', textTransform: 'uppercase' }}>
                    Your Patient ID
                  </p>
                  {patientName && (
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#065F46', margin: '0 0 8px' }}>
                      {patientName}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <code style={{
                      flex: 1, padding: '10px 12px', borderRadius: 6, background: 'white',
                      border: '1px solid #86EFAC', fontSize: 14, fontFamily: 'monospace',
                      color: '#059669', fontWeight: 700, letterSpacing: '0.02em',
                    }}>
                      {savedPatientId}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(savedPatientId); alert('Copied!') }}
                      style={{
                        padding: '8px 12px', borderRadius: 6, border: '1px solid #86EFAC',
                        background: 'white', color: '#059669', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#065F46', margin: 0, opacity: 0.8 }}>
                    Save this ID — use it to check prescriptions and history next visit.
                  </p>
                </div>
              )}

              <TriageResult result={result} />

              {/* Tab Navigation */}
              <div style={{
                display: 'flex', gap: 8, overflowX: 'auto', marginTop: 16, paddingBottom: 8,
                borderBottom: '1px solid #E5E7EB',
              }}>
                {[
                  { id: 'assessment', label: '📊 Assessment' },
                  { id: 'guidance', label: '🆘 Guidance' },
                  { id: 'appointments', label: '📅 Appointments' },
                  { id: 'bed', label: '🛏️ Bed' },
                  { id: 'instructions', label: '📋 Instructions' },
                  { id: 'prescriptions', label: `💊 Prescriptions${prescriptions.length ? ` (${prescriptions.length})` : ''}` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '8px 12px', borderRadius: '4px 4px 0 0', border: 'none',
                      background: activeTab === tab.id ? '#2563EB' : '#F3F4F6',
                      color: activeTab === tab.id ? 'white' : '#6B7280',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Assessment Tab */}
              {activeTab === 'assessment' && queuePos && (
                <div style={{ ...s.card, background: colors.bg, borderLeft: `4px solid ${colors.border}`, marginTop: 16 }}>
                  <p style={s.label}>Your Position in Queue</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: colors.text }}>
                      #{queuePos.position}
                    </span>
                    <span style={{ fontSize: 14, color: colors.text, fontWeight: 500 }}>
                      {queuePos.position === 1 ? 'First to be seen' : `Out of ${queuePos.total} patients`}
                    </span>
                  </div>
                  <div style={{ padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.05)', fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 8px' }}><strong>Risk Level:</strong> {result.risk_level}</p>
                    <p style={{ margin: 0 }}><strong>Status:</strong> Waiting to be assessed by doctor</p>
                  </div>
                </div>
              )}

              {activeTab === 'guidance' && (
                <div style={{ marginTop: 16 }}>
                  <ImmediateGuidance result={result} />
                  {result.risk_level === 'CRITICAL' && <AmbulanceButton riskLevel={result.risk_level} />}
                </div>
              )}

              {activeTab === 'appointments' && (
                <div style={{ marginTop: 16 }}><AppointmentBooking /></div>
              )}

              {activeTab === 'bed' && (
                <div style={{ marginTop: 16 }}><BedAvailability /></div>
              )}

              {activeTab === 'instructions' && (
                <div style={{ marginTop: 16 }}>
                  <DoctorInstructions instructions={doctorInstructions} />
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div style={{ marginTop: 16 }}>
                  {prescriptions.length === 0 && (
                    <div style={{
                      padding: 12, borderRadius: 8, background: '#FFF7ED',
                      border: '1px solid #FED7AA', marginBottom: 12, fontSize: 12, color: '#92400E',
                    }}>
                      Waiting for doctor to add prescriptions. This tab updates automatically.
                    </div>
                  )}
                  <PrescriptionsList prescriptions={prescriptions} />
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => {
                setResult(null)
                setAllPatients([])
                setActiveTab('assessment')
                setDoctorInstructions(null)
                setPrescriptions([])
                setSavedPatientId(null)
                setReturnPatient(null)
                setLookupPatientId('')
              }}
              style={{
                width: '100%', padding: '12px 24px', borderRadius: 8, border: 'none',
                background: '#6B7280', color: 'white', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Start Over
            </button>
          </div>
        </>
      )}
    </div>
  )
}
