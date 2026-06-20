from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
from anthropic import Anthropic

app = FastAPI()

# Enable CORS for localhost frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Anthropic client
client = Anthropic()

# Store active WebSocket connections
doctor_connections = []


@app.post("/triage")
async def triage(request: dict):
    """
    Main triage endpoint. Takes a patient transcript and returns:
    - symptoms: list of identified symptoms
    - risk_level: LOW, MODERATE, HIGH, or CRITICAL
    - is_emergency: boolean
    - emergency_flags: list of critical conditions detected
    - recommended_action: what the doctor should do
    - medical_summary: 2-3 sentence clinical summary
    """
    transcript = request.get("transcript", "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    # Create the prompt for Claude
    triage_prompt = f"""You are a medical triage AI. Analyze this patient description and respond with ONLY valid JSON (no markdown, no preamble, no extra text).

Patient describes: "{transcript}"

Return this exact JSON structure:
{{
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "risk_level": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "is_emergency": true | false,
  "emergency_flags": ["flag1", "flag2"] | [],
  "recommended_action": "brief action (max 10 words)",
  "medical_summary": "2-3 sentence clinical assessment"
}}

CRITICAL keywords that ALWAYS mean is_emergency=true:
- Chest pain, chest pressure, heart attack
- Difficulty breathing, shortness of breath, choking
- Stroke signs: facial drooping, arm weakness, slurred speech
- Loss of consciousness, fainting
- Severe bleeding, major trauma
- Severe allergic reaction, anaphylaxis
- Severe head injury, sudden severe headache

If ANY critical keyword is present, set is_emergency to true and risk_level to CRITICAL.

Only return the JSON object, nothing else."""

    try:
        # Call Claude API
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{"role": "user", "content": triage_prompt}]
        )

        # Extract response text
        response_text = message.content[0].text.strip()

        # Clean markdown backticks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        # Parse JSON
        triage_result = json.loads(response_text)

        # Validate required fields
        required = ["symptoms", "risk_level", "is_emergency", "emergency_flags", "recommended_action", "medical_summary"]
        for field in required:
            if field not in triage_result:
                triage_result[field] = None

        # If emergency, broadcast to all connected doctors
        if triage_result.get("is_emergency"):
            alert_payload = {
                "type": "emergency_alert",
                "risk_level": triage_result["risk_level"],
                "symptoms": triage_result["symptoms"],
                "medical_summary": triage_result["medical_summary"],
                "emergency_flags": triage_result["emergency_flags"],
            }
            # Send to all connected doctors (async)
            for connection in doctor_connections:
                try:
                    await connection.send_json(alert_payload)
                except Exception as e:
                    print(f"Failed to send alert: {e}")
                    doctor_connections.remove(connection)

        return triage_result

    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        return {
            "error": "Failed to parse AI response",
            "symptoms": [],
            "risk_level": "MODERATE",
            "is_emergency": False,
            "emergency_flags": [],
            "recommended_action": "Manual assessment required",
            "medical_summary": "AI response was invalid. Doctor should assess manually.",
        }
    except Exception as e:
        print(f"Triage error: {e}")
        raise HTTPException(status_code=500, detail=f"Triage failed: {str(e)}")


@app.websocket("/ws/doctor")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for doctor dashboard.
    Doctors connect here and receive real-time emergency alerts.
    """
    await websocket.accept()
    doctor_connections.append(websocket)
    print(f"Doctor connected. Total doctors: {len(doctor_connections)}")

    try:
        while True:
            # Keep connection alive, listen for any messages (heartbeat)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in doctor_connections:
            doctor_connections.remove(websocket)
        print(f"Doctor disconnected. Total doctors: {len(doctor_connections)}")


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "backend": "sanjeevani"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
