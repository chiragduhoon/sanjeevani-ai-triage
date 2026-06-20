import React, { useState, useRef, useCallback, useEffect } from 'react'
import { s } from './styles'

export default function VoiceInput({ onTranscriptReady }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [supported, setSupported] = useState(true)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

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
      } else if (e.error !== 'no-speech') {
        setError('Speech error: ' + e.error)
      }
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
  }, [])

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) return
    setError('')
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
        recognitionRef.current.start()
        setIsListening(true)
      } catch (err) {
        setError('Could not start speech recognition. Try Chrome instead of Brave.')
      }
    }
  }, [isListening])

  const handleSubmit = () => {
    const full = (transcript + interim).trim()
    if (full && onTranscriptReady) onTranscriptReady(full)
  }

  const fullDisplay = transcript + interim

  if (!supported) {
    return (
      <div style={{ textAlign: 'center', padding: 12, color: '#6B7280', fontSize: 14 }}>
        <p style={{ fontWeight: 500, marginBottom: 8 }}>Voice input requires Chrome or Edge</p>
        <textarea
          style={s.textArea}
          placeholder="Type your symptoms here instead..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={4}
        />
        <button
          style={{ ...s.submitBtn, marginTop: 12, opacity: transcript.trim() ? 1 : 0.4 }}
          disabled={!transcript.trim()}
          onClick={handleSubmit}
        >
          Analyze symptoms
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Mic button */}
      <button
        onClick={toggleListening}
        style={{
          width: 72, height: 72, borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
          background: isListening ? '#DC2626' : '#2563EB',
          boxShadow: isListening ? '0 0 0 8px rgba(220,38,38,0.15)' : 'none',
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
        {isListening ? 'Listening... tap to stop' : 'Tap to describe your symptoms'}
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

      {/* Live transcript box — read-only while listening, editable after */}
      {isListening ? (
        <div style={{
          width: '100%', borderRadius: 8, border: '2px solid #2563EB',
          padding: 16, transition: 'all 0.2s', minHeight: fullDisplay ? 120 : 80,
        }}>
          {fullDisplay ? (
            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#1F2937', margin: 0 }}>
              {transcript}
              <span style={{ color: '#9CA3AF' }}>{interim}</span>
              <span style={{ color: '#2563EB', animation: 'blink 1s step-end infinite', fontWeight: 300 }}>|</span>
            </p>
          ) : (
            <p style={{ fontSize: 14, color: '#D1D5DB', margin: 0 }}>Start speaking...</p>
          )}
        </div>
      ) : (
        <>
          <textarea
            style={{
              ...s.textArea,
              border: transcript.trim() ? '2px solid #2563EB' : '2px solid #E5E7EB',
              minHeight: 100,
              fontSize: 15,
              lineHeight: 1.6,
            }}
            placeholder="Your symptoms will appear here — you can edit them before submitting..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
          />
          {transcript.trim() && (
            <button
              onClick={() => { setTranscript(''); setInterim('') }}
              style={{
                alignSelf: 'flex-end',
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                background: 'white',
                color: '#6B7280',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
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
          or type above manually
        </p>
      )}

      {/* Submit button */}
      {transcript.trim() && !isListening && (
        <button style={s.submitBtn} onClick={handleSubmit}>Analyze symptoms</button>
      )}
    </div>
  )
}
