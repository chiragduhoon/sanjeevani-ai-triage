import React, { useState, useRef, useCallback, useEffect } from 'react'
import { s } from './styles'

export default function VoiceInput({ onTranscriptReady, lang = 'en', submitting = false }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState('')
  // Soft, non-alarming hint (e.g. nothing was heard) — distinct from hard errors.
  const [notice, setNotice] = useState('')
  const recognitionRef = useRef(null)
  // Keep a ref so toggleListening always reads the latest lang without needing the effect to re-run
  const langRef = useRef(lang)
  useEffect(() => { langRef.current = lang }, [lang])

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setSupported(false); return }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (e) => {
      let finalText = ''
      let interimText = ''
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += t + ' '
        else interimText += t
      }
      if (finalText) setTranscript((prev) => prev + finalText)
      setInterim(interimText)
    }

    recognition.onerror = (e) => {
      console.error('Speech error:', e.error)
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Check browser permissions.')
      } else if (e.error === 'service-not-allowed' || e.error === 'network') {
        setError('Speech recognition blocked. If using Brave, enable it at brave://settings/privacy or switch to Chrome.')
      } else if (e.error === 'no-speech') {
        // Common when the user pauses or the mic hears nothing — guide, don't alarm.
        setNotice(langRef.current === 'hi'
          ? 'कुछ सुनाई नहीं दिया — माइक दबाकर दोबारा बोलें।'
          : "Didn't catch that — tap the mic and try speaking again.")
      } else {
        setError('Speech error: ' + e.error)
      }
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
  }, [])

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current || submitting) return
    setError('')
    setNotice('')
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        setError('Microphone access denied. Allow it in your browser settings and try again.')
        return
      }
      setTranscript('')
      setInterim('')
      try {
        // Apply current language setting before each start
        recognitionRef.current.lang = langRef.current === 'hi' ? 'hi-IN' : 'en-US'
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        setError('Could not start speech recognition. Try Chrome instead of Brave.')
      }
    }
  }, [isListening, submitting])

  const handleSubmit = () => {
    if (submitting) return // guard against double-tap while a triage is in flight
    const full = (transcript + interim).trim()
    if (full && onTranscriptReady) onTranscriptReady(full)
  }

  const fullDisplay = transcript + interim

  const isHindi = lang === 'hi'

  if (!supported) {
    return (
      <div style={{ textAlign: 'center', padding: 12, color: '#6B7280', fontSize: 14 }}>
        <p style={{ fontWeight: 500, marginBottom: 8 }}>Voice input requires Chrome or Edge</p>
        <textarea
          style={s.textArea}
          placeholder={isHindi ? 'यहाँ अपने लक्षण लिखें...' : 'Type your symptoms here instead...'}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={4}
        />
        <button
          style={{ ...s.submitBtn, marginTop: 12, opacity: (transcript.trim() && !submitting) ? 1 : 0.4 }}
          disabled={!transcript.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting
            ? (isHindi ? 'विश्लेषण हो रहा है...' : 'Analyzing...')
            : (isHindi ? 'लक्षण विश्लेषण करें' : 'Analyze symptoms')}
        </button>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      width: '100%',
    }}>
      {/* Mic button */}
      <button
        onClick={toggleListening}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: isListening
            ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
            : 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
          boxShadow: isListening
            ? '0 0 0 12px rgba(220, 38, 38, 0.15), 0 8px 24px rgba(220, 38, 38, 0.3)'
            : '0 8px 24px rgba(15, 118, 110, 0.25)',
          transform: isListening ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isListening ? (
            <rect x="6" y="6" width="12" height="12" rx="2" fill="white" stroke="none" />
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
      </button>

      <p style={{ fontSize: 14, color: '#6B7280' }}>
        {isListening
          ? (isHindi ? 'सुन रहा हूँ... रोकने के लिए दबाएं' : 'Listening... tap to stop')
          : (isHindi ? 'अपने लक्षण बताने के लिए दबाएं' : 'Tap to describe your symptoms')}
      </p>

      {error && (
        <div style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B',
          fontSize: 13, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {notice && !error && (
        <div style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E',
          fontSize: 13, lineHeight: 1.5,
        }}>
          {notice}
        </div>
      )}

      {/* Live transcript box — read-only while listening, editable after */}
      {isListening ? (
        <div style={{
          width: '100%',
          borderRadius: 12,
          border: `2px solid ${s.colors.primary}`,
          padding: 18,
          background: 'rgba(15, 118, 110, 0.02)',
          transition: 'all 0.2s ease',
          minHeight: fullDisplay ? 120 : 80,
          boxShadow: `0 0 0 3px rgba(15, 118, 110, 0.1)`,
        }}>
          {fullDisplay ? (
            <p style={{ fontSize: 15, lineHeight: 1.7, color: '#1F2937', margin: 0 }}>
              {transcript}
              <span style={{ color: '#9CA3AF' }}>{interim}</span>
              <span style={{
                color: s.colors.primary,
                animation: 'blink 1s step-end infinite',
                fontWeight: 300,
                marginLeft: 2,
              }}>|</span>
            </p>
          ) : (
            <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>
              {isHindi ? 'बोलना शुरू करें...' : 'Start speaking...'}
            </p>
          )}
        </div>
      ) : (
        <>
          <textarea
            style={{
              ...s.textArea,
              border: transcript.trim() ? `2px solid ${s.colors.primary}` : `2px solid ${s.colors.gray[200]}`,
              boxShadow: transcript.trim() ? `0 0 0 3px rgba(15, 118, 110, 0.1)` : 'none',
              minHeight: 110,
              fontSize: 15,
              lineHeight: 1.7,
              padding: '14px 16px',
            }}
            placeholder={isHindi ? 'आपके लक्षण यहाँ दिखेंगे — सबमिट करने से पहले संपादित कर सकते हैं...' : 'Your symptoms will appear here — edit before submitting...'}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
          />
          {transcript.trim() && (
            <button
              onClick={() => { setTranscript(''); setInterim('') }}
              style={{
                alignSelf: 'flex-end',
                marginTop: 10,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1px solid ${s.colors.gray[300]}`,
                background: s.colors.gray[50],
                color: s.colors.gray[600],
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.target.style.background = s.colors.gray[100]
                e.target.style.borderColor = s.colors.gray[400]
              }}
              onMouseOut={(e) => {
                e.target.style.background = s.colors.gray[50]
                e.target.style.borderColor = s.colors.gray[300]
              }}
            >
              ✕ Clear & Redo
            </button>
          )}
        </>
      )}

      {/* Type manually hint when nothing captured yet */}
      {!isListening && !transcript.trim() && (
        <p style={{ fontSize: 12, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          {isHindi ? 'या ऊपर टाइप करें' : 'or type above manually'}
        </p>
      )}

      {/* Submit button */}
      {transcript.trim() && !isListening && (
        <button
          style={{
            ...s.submitBtn,
            background: `linear-gradient(135deg, ${s.colors.primary} 0%, ${s.colors.primaryLight} 100%)`,
            marginTop: 12,
            opacity: submitting ? 0.6 : 1,
            cursor: submitting ? 'default' : 'pointer',
          }}
          disabled={submitting}
          onMouseOver={(e) => {
            if (submitting) return
            e.target.style.boxShadow = `0 8px 16px rgba(15, 118, 110, 0.35)`
            e.target.style.transform = 'translateY(-2px)'
          }}
          onMouseOut={(e) => {
            e.target.style.boxShadow = s.submitBtn.boxShadow
            e.target.style.transform = 'translateY(0)'
          }}
          onClick={handleSubmit}
        >
          {submitting
            ? (isHindi ? 'विश्लेषण हो रहा है...' : 'Analyzing...')
            : (isHindi ? 'लक्षण विश्लेषण करें' : 'Analyze Symptoms')}
        </button>
      )}
    </div>
  )
}
