import React, { useState, useRef, useCallback, useEffect } from "react";

const RISK_COLORS = {
  CRITICAL: { bg: "#FEE2E2", border: "#DC2626", text: "#991B1B", badge: "#DC2626" },
  HIGH: { bg: "#FEF3C7", border: "#D97706", text: "#92400E", badge: "#D97706" },
  MODERATE: { bg: "#DBEAFE", border: "#2563EB", text: "#1E40AF", badge: "#2563EB" },
  LOW: { bg: "#DCFCE7", border: "#059669", text: "#065F46", badge: "#059669" },
};

/* ─────────────────────────────────────────────
   VoiceInput — Web Speech API live transcription
   ───────────────────────────────────────────── */
function VoiceInput({ onTranscriptReady }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interimText += t;
      }
      if (finalText) setTranscript((prev) => prev + finalText);
      setInterim(interimText);
    };

    recognition.onerror = (e) => {
      console.error("Speech error:", e.error);
      if (e.error === "not-allowed") {
        setError("Microphone access denied. Check browser permissions.");
      } else if (e.error === "service-not-allowed" || e.error === "network") {
        setError("Speech recognition blocked. If using Brave, enable it at brave://settings/privacy or switch to Chrome.");
      } else if (e.error !== "no-speech") {
        setError("Speech error: " + e.error);
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const toggleListening = useCallback(async () => {
    if (!recognitionRef.current) return;
    setError("");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      // Request mic permission first so the user sees the popup
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        setError("Microphone access denied. Allow it in your browser settings and try again.");
        return;
      }
      setTranscript("");
      setInterim("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setError("Could not start speech recognition. Try Chrome instead of Brave.");
      }
    }
  }, [isListening]);

  const handleSubmit = () => {
    const full = (transcript + interim).trim();
    if (full && onTranscriptReady) onTranscriptReady(full);
  };

  const fullDisplay = transcript + interim;

  if (!supported) {
    return (
      <div style={{ textAlign: "center", padding: 12, color: "#6B7280", fontSize: 14 }}>
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
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {/* Mic button */}
      <button
        onClick={toggleListening}
        style={{
          width: 72, height: 72, borderRadius: "50%", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.3s ease",
          background: isListening ? "#DC2626" : "#2563EB",
          boxShadow: isListening ? "0 0 0 8px rgba(220,38,38,0.15)" : "none",
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

      <p style={{ fontSize: 14, color: "#6B7280" }}>
        {isListening ? "Listening... tap to stop" : "Tap to describe your symptoms"}
      </p>

      {error && (
        <div style={{
          width: "100%", padding: "10px 14px", borderRadius: 8,
          background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B",
          fontSize: 13, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Live transcript box */}
      <div style={{
        width: "100%", borderRadius: 8, border: "2px solid",
        borderColor: isListening ? "#2563EB" : "#E5E7EB",
        padding: 16, transition: "all 0.2s",
        minHeight: fullDisplay ? 120 : 80,
      }}>
        {fullDisplay ? (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#1F2937", margin: 0 }}>
            {transcript}
            <span style={{ color: "#9CA3AF" }}>{interim}</span>
            {isListening && <span style={{ color: "#2563EB", animation: "blink 1s step-end infinite", fontWeight: 300 }}>|</span>}
          </p>
        ) : (
          <p style={{ fontSize: 14, color: "#D1D5DB", margin: 0 }}>
            {isListening ? "Start speaking..." : "Your symptoms will appear here as you speak"}
          </p>
        )}
      </div>

      {/* Text fallback */}
      {!isListening && !fullDisplay && (
        <>
          <p style={{ fontSize: 12, color: "#D1D5DB", textTransform: "uppercase", letterSpacing: "0.08em" }}>or type manually</p>
          <textarea
            style={s.textArea}
            placeholder="e.g., I have a headache and mild fever since yesterday..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
          />
        </>
      )}

      {/* Submit button */}
      {(fullDisplay || transcript.trim()) && !isListening && (
        <button style={s.submitBtn} onClick={handleSubmit}>Analyze symptoms</button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TriageResultCard — shows AI analysis result
   ───────────────────────────────────────────── */
function TriageResultCard({ result }) {
  const colors = RISK_COLORS[result.risk_level] || RISK_COLORS.LOW;
  return (
    <div style={{ ...s.card, borderLeft: `4px solid ${colors.border}`, background: colors.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ ...s.badge, background: colors.badge, fontSize: 14, padding: "6px 14px" }}>
          {result.risk_level}
        </span>
        {result.is_emergency && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: "#DC2626", padding: "4px 10px",
            borderRadius: 20, border: "1px solid #FECACA", background: "#FEF2F2",
          }}>Emergency detected</span>
        )}
      </div>

      <p style={s.label}>Symptoms identified</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {result.symptoms?.map((sym, i) => (
          <span key={i} style={{
            fontSize: 12, padding: "4px 10px", borderRadius: 20,
            border: `1px solid ${colors.border}`, color: colors.text, background: "white",
          }}>{sym}</span>
        ))}
      </div>

      <p style={s.label}>Medical summary</p>
      <p style={s.detail}>{result.medical_summary}</p>

      <p style={{ ...s.label, marginTop: 12 }}>Recommended action</p>
      <p style={{ ...s.detail, fontWeight: 500 }}>{result.recommended_action}</p>

      {result.emergency_flags?.length > 0 && (
        <div style={{
          marginTop: 14, padding: 12, borderRadius: 6,
          background: "#7F1D1D", color: "#FECACA", fontSize: 13,
        }}>
          <span style={{ fontWeight: 600 }}>Emergency flags:</span> {result.emergency_flags.join(", ")}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dashboard — doctor's patient queue
   ───────────────────────────────────────────── */
function Dashboard({ patients, onBack }) {
  const [expanded, setExpanded] = useState(null);
  const sorted = [...patients].sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
    return (order[a.risk_level] ?? 4) - (order[b.risk_level] ?? 4);
  });

  return (
    <div>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, background: "none",
        border: "none", color: "#6B7280", cursor: "pointer", fontSize: 13, marginBottom: 16, padding: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Patient view
      </button>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Patient queue</h2>
      <p style={{ fontSize: 13, color: "#9CA3AF", margin: "0 0 24px" }}>
        {patients.length} patient{patients.length !== 1 ? "s" : ""} assessed
      </p>

      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p style={{ color: "#9CA3AF", marginTop: 12 }}>No patients yet. Submit symptoms from the patient view.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((p, i) => {
            const colors = RISK_COLORS[p.risk_level] || RISK_COLORS.LOW;
            const open = expanded === i;
            return (
              <div
                key={i}
                onClick={() => setExpanded(open ? null : i)}
                style={{
                  padding: 16, borderRadius: 8,
                  borderLeft: `4px solid ${colors.border}`,
                  border: `1px solid ${open ? colors.border : "#F3F4F6"}`,
                  background: open ? colors.bg : "white",
                  cursor: "pointer", transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ ...s.badge, background: colors.badge }}>{p.risk_level}</span>
                  <span style={{ flex: 1, fontSize: 14, color: "#374151", fontWeight: 500 }}>
                    {p.symptoms?.join(", ")}
                  </span>
                  <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>{p.time}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
                {open && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                    <p style={s.label}>Medical summary</p>
                    <p style={s.detail}>{p.medical_summary}</p>
                    <p style={{ ...s.label, marginTop: 12 }}>Recommended action</p>
                    <p style={s.detail}>{p.recommended_action}</p>
                    {p.emergency_flags?.length > 0 && (
                      <div style={{
                        marginTop: 14, padding: 12, borderRadius: 6,
                        background: "#7F1D1D", color: "#FECACA", fontSize: 13,
                      }}>
                        <span style={{ fontWeight: 600 }}>Emergency flags:</span> {p.emergency_flags.join(", ")}
                      </div>
                    )}
                    <p style={{ ...s.label, marginTop: 12 }}>Original transcript</p>
                    <p style={{ ...s.detail, fontStyle: "italic", color: "#6B7280" }}>"{p.transcript}"</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Emergency Alert Banner (slides down from top)
   ───────────────────────────────────────────── */
function EmergencyAlert({ patient }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, padding: "14px 20px",
      background: "#DC2626", color: "white", zIndex: 1000,
      animation: "slideDown 0.3s ease-out",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 680, margin: "0 auto" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontWeight: 700, fontSize: 15 }}>CRITICAL PATIENT INCOMING</span>
        <span style={{ fontSize: 13, opacity: 0.9, marginLeft: "auto" }}>{patient.symptoms?.join(", ")}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main App — routes between patient & doctor
   ───────────────────────────────────────────── */
export default function App() {
  const [view, setView] = useState("patient");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [alert, setAlert] = useState(null);

  const handleTranscript = async (transcript) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://localhost:8000/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      const patient = { ...data, transcript, time: new Date().toLocaleTimeString() };
      setResult(patient);
      setPatients((prev) => [...prev, patient]);

      if (data.is_emergency) {
        setAlert(patient);
        setTimeout(() => setAlert(null), 6000);
      }
    } catch (err) {
      console.error(err);
      setResult({ error: "Could not reach the backend. Is it running on localhost:8000?" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 680, margin: "0 auto", padding: "32px 16px 64px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: "#1F2937",
    }}>
      {alert && <EmergencyAlert patient={alert} />}

      {view === "doctor" ? (
        <Dashboard patients={patients} onBack={() => setView("patient")} />
      ) : (
        <>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
                Sanjeevani
              </h1>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "4px 0 0" }}>AI-powered healthcare triage</p>
            </div>
            <button
              onClick={() => setView("doctor")}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                border: "1px solid #E5E7EB", borderRadius: 8, background: "white",
                cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151", position: "relative",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Doctor dashboard
              {patients.filter(p => p.risk_level === "CRITICAL").length > 0 && (
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#DC2626",
                  position: "absolute", top: -3, right: -3,
                }} />
              )}
            </button>
          </div>

          {/* Voice input card */}
          <div style={s.card}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 16 }}>
              Describe your symptoms
            </p>
            <VoiceInput onTranscriptReady={handleTranscript} />
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ ...s.card, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 20, height: 20, border: "2.5px solid #E5E7EB", borderTopColor: "#2563EB",
                borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0,
              }} />
              <p style={{ color: "#6B7280", fontSize: 14, margin: 0 }}>Analyzing symptoms with AI...</p>
            </div>
          )}

          {/* Result */}
          {result && !result.error && <TriageResultCard result={result} />}

          {/* Error */}
          {result?.error && (
            <div style={{ ...s.card, borderLeft: "4px solid #DC2626", background: "#FEF2F2" }}>
              <p style={{ color: "#991B1B", fontWeight: 500, margin: 0 }}>{result.error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Shared style fragments ─── */
const s = {
  card: {
    background: "white", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #F3F4F6",
  },
  badge: {
    color: "white", fontSize: 11, fontWeight: 700, padding: "4px 10px",
    borderRadius: 4, letterSpacing: "0.04em", flexShrink: 0,
  },
  label: {
    fontSize: 11, fontWeight: 600, color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
  },
  detail: {
    fontSize: 14, lineHeight: 1.6, color: "#374151", margin: 0,
  },
  textArea: {
    width: "100%", padding: 12, borderRadius: 8, border: "1px solid #E5E7EB",
    fontSize: 14, fontFamily: "inherit", resize: "vertical", outline: "none",
  },
  submitBtn: {
    width: "100%", padding: 14, borderRadius: 8, border: "none",
    background: "#059669", color: "white", fontSize: 15, fontWeight: 600,
    cursor: "pointer", transition: "background 0.2s",
  },
};

/* ─── Inject keyframe animations ─── */
if (typeof document !== "undefined") {
  const el = document.createElement("style");
  el.textContent = `
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes spin { to{transform:rotate(360deg)} }
    @keyframes slideDown { from{transform:translateY(-100%)} to{transform:translateY(0)} }
    button:hover { filter: brightness(0.95); }
    textarea:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  `;
  document.head.appendChild(el);
}
