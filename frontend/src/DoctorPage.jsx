import { apiUrl } from './api.js'
import React, { useState, useEffect } from 'react'
import DoctorLogin from './DoctorLogin'
import DoctorDashboard from './DoctorDashboard'
import EmergencyAlert from './EmergencyAlert'
import CriticalAlert from './CriticalAlert'
import PatientDetailPanel from './PatientDetailPanel'
import BedManagement from './BedManagement'
import PrescriptionCreator from './PrescriptionCreator'
import DoctorNotes from './DoctorNotes'
import PatientHistory from './PatientHistory'
import { savePrescriptions, savePatientNotes, getPatientById, generatePatientId, updatePatientDetails } from './patientHistoryStorage'
import { connectDoctorSocket } from './realtime'

export default function DoctorPage() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('sanjeevani_doctor_auth') === 'true'
  )
  // Queue is cached in the doctor's own localStorage so a page refresh shows
  // it instantly and it never depends on backend/WebSocket timing.
  const QUEUE_CACHE_KEY = 'sanjeevani_doctor_queue_v2'
  const [patients, setPatients] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_CACHE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [alert, setAlert] = useState(null)
  const [connected, setConnected] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showCriticalAlert, setShowCriticalAlert] = useState(false)
  const [activeTab, setActiveTab] = useState('queue') // queue, bed, prescriptions, notes
  const [lastCriticalPatient, setLastCriticalPatient] = useState(null)
  // Shown when a backend write (discharge/clear/status) fails, so the doctor
  // isn't left assuming an action succeeded when it didn't.
  const [actionError, setActionError] = useState(null)

  // Persist the queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(patients))
    } catch {}
  }, [patients])

  useEffect(() => {
    if (!authenticated) return

    // Self-healing socket: on connect the backend replays its queue, which we
    // merge in by patientId (dedupe below). Reconnects on its own after a drop.
    const conn = connectDoctorSocket({
      onStatus: setConnected,
      onMessage: (message) => {

      if (message.type === 'triage_result') {
        // Keep the full message (incl. patientId, patientName, queueStatus)
        const patient = { ...message }
        setPatients((prev) => {
          // Dedupe by patientId so the replay-on-reconnect doesn't double-add
          if (patient.patientId && prev.some(p => p.patientId === patient.patientId)) {
            // Merge any newer fields (e.g. status) into the existing entry
            return prev.map(p => p.patientId === patient.patientId ? { ...p, ...patient } : p)
          }
          return [...prev, patient]
        })

        // Show critical alert for CRITICAL patients
        if (patient.risk_level === 'CRITICAL') {
          setLastCriticalPatient(patient)
          setShowCriticalAlert(true)
        }
      } else if (message.type === 'emergency_alert') {
        // Stays until the doctor explicitly dismisses it — a critical alert must
        // not silently disappear if they happen to be looking away.
        setAlert({
          symptoms: message.symptoms,
          risk_level: message.risk_level,
          emergency_flags: message.emergency_flags,
          patientName: message.patientName,
        })
      } else if (message.type === 'queue_status_update') {
        setPatients((prev) => prev.map(p =>
          p.patientId === message.patientId
            ? { ...p, queueStatus: message.queueStatus }
            : p
        ))
      } else if (message.type === 'queue_cleared') {
        setPatients([])
        setSelectedPatient(null)
      } else if (message.type === 'queue_remove') {
        setPatients((prev) => prev.filter(p => p.patientId !== message.patientId))
      }
      },
    })

    return () => conn.close()
  }, [authenticated])

  // Single entry point for selecting the active patient. Guarantees the
  // selected patient always has a patientId (older queue entries may lack one),
  // writing the id back into the queue so prescriptions/notes save consistently.
  const selectPatient = (patient) => {
    if (!patient) {
      setSelectedPatient(null)
      return
    }
    let normalized = patient
    if (!patient.patientId) {
      const newId = generatePatientId(patient.patientName)
      normalized = { ...patient, patientId: newId }
      setPatients((prev) => prev.map((p) => (p === patient ? normalized : p)))
    }
    setSelectedPatient(normalized)
  }

  const handleDischarge = async (patient) => {
    const id = patient?.patientId
    if (!id) return
    // Remove from the active queue locally and close the panel
    setPatients((prev) => prev.filter((p) => p.patientId !== id))
    setSelectedPatient(null)
    try {
      // Mark discharged + reviewed in history (persists for the patient's records)
      const record = getPatientById(id)
      if (record) {
        savePatientNotes(id, (record.notes || '') + (record.notes ? '\n\n' : '') + `[Discharged ${new Date().toLocaleString()}]`)
        updatePatientDetails(id, {
          queueStatus: 'DISCHARGED',
          reviewed: true,
          dischargedAt: new Date().toISOString(),
        })
      }
      // Update backend status, then remove from backend queue
      await fetch(apiUrl(`/api/queue/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISCHARGED' }),
      })
      await fetch(apiUrl(`/api/queue/${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('Discharge backend update failed:', err)
      setActionError('Discharge may not have saved on the server — check the connection. It will sync when reconnected.')
    }
  }

  const handleClearQueue = async () => {
    if (!window.confirm('Clear all patients from the queue? This cannot be undone.')) return
    setPatients([])
    setSelectedPatient(null)
    try {
      localStorage.removeItem(QUEUE_CACHE_KEY)
    } catch {}
    try {
      await fetch('/api/queue', { method: 'DELETE' })
    } catch (err) {
      console.error('Could not clear backend queue:', err)
      setActionError('Could not clear the queue on the server — it may reappear on reconnect.')
    }
  }

  // Live stats for the credibility strip — derived from the current queue.
  const stats = {
    total: patients.length,
    critical: patients.filter(p => p.risk_level === 'CRITICAL').length,
    waiting: patients.filter(p => (p.queueStatus || 'WAITING') === 'WAITING').length,
    treated: patients.filter(p => p.queueStatus === 'TREATED' || p.queueStatus === 'DISCHARGED').length,
  }

  if (!authenticated) {
    return <DoctorLogin onLogin={() => {
      sessionStorage.setItem('sanjeevani_doctor_auth', 'true')
      setAuthenticated(true)
    }} />
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1F2937',
      background: '#F9FAFB',
    }}>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px 16px', maxWidth: selectedPatient ? 'calc(100% - 400px)' : '100%' }}>
        {/* Critical Alert Modal */}
        {showCriticalAlert && lastCriticalPatient && (
          <CriticalAlert
            patient={lastCriticalPatient}
            onAcknowledge={() => setShowCriticalAlert(false)}
          />
        )}

        {alert && <EmergencyAlert patient={alert} onDismiss={() => setAlert(null)} />}

        {/* Action failure banner — backend write didn't go through */}
        {actionError && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 8,
            background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
          }}>
            <span style={{ flex: 1 }}>⚠️ {actionError}</span>
            <button
              onClick={() => setActionError(null)}
              aria-label="Dismiss"
              style={{
                background: 'none', border: 'none', color: '#991B1B',
                fontSize: 16, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Connection status */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: connected ? '#059669' : '#EF4444',
          }} />
          <span style={{ fontSize: 12, color: connected ? '#059669' : '#EF4444', fontWeight: 500 }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Live impact stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Patients today', value: stats.total, color: '#2563EB' },
            { label: 'Critical', value: stats.critical, color: '#DC2626' },
            { label: 'Awaiting review', value: stats.waiting, color: '#D97706' },
            { label: 'Treated', value: stats.treated, color: '#059669' },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: '1 1 140px', background: 'white', border: '1px solid #E5E7EB',
              borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid #E5E7EB',
          paddingBottom: 8,
          overflowX: 'auto',
        }}>
          {[
            { id: 'queue', label: '👥 Patient Queue' },
            { id: 'history', label: '📚 History' },
            { id: 'bed', label: '🏥 Bed Management' },
            { id: 'prescriptions', label: '💊 Prescriptions' },
            { id: 'notes', label: '📋 Notes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 14px',
                borderRadius: '4px 4px 0 0',
                border: 'none',
                background: activeTab === tab.id ? '#2563EB' : '#F3F4F6',
                color: activeTab === tab.id ? 'white' : '#6B7280',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Queue Tab */}
        {activeTab === 'queue' && (
          <DoctorDashboard
            patients={patients}
            onBack={() => window.history.back()}
            onViewPatientDetails={selectPatient}
            onClearQueue={handleClearQueue}
          />
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <PatientHistory onSelectPatient={(patient) => {
            selectPatient(patient)
            setActiveTab('queue')
          }} />
        )}

        {/* Bed Management Tab */}
        {activeTab === 'bed' && <BedManagement />}

        {/* Prescriptions Tab */}
        {activeTab === 'prescriptions' && (
          <div>
            {selectedPatient ? (
              <div>
                {/* Patient Context Card */}
                <div style={{
                  padding: 16,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                  border: '2px solid #0284C7',
                  marginBottom: 20,
                  boxShadow: '0 4px 6px rgba(2, 132, 199, 0.1)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#0284C7',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 700,
                    }}>
                      💊
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0C2340', margin: 0 }}>
                        Creating Prescriptions
                      </p>
                      <p style={{ fontSize: 11, color: '#0284C7', margin: '4px 0 0' }}>
                        for this patient:
                      </p>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div style={{
                    background: 'white',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #BFE7F7',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                      <div>
                        <p style={{ fontWeight: 600, color: '#0C2340', margin: '0 0 4px' }}>
                          Patient ID
                        </p>
                        <code style={{
                          background: '#F0F9FF',
                          padding: '6px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          color: '#0284C7',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}>
                          {selectedPatient.patientId}
                        </code>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#0C2340', margin: '0 0 4px' }}>
                          Risk Level
                        </p>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: selectedPatient.risk_level === 'CRITICAL' ? '#FEE2E2' :
                                     selectedPatient.risk_level === 'HIGH' ? '#FEF3C7' : '#F0FDF4',
                          color: selectedPatient.risk_level === 'CRITICAL' ? '#991B1B' :
                                 selectedPatient.risk_level === 'HIGH' ? '#92400E' : '#166534',
                          fontWeight: 600,
                          fontSize: 11,
                        }}>
                          {selectedPatient.risk_level}
                        </span>
                      </div>
                    </div>

                    {/* Symptoms */}
                    {selectedPatient.symptoms && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E0F2FE' }}>
                        <p style={{ fontWeight: 600, color: '#0C2340', margin: '0 0 6px', fontSize: 11 }}>
                          Symptoms:
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                          {Array.isArray(selectedPatient.symptoms)
                            ? selectedPatient.symptoms.join(', ')
                            : selectedPatient.symptoms}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prescriptions Form */}
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
                  Add New Prescriptions
                </h3>
                <PrescriptionCreator onPrescriptionCreated={async (rx) => {
                  if (!selectedPatient?.patientId) {
                    alert('Please select a patient from the queue first.')
                    return
                  }
                  // Append to whatever we already have locally
                  const existing = getPatientById(selectedPatient.patientId)?.prescriptions || []
                  const updated = [...existing, rx]
                  savePrescriptions(selectedPatient.patientId, updated)
                  try {
                    // Save to backend (broadcasts real-time to the patient's tab)
                    const res = await fetch(apiUrl(`/api/prescriptions/${selectedPatient.patientId}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(rx),
                    })
                    if (!res.ok) throw new Error('bad status ' + res.status)
                    alert(`✓ Prescription saved & sent to ${selectedPatient.patientId}`)
                  } catch (err) {
                    console.error('Prescription backend save failed:', err)
                    alert(`⚠ Saved locally, but could not reach backend to notify patient (${selectedPatient.patientId}). Is the backend running?`)
                  }
                }} />
              </div>
            ) : (
              <div style={{
                padding: 32,
                borderRadius: 12,
                background: '#F3F4F6',
                textAlign: 'center',
                border: '2px dashed #D1D5DB',
              }}>
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0, fontWeight: 500 }}>
                  👈 Select a patient from the queue to add prescriptions
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '8px 0 0' }}>
                  Click on a patient in the Patient Queue tab, then come back here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div>
            {selectedPatient ? (
              <div>
                {/* Patient Context Card */}
                <div style={{
                  padding: 16,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #F5F3FF 0%, #FAF5FF 100%)',
                  border: '2px solid #A855F7',
                  marginBottom: 20,
                  boxShadow: '0 4px 6px rgba(168, 85, 247, 0.1)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: '#A855F7',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 700,
                    }}>
                      📝
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#581C87', margin: 0 }}>
                        Clinical Notes
                      </p>
                      <p style={{ fontSize: 11, color: '#A855F7', margin: '4px 0 0' }}>
                        for this patient:
                      </p>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div style={{
                    background: 'white',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #E9D5FF',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                      <div>
                        <p style={{ fontWeight: 600, color: '#581C87', margin: '0 0 4px' }}>
                          Patient ID
                        </p>
                        <code style={{
                          background: '#FAF5FF',
                          padding: '6px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          color: '#A855F7',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}>
                          {selectedPatient.patientId}
                        </code>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, color: '#581C87', margin: '0 0 4px' }}>
                          Risk Level
                        </p>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: selectedPatient.risk_level === 'CRITICAL' ? '#FEE2E2' :
                                     selectedPatient.risk_level === 'HIGH' ? '#FEF3C7' : '#F0FDF4',
                          color: selectedPatient.risk_level === 'CRITICAL' ? '#991B1B' :
                                 selectedPatient.risk_level === 'HIGH' ? '#92400E' : '#166534',
                          fontWeight: 600,
                          fontSize: 11,
                        }}>
                          {selectedPatient.risk_level}
                        </span>
                      </div>
                    </div>

                    {/* Symptoms */}
                    {selectedPatient.symptoms && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3E8FF' }}>
                        <p style={{ fontWeight: 600, color: '#581C87', margin: '0 0 6px', fontSize: 11 }}>
                          Symptoms:
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                          {Array.isArray(selectedPatient.symptoms)
                            ? selectedPatient.symptoms.join(', ')
                            : selectedPatient.symptoms}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes Form */}
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
                  Add Clinical Notes
                </h3>
                <DoctorNotes
                  patientId={selectedPatient?.patientId}
                  onNoteSaved={(note) => {
                    if (selectedPatient?.patientId) {
                      const patient = getPatientById(selectedPatient.patientId)
                      const existingNotes = patient?.notes || ''
                      const allNotes = existingNotes + (existingNotes ? '\n\n' : '') + note.content
                      savePatientNotes(selectedPatient.patientId, allNotes)
                      // Push to the backend so the patient's device sees it live.
                      fetch(apiUrl(`/api/notes/${selectedPatient.patientId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: note.content, type: note.type }),
                      }).catch((err) => {
                        console.error('Could not send note to patient:', err)
                        setActionError('Note saved locally but could not be sent to the patient.')
                      })
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{
                padding: 32,
                borderRadius: 12,
                background: '#F3F4F6',
                textAlign: 'center',
                border: '2px dashed #D1D5DB',
              }}>
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0, fontWeight: 500 }}>
                  👈 Select a patient from the queue to add notes
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '8px 0 0' }}>
                  Click on a patient in the Patient Queue tab, then come back here
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar - Patient Detail Panel */}
      {selectedPatient && (
        <PatientDetailPanel
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onQuickAction={(tab) => setActiveTab(tab)}
          onDischarge={handleDischarge}
        />
      )}
    </div>
  )
}
