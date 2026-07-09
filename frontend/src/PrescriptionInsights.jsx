import React, { useState } from 'react'
import { apiUrl } from './api'
import { s } from './styles'

// "What was this prescription for?" — sends the patient's saved prescriptions to
// POST /api/prescriptions/{patientId}/explain and renders the AI's answer: the
// likely illness and what each medicine helped with. Works for the current visit
// and for previous prescriptions (return-patient view / history modal), since the
// prescription list itself is sent in the request body.
export default function PrescriptionInsights({ patientId, prescriptions = [], lang = 'en' }) {
  const isHindi = lang === 'hi'
  const t = (hi, en) => (isHindi ? hi : en)

  const [phase, setPhase] = useState('idle') // idle | loading | done | error
  const [insights, setInsights] = useState(null)

  if (!patientId || !prescriptions.length) return null

  const fetchInsights = async () => {
    setPhase('loading')
    try {
      const res = await fetch(apiUrl(`/api/prescriptions/${patientId}/explain`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, prescriptions }),
      })
      if (!res.ok) throw new Error('explain failed')
      const data = await res.json()
      if (!data.insights) throw new Error('no insights')
      setInsights(data.insights)
      setPhase('done')
    } catch {
      setPhase('error')
    }
  }

  const confidenceBanner = insights && insights.confidence === 'low' && (
    <div style={{
      padding: '8px 12px', borderRadius: 8, background: '#FFFBEB',
      border: '1px solid #FDE68A', fontSize: 12, color: '#92400E', marginBottom: 12,
    }}>
      ⚠️ {t('AI पक्का नहीं है — यह सिर्फ एक अंदाज़ा है।',
            'The AI is not sure — treat this as a rough guess.')}
    </div>
  )

  return (
    <div style={{ ...s.card, padding: 20, borderLeft: `4px solid ${s.colors.primary}` }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: s.colors.gray[900], margin: '0 0 4px' }}>
        🔎 {t('यह प्रिस्क्रिप्शन किस लिए था?', 'What was this prescription for?')}
      </h3>
      <p style={{ fontSize: 12, color: s.colors.gray[500], margin: '0 0 14px' }}>
        {t('AI बताएगा कि यह दवाइयां किस बीमारी के लिए थीं और हर दवा ने किस चीज़ में मदद की।',
           'AI explains what illness these medicines were for and what each medicine helped with.')}
      </p>

      {(phase === 'idle' || phase === 'error') && (
        <>
          {phase === 'error' && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, background: '#FEF2F2',
              border: '1px solid #FECACA', fontSize: 12, color: '#7F1D1D', marginBottom: 12,
            }}>
              ⚠️ {t('समझा नहीं पाए। दोबारा कोशिश करें।', 'Could not analyze. Please try again.')}
            </div>
          )}
          <button
            onClick={fetchInsights}
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none',
              background: s.colors.primary, color: 'white',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {phase === 'error'
              ? t('दोबारा कोशिश करें', 'Try again')
              : `✨ ${t('AI से समझें', 'Explain with AI')}`}
          </button>
        </>
      )}

      {phase === 'loading' && (
        <p style={{ fontSize: 13, color: s.colors.gray[600], margin: 0 }}>
          ⏳ {t('AI आपकी दवाइयां समझ रहा है...', 'AI is analyzing your medicines...')}
        </p>
      )}

      {phase === 'done' && insights && (
        <div>
          {confidenceBanner}

          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: '#F0FDFA', border: '1px solid #99F6E4', marginBottom: 14,
          }}>
            <p style={{
              fontSize: 11, fontWeight: 700, color: '#115E59', margin: '0 0 4px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              🩺 {t('संभावित बीमारी', 'Likely illness')}
            </p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#134E4A', margin: '0 0 6px' }}>
              {insights.likely_condition}
            </p>
            {insights.condition_explanation && (
              <p style={{ fontSize: 12, color: '#0F766E', margin: 0, lineHeight: 1.6 }}>
                {insights.condition_explanation}
              </p>
            )}
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: s.colors.gray[700], margin: '0 0 8px' }}>
            💊 {t('हर दवा ने क्या किया', 'What each medicine did')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {insights.medicines.map((med, idx) => (
              <div key={idx} style={{
                padding: '10px 12px', borderRadius: 8,
                background: s.colors.gray[50], border: `1px solid ${s.colors.gray[200]}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.colors.gray[900] }}>
                    {med.medicine_name}
                  </span>
                  {med.purpose && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                      background: '#CCFBF1', color: '#115E59', alignSelf: 'center',
                    }}>
                      {med.purpose}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: s.colors.gray[600], margin: '6px 0 0', lineHeight: 1.5 }}>
                  {med.helped_with}
                </p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, color: s.colors.gray[400], margin: 0, lineHeight: 1.5 }}>
            ℹ️ {t('यह जानकारी AI ने बनाई है और सिर्फ समझने के लिए है — पक्की जानकारी के लिए अपने डॉक्टर से पूछें।',
                  'This explanation is AI-generated and for understanding only — confirm with your doctor.')}
          </p>
        </div>
      )}
    </div>
  )
}
