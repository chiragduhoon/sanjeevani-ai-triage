# Sanjeevani Phase 2 — Backend (FastAPI + Claude)

## Setup (5 minutes)

### 1. Create backend folder
```bash
mkdir sanjeevani-backend
cd sanjeevani-backend
```

### 2. Copy the files
- `backend_main.py` — the FastAPI app
- `requirements.txt` — dependencies

### 3. Install and run
```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY="your-anthropic-api-key"
python backend_main.py
```

Backend runs on `http://localhost:8000`

## What this backend does

**POST `/triage`** — Takes `{"transcript": "..."}` and returns:
```json
{
  "symptoms": ["chest pain", "shortness of breath"],
  "risk_level": "CRITICAL",
  "is_emergency": true,
  "emergency_flags": ["Heart attack signs"],
  "recommended_action": "Call 911 immediately",
  "medical_summary": "Patient reports acute chest pain with dyspnea..."
}
```

**WebSocket `/ws/doctor`** — Doctor dashboard connects here and receives real-time alerts when CRITICAL cases are detected

**GET `/health`** — Simple health check

## How it works

1. React frontend (port 3000) calls `POST /triage` with patient transcript
2. Backend sends it to Claude with a strict triage prompt
3. Claude returns structured JSON with symptoms, risk level, and emergency flags
4. If `is_emergency=true`, backend broadcasts to all connected doctor dashboards via WebSocket
5. Doctor's browser gets real-time red alert notification

## Testing

### Test the API directly
```bash
curl -X POST http://localhost:8000/triage \
  -H "Content-Type: application/json" \
  -d '{"transcript": "I have chest pain and shortness of breath"}'
```

Expected response (2-3 seconds):
```json
{
  "symptoms": ["chest pain", "shortness of breath"],
  "risk_level": "CRITICAL",
  "is_emergency": true,
  "emergency_flags": ["Cardiac emergency"],
  "recommended_action": "Emergency intervention required",
  "medical_summary": "..."
}
```

### Test with the frontend
1. Start backend: `python backend_main.py`
2. Start frontend: `npm start` (in the React folder)
3. Describe symptoms in React app
4. Backend processes and returns result instantly
5. If CRITICAL, red alert banner slides down

## Notes

- Claude API needs a valid key in `ANTHROPIC_API_KEY`
- CORS is enabled so localhost:3000 can call localhost:8000
- WebSocket keeps connections alive for real-time alerts
- If Claude API fails, returns a fallback "manual assessment required" response
