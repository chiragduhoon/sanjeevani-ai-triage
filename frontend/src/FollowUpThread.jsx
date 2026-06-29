import { apiUrl } from './api.js'
import { apiUrl } from './api.js'
import React, { useState, useRef } from 'react'
import { s } from './styles'

/**
 * Two-way follow-up Q&A thread shared by the doctor and patient views.
 * Supports an optional photo attachment per message (uploaded via /api/images).
 *
 * @param {array}  followups  list of { sender, text, image, time }
 * @param {string} sender     who is using this view ('doctor' | 'patient')
 * @param {string} patientId  needed to upload an attached photo
 * @param {func}   onSend     called with (text, imageUrl) when sent
 * @param {string} lang       'en' | 'hi' for labels/placeholder
 */
export default function FollowUpThread({ followups = [], sender, patientId, onSend, lang = 'en' }) {
  const [text, setText] = useState('')
  const [pending, setPending] = useState(null) // { file, preview }
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const isHindi = lang === 'hi'

  const pickPhoto = (e) => {
    const file = e.target.files?.[0]
    if (file) setPending({ file, preview: URL.createObjectURL(file) })
    e.target.value = '' // allow re-selecting the same file
  }

  const send = async () => {
    const t = text.trim()
    if (!t && !pending) return
    if (uploading) return

    let imageUrl = ''
    if (pending && patientId) {
      setUploading(true)
      try {
        const form = new FormData()
        form.append('files', pending.file)
        const res = await fetch(apiUrl(`/api/images/${patientId}`), { method: 'POST', body: form })
        if (res.ok) imageUrl = ((await res.json()).urls || [])[0] || ''
      } catch {}
      setUploading(false)
    }

    onSend(t, imageUrl)
    setText('')
    setPending(null)
  }

  const labelFor = (who) =>
    who === 'doctor' ? (isHindi ? 'डॉक्टर' : 'Doctor') : (isHindi ? 'मरीज़' : 'Patient')

  return (
    <div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12,
        maxHeight: 320, overflowY: 'auto',
      }}>
        {followups.length === 0 && (
          <p style={{ fontSize: 12, color: s.colors.gray[400], margin: 0, textAlign: 'center', padding: 12 }}>
            {sender === 'doctor'
              ? (isHindi ? 'अभी तक कोई संदेश नहीं। नीचे प्रश्न पूछें।' : 'No messages yet. Ask a question below.')
              : (isHindi ? 'डॉक्टर के सवाल यहाँ दिखेंगे।' : "The doctor's questions will appear here.")}
          </p>
        )}
        {followups.map((m, i) => {
          const mine = m.sender === sender
          const isDoctor = m.sender === 'doctor'
          return (
            <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%',
                background: isDoctor ? '#EFF6FF' : '#F0FDF4',
                border: `1px solid ${isDoctor ? '#BFDBFE' : '#BBF7D0'}`,
                borderRadius: 10, padding: '8px 11px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: isDoctor ? '#2563EB' : '#059669', marginBottom: 3 }}>
                  {labelFor(m.sender)}
                </div>
                {m.image && (
                  <img
                    src={m.image}
                    alt="attachment"
                    onClick={() => window.open(m.image, '_blank')}
                    style={{
                      maxWidth: 180, maxHeight: 180, borderRadius: 8, marginBottom: m.text ? 6 : 0,
                      cursor: 'pointer', display: 'block', objectFit: 'cover',
                    }}
                  />
                )}
                {m.text && (
                  <div style={{ fontSize: 13, color: s.colors.gray[800], lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.text}
                  </div>
                )}
                <div style={{ fontSize: 10, color: s.colors.gray[400], marginTop: 4, textAlign: 'right' }}>
                  {m.time}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pending photo preview */}
      {pending && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <img src={pending.preview} alt="to send" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
          <span style={{ fontSize: 12, color: s.colors.gray[500] }}>
            {uploading ? (isHindi ? 'भेजा जा रहा…' : 'Uploading…') : (isHindi ? 'फोटो संलग्न' : 'Photo attached')}
          </span>
          <button
            onClick={() => setPending(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: s.colors.danger, fontSize: 16, cursor: 'pointer' }}
            aria-label="Remove photo"
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />
        <button
          onClick={() => fileRef.current?.click()}
          title={isHindi ? 'फोटो जोड़ें' : 'Attach photo'}
          style={{
            background: s.colors.gray[100], border: `1px solid ${s.colors.gray[300]}`,
            borderRadius: 8, padding: '0 12px', fontSize: 16, cursor: 'pointer', flexShrink: 0,
          }}
        >
          📎
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder={sender === 'doctor'
            ? (isHindi ? 'फॉलो-अप प्रश्न पूछें…' : 'Ask a follow-up question…')
            : (isHindi ? 'अपना जवाब लिखें…' : 'Type your answer…')}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${s.colors.gray[300]}`, fontSize: 13, boxSizing: 'border-box', outline: 'none',
          }}
        />
        <button
          onClick={send}
          disabled={(!text.trim() && !pending) || uploading}
          style={{
            background: (text.trim() || pending) && !uploading ? s.colors.primary : s.colors.gray[300], color: 'white',
            border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600,
            cursor: (text.trim() || pending) && !uploading ? 'pointer' : 'default', flexShrink: 0,
          }}
        >
          {isHindi ? 'भेजें' : 'Send'}
        </button>
      </div>
    </div>
  )
}
