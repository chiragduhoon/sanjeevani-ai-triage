import React, { useRef, useState } from 'react'
import { apiUrl } from './api'
import { s } from './styles'

const MAX_BYTES = 5 * 1024 * 1024

const EMPTY_MEDICINE = { medicine_name: '', dosage: '', frequency: '', duration: '', instructions: '' }

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #D1D5DB',
  fontSize: 12,
  boxSizing: 'border-box',
}

const smallLabel = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7280',
  display: 'block',
  marginBottom: 4,
}

// Upload a prescription photo -> vision LLM extracts medicines/doctor/date ->
// user reviews and corrects in an editable form -> saved via the same
// POST /api/prescriptions/{patientId} records doctors create, so PrescriptionsList
// renders them identically. Used on both the patient page and the doctor panel.
export default function PrescriptionScanner({ patientId, lang = 'en', onSaved }) {
  const isHindi = lang === 'hi'
  const t = (hi, en) => (isHindi ? hi : en)

  const [phase, setPhase] = useState('idle') // idle | extracting | review | saving | saved | error
  const [preview, setPreview] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [extractFailed, setExtractFailed] = useState(false)
  const [confidence, setConfidence] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [rxDate, setRxDate] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [medicines, setMedicines] = useState([])
  const fileRef = useRef(null)

  const resetToIdle = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setErrMsg('')
    setExtractFailed(false)
    setConfidence('')
    setDoctorName('')
    setRxDate('')
    setDiagnosis('')
    setMedicines([])
    if (fileRef.current) fileRef.current.value = ''
    setPhase('idle')
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrMsg(t('कृपया एक फोटो चुनें (JPG/PNG)।', 'Please choose an image (JPG/PNG).'))
      setPhase('error')
      return
    }
    if (file.size > MAX_BYTES) {
      setErrMsg(t('फोटो 5MB से छोटी होनी चाहिए।', 'Image must be under 5MB.'))
      setPhase('error')
      return
    }

    setPreview(URL.createObjectURL(file))
    setPhase('extracting')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(apiUrl('/api/prescriptions/extract'), { method: 'POST', body: form })
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail
        setErrMsg(detail || t('फोटो अपलोड नहीं हो पाई।', 'Could not upload the photo.'))
        setPhase('error')
        return
      }
      const data = await res.json()
      if (data.success && data.extracted) {
        const ex = data.extracted
        setDoctorName(ex.doctor_name || '')
        setRxDate(ex.prescription_date || '')
        setDiagnosis(ex.diagnosis || '')
        setMedicines(ex.medicines?.length ? ex.medicines : [{ ...EMPTY_MEDICINE }])
        setConfidence(ex.confidence || 'low')
        setExtractFailed(false)
      } else {
        // AI couldn't read it (or no API key) — same form, manual entry
        setMedicines([{ ...EMPTY_MEDICINE }])
        setExtractFailed(true)
      }
      setPhase('review')
    } catch {
      setErrMsg(t('सर्वर से संपर्क नहीं हो पाया। दोबारा कोशिश करें।', 'Could not reach the server. Please try again.'))
      setPhase('error')
    }
  }

  const updateMedicine = (idx, field, value) => {
    setMedicines(prev => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))
  }

  const validMedicines = medicines.filter(m => m.medicine_name.trim())

  const handleSave = async () => {
    if (!validMedicines.length || !patientId) return
    setPhase('saving')
    try {
      for (const med of validMedicines) {
        const body = {
          id: Date.now() + Math.random(),
          medicine_name: med.medicine_name.trim(),
          dosage: med.dosage.trim(),
          frequency: med.frequency.trim(),
          duration: med.duration.trim(),
          instructions: med.instructions.trim(),
          source: 'photo_scan',
        }
        if (doctorName.trim()) body.prescribing_doctor = doctorName.trim()
        if (diagnosis.trim()) body.scanned_diagnosis = diagnosis.trim()
        if (rxDate.trim()) body.scanned_date = rxDate.trim()
        const res = await fetch(apiUrl(`/api/prescriptions/${patientId}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('save failed')
      }
      if (onSaved) onSaved()
      setPhase('saved')
    } catch {
      setErrMsg(t('सेव नहीं हो पाया। दोबारा कोशिश करें।', 'Could not save. Please try again.'))
      setPhase('error')
    }
  }

  if (!patientId) {
    return (
      <div style={{ ...s.card, padding: 16 }}>
        <p style={{ fontSize: 13, color: s.colors.gray[500], margin: 0 }}>
          📄 {t('प्रिस्क्रिप्शन स्कैन करने के लिए पहले असेसमेंट पूरा करें।',
                'Complete an assessment first to scan a prescription.')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ ...s.card, padding: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: s.colors.gray[900], margin: '0 0 4px' }}>
        📄 {t('प्रिस्क्रिप्शन स्कैन करें', 'Scan a Prescription')}
      </h3>
      <p style={{ fontSize: 12, color: s.colors.gray[500], margin: '0 0 14px' }}>
        {t('कागज़ी पर्ची की फोटो लें — AI दवाइयों की जानकारी निकाल देगा।',
           'Take a photo of a paper prescription — AI will extract the medicine details.')}
      </p>

      {phase === 'idle' && (
        <label style={{
          display: 'block',
          padding: '20px 16px',
          borderRadius: 10,
          border: `2px dashed ${s.colors.gray[300]}`,
          background: s.colors.gray[50],
          textAlign: 'center',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: s.colors.primary,
        }}>
          📷 {t('फोटो चुनें या खींचें', 'Choose or take a photo')}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {phase === 'extracting' && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          {preview && (
            <img src={preview} alt="prescription" style={{ maxWidth: 140, maxHeight: 140, borderRadius: 8, border: `1px solid ${s.colors.gray[200]}` }} />
          )}
          <p style={{ fontSize: 13, color: s.colors.gray[600], margin: '12px 0 0' }}>
            ⏳ {t('AI प्रिस्क्रिप्शन पढ़ रहा है...', 'Reading prescription with AI...')}
          </p>
        </div>
      )}

      {(phase === 'review' || phase === 'saving') && (
        <div>
          {preview && (
            <img src={preview} alt="prescription" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: `1px solid ${s.colors.gray[200]}`, marginBottom: 12 }} />
          )}

          {extractFailed && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', marginBottom: 12 }}>
              ⚠️ {t('अपने आप पढ़ नहीं पाए — कृपया नीचे खुद भरें।',
                    "Couldn't read it automatically — please fill in the details below.")}
            </div>
          )}
          {!extractFailed && confidence === 'low' && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', marginBottom: 12 }}>
              ⚠️ {t('लिखावट साफ नहीं थी — कृपया ध्यान से जांचें।',
                    'The handwriting was hard to read — please double-check carefully.')}
            </div>
          )}
          {!extractFailed && confidence !== 'low' && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 12, color: '#166534', marginBottom: 12 }}>
              ✅ {t('जानकारी निकाल ली गई — सेव करने से पहले जांच लें।',
                    'Details extracted — please review before saving.')}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={smallLabel}>{t('डॉक्टर का नाम', 'Doctor Name')}</label>
              <input type="text" value={doctorName} onChange={e => setDoctorName(e.target.value)}
                placeholder="Dr. Sharma" style={inputStyle} disabled={phase === 'saving'} />
            </div>
            <div>
              <label style={smallLabel}>{t('पर्ची की तारीख', 'Prescription Date')}</label>
              <input type="text" value={rxDate} onChange={e => setRxDate(e.target.value)}
                placeholder="12 Mar 2026" style={inputStyle} disabled={phase === 'saving'} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={smallLabel}>{t('डायग्नोसिस / नोट्स', 'Diagnosis / Notes')}</label>
            <input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)}
              placeholder={t('जैसे: वायरल बुखार', 'e.g., Viral fever')} style={inputStyle} disabled={phase === 'saving'} />
          </div>

          <h4 style={{ fontSize: 13, fontWeight: 700, color: s.colors.gray[900], margin: '0 0 8px' }}>
            💊 {t('दवाइयां', 'Medicines')} ({medicines.length})
          </h4>
          {medicines.map((med, idx) => (
            <div key={idx} style={{ padding: 12, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={smallLabel}>{t('दवा का नाम *', 'Medicine Name *')}</label>
                  <input type="text" value={med.medicine_name}
                    onChange={e => updateMedicine(idx, 'medicine_name', e.target.value)}
                    placeholder="e.g., Amoxicillin" style={inputStyle} disabled={phase === 'saving'} />
                </div>
                <button
                  onClick={() => setMedicines(prev => prev.filter((_, i) => i !== idx))}
                  disabled={phase === 'saving'}
                  style={{ padding: '8px 10px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={smallLabel}>{t('खुराक', 'Dosage')}</label>
                  <input type="text" value={med.dosage}
                    onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                    placeholder="500mg" style={inputStyle} disabled={phase === 'saving'} />
                </div>
                <div>
                  <label style={smallLabel}>{t('कितनी बार', 'Frequency')}</label>
                  <input type="text" value={med.frequency}
                    onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                    placeholder={t('दिन में दो बार', 'Twice daily')} style={inputStyle} disabled={phase === 'saving'} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={smallLabel}>{t('कितने दिन', 'Duration')}</label>
                  <input type="text" value={med.duration}
                    onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                    placeholder={t('7 दिन', '7 days')} style={inputStyle} disabled={phase === 'saving'} />
                </div>
                <div>
                  <label style={smallLabel}>{t('निर्देश', 'Instructions')}</label>
                  <input type="text" value={med.instructions}
                    onChange={e => updateMedicine(idx, 'instructions', e.target.value)}
                    placeholder={t('खाने के बाद', 'After food')} style={inputStyle} disabled={phase === 'saving'} />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setMedicines(prev => [...prev, { ...EMPTY_MEDICINE }])}
            disabled={phase === 'saving'}
            style={{ padding: '8px 14px', borderRadius: 6, border: `1px dashed ${s.colors.gray[300]}`, background: 'white', color: s.colors.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}
          >
            + {t('दवा जोड़ें', 'Add medicine')}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={!validMedicines.length || phase === 'saving'}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: validMedicines.length && phase !== 'saving' ? s.colors.primary : '#D1D5DB',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: validMedicines.length && phase !== 'saving' ? 'pointer' : 'default',
              }}
            >
              {phase === 'saving'
                ? t('सेव हो रहा है...', 'Saving...')
                : t('पुष्टि करें और सेव करें', 'Confirm & Save')}
            </button>
            <button
              onClick={resetToIdle}
              disabled={phase === 'saving'}
              style={{ flex: 'none', padding: '10px 16px', borderRadius: 6, border: '1px solid #D1D5DB', background: 'white', color: s.colors.gray[500], fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {t('रद्द करें', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {phase === 'saved' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', fontSize: 13, color: '#166534', marginBottom: 12 }}>
            ✅ {t('प्रिस्क्रिप्शन सेव हो गया!', 'Prescription saved!')}
          </div>
          <button
            onClick={resetToIdle}
            style={{ padding: '10px 18px', borderRadius: 6, border: `1px solid ${s.colors.primary}`, background: 'white', color: s.colors.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            📷 {t('एक और स्कैन करें', 'Scan another')}
          </button>
        </div>
      )}

      {phase === 'error' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#7F1D1D', marginBottom: 12 }}>
            ⚠️ {errMsg}
          </div>
          <button
            onClick={resetToIdle}
            style={{ padding: '10px 18px', borderRadius: 6, border: 'none', background: s.colors.primary, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {t('दोबारा कोशिश करें', 'Try again')}
          </button>
        </div>
      )}
    </div>
  )
}
