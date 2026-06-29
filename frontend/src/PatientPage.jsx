import React, { useState, useEffect, useRef } from 'react'
import VoiceInput from './VoiceInput'
import FollowUpThread from './FollowUpThread'
import TriageResult from './TriageResult'
import AmbulanceButton from './AmbulanceButton'
import { apiUrl } from './api.js'
import ImmediateGuidance from './ImmediateGuidance'
import AppointmentBooking from './AppointmentBooking'
import BedAvailability from './BedAvailability'
import DoctorInstructions from './DoctorInstructions'
import PrescriptionsList from './PrescriptionsList'
import { generatePatientId, savePatientHistory, getPatientById } from './patientHistoryStorage'
import { connectDoctorSocket } from './realtime'
import { RISK_COLORS, s } from './styles'

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 }

export default function PatientPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [allPatients, setAllPatients] = useState([])
  const [activeTab, setActiveTab] = useState('assessment')
  const [doctorInstructions, setDoctorInstructions] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [doctorNotes, setDoctorNotes] = useState([])
  const [followups, setFollowups] = useState([])
  // How many notes the patient has already viewed — anything beyond this is "new"
  // and lights up a badge on the Instructions tab.
  const [seenNotesCount, setSeenNotesCount] = useState(0)
  const [seenFollowupsCount, setSeenFollowupsCount] = useState(0)
  const [savedPatientId, setSavedPatientId] = useState(null)
  const [patientName, setPatientName] = useState('')
  const [lookupPatientId, setLookupPatientId] = useState('')
  const [returnPatient, setReturnPatient] = useState(null)
  const [uiLang, setUiLang] = useState(() => localStorage.getItem('sanjeevani_lang') || 'en')
  // Photos the patient optionally attaches (rash, wound, report). Each: { file, preview }.
  const [images, setImages] = useState([])
  const [imageError, setImageError] = useState('')

  const switchLang = (l) => { setUiLang(l); localStorage.setItem('sanjeevani_lang', l) }
  const isHindi = uiLang === 'hi'

  // Ref so WS handler always has latest patientId without stale closure
  const savedPatientIdRef = useRef(null)
  // Reused across retries so a failed submission doesn't burn a new patient ID each time.
  const pendingIdRef = useRef(null)

  useEffect(() => {
    savedPatientIdRef.current = savedPatientId
  }, [savedPatientId])

  // Viewing the Instructions tab clears the "new notes" badge.
  useEffect(() => {
    if (activeTab === 'instructions') setSeenNotesCount(doctorNotes.length)
  }, [activeTab, doctorNotes.length])

  const unseenNotes = Math.max(0, doctorNotes.length - seenNotesCount)

  // Viewing the Q&A tab clears its badge.
  useEffect(() => {
    if (activeTab === 'qa') setSeenFollowupsCount(followups.length)
  }, [activeTab, followups.length])

  // Badge counts only new doctor questions (patient's own replies don't notify them).
  const unseenFollowups = Math.max(
    0,
    followups.slice(seenFollowupsCount).filter((m) => m.sender === 'doctor').length
  )

  const sendFollowupAnswer = async (text, image = '') => {
    if (!savedPatientId) return
    setFollowups((prev) => [...prev, { sender: 'patient', text, image, time: '' }])
    try {
      await fetch(apiUrl(`/api/followups/${savedPatientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'patient', text, image }),
      })
    } catch {}
  }

  useEffect(() => {
    if (!result) return

    const conn = connectDoctorSocket({
      onMessage: (message) => {
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

        // Real-time doctor note push
        if (
          message.type === 'note_update' &&
          message.patientId === savedPatientIdRef.current
        ) {
          setDoctorNotes(message.notes || [])
        }

        // Real-time follow-up Q&A update
        if (
          message.type === 'followup_update' &&
          message.patientId === savedPatientIdRef.current
        ) {
          setFollowups(message.followups || [])
        }
      },
    })

    return () => conn.close()
  }, [result])

  // Poll the backend for prescriptions so they always appear even if the
  // real-time WebSocket message is missed (reconnect, timing, etc.)
  useEffect(() => {
    if (!savedPatientId) return

    let cancelled = false
    const fetchUpdates = async () => {
      try {
        const res = await fetch(apiUrl(`/api/prescriptions/${savedPatientId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.prescriptions) {
            setPrescriptions((prev) =>
              data.prescriptions.length !== prev.length ? data.prescriptions : prev
            )
          }
        }
      } catch {}
      try {
        const res = await fetch(apiUrl(`/api/notes/${savedPatientId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.notes) {
            setDoctorNotes((prev) =>
              data.notes.length !== prev.length ? data.notes : prev
            )
          }
        }
      } catch {}
      try {
        const res = await fetch(apiUrl(`/api/followups/${savedPatientId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.followups) {
            setFollowups((prev) =>
              data.followups.length !== prev.length ? data.followups : prev
            )
          }
        }
      } catch {}
    }

    fetchUpdates() // immediate
    const interval = setInterval(fetchUpdates, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [savedPatientId])

  const handleTranscript = async (transcript) => {
    if (loading) return // guard against double-submit while a triage is in flight
    setLoading(true)
    setResult(null)
    setAllPatients([])
    setPrescriptions([])

    // Reuse the same id across retries so repeated failures don't leave id gaps.
    const patientId = pendingIdRef.current || generatePatientId(patientName)
    pendingIdRef.current = patientId

    try {
      // Upload any attached photos first so their URLs can ride on the triage record.
      let imageUrls = []
      if (images.length > 0) {
        try {
          const form = new FormData()
          images.forEach((img) => form.append('files', img.file))
          const up = await fetch(apiUrl(`/api/images/${patientId}`, { method: 'POST', body: form })
          if (up.ok) {
            const upData = await up.json()
            imageUrls = upData.urls || []
          }
        } catch (e) {
          console.error('Image upload failed:', e)
          // Non-fatal: continue with triage even if photos didn't upload.
        }
      }

      const res = await fetch(apiUrl('/triage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript, patientId, patientName: patientName.trim(), lang: uiLang,
          images: imageUrls,
        }),
      })

      const data = await res.json().catch(() => ({}))

      // Treat an error body or non-2xx the same as a failure — keep the transcript
      // (VoiceInput holds it) so the patient can simply tap Analyze again to retry.
      if (!res.ok || data.error) {
        setResult({
          error: data.error || (isHindi
            ? 'विश्लेषण विफल रहा। कृपया दोबारा प्रयास करें।'
            : 'Analysis failed. Please tap Analyze to try again.'),
        })
        return
      }

      const resultData = { ...data, transcript, time: new Date().toLocaleTimeString() }
      setResult(resultData)

      savePatientHistory(data, transcript, patientId, patientName.trim())
      setSavedPatientId(patientId)
      pendingIdRef.current = null // committed — next submission gets a fresh id
      setImages([])               // clear attached photos after a successful submit

      // Load any existing prescriptions from localStorage (same-device)
      const existingRecord = getPatientById(patientId)
      if (existingRecord?.prescriptions?.length) {
        setPrescriptions(existingRecord.prescriptions)
      }
    } catch (err) {
      console.error(err)
      setResult({
        error: isHindi
          ? 'सर्वर से कनेक्ट नहीं हो सका। कनेक्शन जांचें और दोबारा प्रयास करें।'
          : 'Could not reach the server. Check your connection and tap Analyze to retry.',
      })
    } finally {
      setLoading(false)
    }
  }

  const MAX_IMAGES = 3
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024

  const handleImageSelect = (e) => {
    setImageError('')
    const picked = Array.from(e.target.files || [])
    e.target.value = '' // allow re-selecting the same file later
    const accepted = []
    for (const file of picked) {
      if (!file.type.startsWith('image/')) {
        setImageError(isHindi ? 'केवल इमेज फाइलें allowed हैं।' : 'Only image files are allowed.')
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageError(isHindi ? 'हर फोटो 5MB से छोटी होनी चाहिए।' : 'Each photo must be under 5MB.')
        continue
      }
      accepted.push({ file, preview: URL.createObjectURL(file) })
    }
    setImages((prev) => {
      const room = MAX_IMAGES - prev.length
      if (accepted.length > room) {
        setImageError(isHindi ? `अधिकतम ${MAX_IMAGES} फोटो।` : `You can attach up to ${MAX_IMAGES} photos.`)
      }
      return [...prev, ...accepted.slice(0, room)]
    })
  }

  const removeImage = (idx) => {
    setImages((prev) => {
      const target = prev[idx]
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((_, i) => i !== idx)
    })
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
      maxWidth: 720,
      margin: '0 auto',
      padding: '20px',
      paddingTop: '40px',
      paddingBottom: '80px',
      color: '#1F2937',
      minHeight: '100vh',
      boxSizing: 'border-box',
      width: '100%',
    }}>
      {/* Header with gradient */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 40,
        padding: '32px 0',
        borderBottom: '2px solid rgba(15, 118, 110, 0.1)',
      }}>
        <div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Sanjeevani
          </h1>
          <p style={{
            fontSize: 14,
            color: '#6B7280',
            margin: '8px 0 0',
            fontWeight: 500,
          }}>
            {isHindi ? 'स्वास्थ्य मूल्यांकन' : 'Healthcare Assessment'}
          </p>
        </div>

        {/* Language toggle */}
        <div style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: s.colors.gray[100],
          borderRadius: 8,
          flexShrink: 0,
        }}>
          {[['en', 'English'], ['hi', 'हिंदी']].map(([code, label]) => (
            <button
              key={code}
              onClick={() => switchLang(code)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: uiLang === code ? 'white' : 'transparent',
                color: uiLang === code ? s.colors.primary : s.colors.gray[600],
                boxShadow: uiLang === code ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!result && !returnPatient ? (
        <>
          {/* Returning Patient Section */}
          <div style={{
            ...s.card,
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            borderLeft: `4px solid ${s.colors.secondary}`,
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0C2340', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
              {isHindi ? 'पहले आ चुके हैं?' : 'Returning patient?'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={lookupPatientId}
                onChange={(e) => setLookupPatientId(e.target.value)}
                placeholder={isHindi ? 'अपना Patient ID दर्ज करें (जैसे CHIRAG-001)' : 'Enter your Patient ID (e.g., CHIRAG-001)'}
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
                    const res = await fetch(apiUrl(`/api/prescriptions/${id}`)
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
              {isHindi ? 'आपका नाम' : 'Your name'}
            </p>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder={isHindi ? 'अपना नाम दर्ज करें (जैसे Chirag)' : 'Enter your name (e.g., Chirag)'}
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
              {isHindi ? 'अपने लक्षण बताएं' : 'Describe your symptoms'}
            </p>
            <VoiceInput onTranscriptReady={handleTranscript} lang={uiLang} submitting={loading} />

            {/* Quick examples — one tap runs a real triage. A reliable fallback if
                the mic or network misbehaves, and a fast way to show each risk level. */}
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, color: s.colors.gray[500], margin: '0 0 8px' }}>
                {isHindi ? 'या एक उदाहरण आज़माएं:' : 'Or try an example:'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(isHindi
                  ? [
                      { label: '🫀 सीने में दर्द', text: 'mujhe seene mein bahut dard ho raha hai aur saans nahi aa rahi' },
                      { label: '🤒 तेज बुखार', text: 'mujhe do din se tez bukhar aur badan dard hai' },
                      { label: '🤕 सिर दर्द', text: 'thoda sir dard aur khansi hai' },
                    ]
                  : [
                      { label: '🫀 Chest pain', text: 'I have severe chest pain and difficulty breathing' },
                      { label: '🤒 High fever', text: 'I have had a high fever and body pain for two days' },
                      { label: '🤕 Headache', text: 'I have a mild headache and a cough' },
                    ]
                ).map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => handleTranscript(ex.text)}
                    disabled={loading}
                    style={{
                      background: s.colors.gray[50], border: `1px solid ${s.colors.gray[200]}`,
                      color: s.colors.gray[700], fontSize: 13, fontWeight: 600,
                      padding: '8px 12px', borderRadius: 20, cursor: loading ? 'default' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional photo attachment — a rash, wound, injury, or paper report */}
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${s.colors.gray[200]}` }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: s.colors.gray[600], margin: '0 0 10px' }}>
                {isHindi ? '📷 कोई फोटो जोड़ें (वैकल्पिक)' : '📷 Add a photo (optional)'}
              </p>

              {images.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  {images.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img
                        src={img.preview}
                        alt={`attachment ${idx + 1}`}
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: `1px solid ${s.colors.gray[300]}` }}
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        aria-label="Remove photo"
                        style={{
                          position: 'absolute', top: -8, right: -8, width: 22, height: 22,
                          borderRadius: '50%', border: 'none', background: s.colors.danger,
                          color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length < 3 && (
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '10px 14px', borderRadius: 8, border: `1px dashed ${s.colors.gray[400]}`,
                  background: s.colors.gray[50], color: s.colors.gray[600], fontSize: 13, fontWeight: 600,
                }}>
                  <span>＋</span>
                  {isHindi ? 'फोटो चुनें या खींचें' : 'Choose or take a photo'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleImageSelect}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              {imageError && (
                <p style={{ fontSize: 12, color: s.colors.danger, margin: '8px 0 0' }}>{imageError}</p>
              )}
              <p style={{ fontSize: 11, color: s.colors.gray[400], margin: '8px 0 0' }}>
                {isHindi ? 'अधिकतम 3 फोटो · प्रत्येक 5MB तक' : 'Up to 3 photos · max 5MB each'}
              </p>
            </div>
          </div>

          {loading && (
            <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 20, height: 20, border: '2.5px solid #E5E7EB', borderTopColor: '#2563EB',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0,
              }} />
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>{isHindi ? 'AI से लक्षणों का विश्लेषण हो रहा है...' : 'Analyzing symptoms with AI...'}</p>
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
                  ...s.card,
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #DCFCE7 100%)',
                  borderLeft: `4px solid ${s.colors.success}`,
                  marginBottom: 20,
                }}>
                  <p style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#065F46',
                    margin: '0 0 8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
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
                    {isHindi
                      ? 'यह ID सेव करें — अगली बार प्रिस्क्रिप्शन और इतिहास देखने के लिए।'
                      : 'Save this ID — use it to check prescriptions and history next visit.'}
                  </p>
                </div>
              )}

              <TriageResult result={result} />

              {/* Tab Navigation */}
              <div style={{
                display: 'flex',
                gap: 6,
                overflowX: 'auto',
                marginTop: 24,
                paddingBottom: 12,
                borderBottom: `2px solid ${s.colors.gray[200]}`,
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
              }}>
                {[
                  { id: 'assessment', label: '📊 Assessment' },
                  { id: 'guidance', label: '🆘 Guidance' },
                  { id: 'appointments', label: '📅 Appointments' },
                  { id: 'bed', label: '🛏️ Bed' },
                  { id: 'instructions', label: '📋 Instructions', badge: unseenNotes },
                  { id: 'qa', label: isHindi ? '💬 सवाल-जवाब' : '💬 Q&A', badge: unseenFollowups },
                  { id: 'prescriptions', label: `💊 Rx${prescriptions.length ? ` (${prescriptions.length})` : ''}` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      position: 'relative',
                      padding: '10px 12px',
                      borderRadius: '6px 6px 0 0',
                      border: 'none',
                      background: activeTab === tab.id ? s.colors.primary : s.colors.gray[100],
                      color: activeTab === tab.id ? 'white' : s.colors.gray[600],
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      minWidth: 'min-content',
                    }}
                  >
                    {tab.label}
                    {tab.badge > 0 && (
                      <span style={{
                        background: s.colors.danger, color: 'white', fontSize: 10, fontWeight: 800,
                        minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1, animation: 'pulse 1.5s ease-in-out infinite',
                      }}>
                        {tab.badge}
                      </span>
                    )}
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
                  <ImmediateGuidance result={result} lang={uiLang} />
                  <p style={{ fontSize: 11, color: s.colors.gray[400], margin: '8px 4px 0' }}>
                    {isHindi ? 'AI द्वारा सुझाया गया · डॉक्टर की सलाह का विकल्प नहीं' : 'AI-suggested · not a substitute for a doctor'}
                  </p>
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
                  {/* Live doctor notes pushed from the doctor's dashboard */}
                  {doctorNotes.length > 0 && (
                    <div style={{ ...s.card, marginBottom: 16 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: s.colors.gray[900], margin: '0 0 14px' }}>
                        {isHindi ? '🩺 डॉक्टर के नोट्स' : '🩺 Notes from your doctor'}
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {doctorNotes.map((note, idx) => (
                          <div key={idx} style={{
                            padding: 12, borderRadius: 8, background: s.colors.gray[50],
                            border: `1px solid ${s.colors.gray[200]}`, borderLeft: `3px solid ${s.colors.primary}`,
                          }}>
                            <p style={{
                              fontSize: 14, color: s.colors.gray[800], lineHeight: 1.6,
                              margin: '0 0 6px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                              {note.content}
                            </p>
                            <span style={{ fontSize: 11, color: s.colors.gray[400] }}>
                              {[note.date, note.time].filter(Boolean).join(' · ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <DoctorInstructions instructions={doctorInstructions} />
                </div>
              )}

              {activeTab === 'qa' && (
                <div style={{ marginTop: 16 }}>
                  <div style={s.card}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: s.colors.gray[900], margin: '0 0 4px' }}>
                      {isHindi ? '💬 डॉक्टर से सवाल-जवाब' : '💬 Q&A with your doctor'}
                    </h3>
                    <p style={{ fontSize: 12, color: s.colors.gray[500], margin: '0 0 14px' }}>
                      {isHindi
                        ? 'डॉक्टर के सवालों का यहाँ जवाब दें।'
                        : 'Answer your doctor’s follow-up questions here.'}
                    </p>
                    <FollowUpThread
                      followups={followups}
                      sender="patient"
                      patientId={savedPatientId}
                      onSend={sendFollowupAnswer}
                      lang={uiLang}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div style={{ marginTop: 16 }}>
                  {prescriptions.length === 0 && (
                    <div style={{
                      padding: 12, borderRadius: 8, background: '#FFF7ED',
                      border: '1px solid #FED7AA', marginBottom: 12, fontSize: 12, color: '#92400E',
                    }}>
                      {isHindi
                        ? 'डॉक्टर के प्रिस्क्रिप्शन देने का इंतजार है। यह टैब अपने आप अपडेट होता है।'
                        : 'Waiting for doctor to add prescriptions. This tab updates automatically.'}
                    </div>
                  )}
                  <PrescriptionsList prescriptions={prescriptions} />
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${s.colors.gray[200]}` }}>
            <button
              onClick={() => {
                setResult(null)
                setAllPatients([])
                setActiveTab('assessment')
                setDoctorInstructions(null)
                setPrescriptions([])
                setDoctorNotes([])
                setFollowups([])
                setSeenNotesCount(0)
                setSeenFollowupsCount(0)
                setSavedPatientId(null)
                setReturnPatient(null)
                setLookupPatientId('')
              }}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: 10,
                border: `2px solid ${s.colors.gray[300]}`,
                background: 'white',
                color: s.colors.gray[700],
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.target.style.background = s.colors.gray[100]
                e.target.style.borderColor = s.colors.gray[400]
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'white'
                e.target.style.borderColor = s.colors.gray[300]
              }}
            >
              {isHindi ? 'नई जांच शुरू करें' : 'Start Over'}
            </button>
          </div>
        </>
      )}

      {/* Medical disclaimer — always visible. Builds trust and is the responsible
          thing to show for an AI triage tool. */}
      <div style={{
        marginTop: 28, padding: '12px 14px', borderRadius: 10,
        background: s.colors.gray[50], border: `1px solid ${s.colors.gray[200]}`,
        fontSize: 11.5, lineHeight: 1.5, color: s.colors.gray[500], textAlign: 'center',
      }}>
        {isHindi
          ? '⚕️ यह एक AI सहायक है, डॉक्टर का विकल्प नहीं। आपातकाल में तुरंत 108 पर कॉल करें।'
          : '⚕️ This is an AI assistant, not a substitute for a doctor. In an emergency, call 108 immediately.'}
      </div>
    </div>
  )
}
