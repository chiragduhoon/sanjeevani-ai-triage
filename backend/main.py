import json
import os
from datetime import datetime
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from triage import analyze_transcript
from websocket import manager

app = FastAPI(title="Sanjeevani Triage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Disk-backed persistence so queue + prescriptions survive a server restart
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)
QUEUE_FILE = os.path.join(DATA_DIR, "queue.json")
RX_FILE = os.path.join(DATA_DIR, "prescriptions.json")


def _load(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def _save(path, data):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Failed to persist {path}: {e}")


patient_queue = _load(QUEUE_FILE, [])      # list of all queued patient records
prescriptions_db = _load(RX_FILE, {})      # patientId -> list of prescriptions

# ---- Hospital beds ----
BEDS_FILE = os.path.join(DATA_DIR, "beds.json")
DEFAULT_BEDS = {
    "ICU":       {"total": 5,  "occupied": []},
    "EMERGENCY": {"total": 8,  "occupied": []},
    "GENERAL":   {"total": 15, "occupied": []},
    "PRIVATE":   {"total": 4,  "occupied": []},
}
# occupied entries look like {"bed": int, "patient": str, "since": str}
beds_db = _load(BEDS_FILE, DEFAULT_BEDS)


def _beds_view():
    """Bed state with computed availability for clients."""
    return {
        ward: {
            "total": data["total"],
            "occupied": data["occupied"],
            "available": max(0, data["total"] - len(data["occupied"])),
        }
        for ward, data in beds_db.items()
    }


@app.post("/triage")
async def triage(request: dict):
    transcript = request.get("transcript", "").strip()
    patient_id = request.get("patientId", None)
    patient_name = request.get("patientName", "")

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    result = await analyze_transcript(transcript)

    broadcast_data = {
        "type": "triage_result",
        "transcript": transcript,
        "time": datetime.now().strftime("%H:%M:%S"),
        "queuedAt": datetime.now().isoformat(),
        "queueStatus": "WAITING",
        "patientName": patient_name,
        **result,
    }
    if patient_id:
        broadcast_data["patientId"] = patient_id

    # Store in persistent queue
    patient_queue.append(broadcast_data)
    _save(QUEUE_FILE, patient_queue)

    # Broadcast all results to doctor tab
    await manager.broadcast_json(broadcast_data)

    # Additionally broadcast emergency alert if critical
    if result.get("is_emergency"):
        await manager.broadcast_json({
            "type": "emergency_alert",
            "risk_level": result["risk_level"],
            "symptoms": result["symptoms"],
            "medical_summary": result["medical_summary"],
            "emergency_flags": result["emergency_flags"],
            "patientId": patient_id,
            "patientName": patient_name,
        })

    return result


@app.websocket("/ws/doctor")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print(f"Doctor connected. Total: {len(manager.active_connections)}")

    # Replay existing queue to newly connected client
    for patient in patient_queue:
        try:
            await websocket.send_text(json.dumps(patient))
        except Exception:
            break

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)
        print(f"Doctor disconnected. Total: {len(manager.active_connections)}")


@app.post("/api/prescriptions/{patient_id}")
async def add_prescription(patient_id: str, request: dict):
    """Doctor adds a prescription for a patient."""
    prescription = {
        **request,
        "prescribedAt": datetime.now().isoformat(),
        "prescribedDate": datetime.now().strftime("%d %b %Y"),
        "status": "Active",
    }

    if patient_id not in prescriptions_db:
        prescriptions_db[patient_id] = []
    prescriptions_db[patient_id].append(prescription)
    _save(RX_FILE, prescriptions_db)

    # Broadcast real-time update to all connected clients (patient will filter by patientId)
    await manager.broadcast_json({
        "type": "prescription_update",
        "patientId": patient_id,
        "prescriptions": prescriptions_db[patient_id],
    })

    return {"status": "saved", "patientId": patient_id, "count": len(prescriptions_db[patient_id])}


@app.get("/api/prescriptions/{patient_id}")
async def get_prescriptions(patient_id: str):
    """Get all prescriptions for a patient."""
    return {"patientId": patient_id, "prescriptions": prescriptions_db.get(patient_id, [])}


@app.patch("/api/queue/{patient_id}/status")
async def update_queue_status(patient_id: str, request: dict):
    """Update a patient's queue status (WAITING/IN_REVIEW/TREATED/DISCHARGED)."""
    new_status = request.get("status", "WAITING")
    for patient in patient_queue:
        if patient.get("patientId") == patient_id:
            patient["queueStatus"] = new_status
            _save(QUEUE_FILE, patient_queue)
            await manager.broadcast_json({
                "type": "queue_status_update",
                "patientId": patient_id,
                "queueStatus": new_status,
            })
            return {"status": "updated", "patientId": patient_id, "queueStatus": new_status}
    raise HTTPException(status_code=404, detail="Patient not found in queue")


@app.delete("/api/queue")
async def clear_queue():
    """Clear the entire patient queue."""
    patient_queue.clear()
    _save(QUEUE_FILE, patient_queue)
    await manager.broadcast_json({"type": "queue_cleared"})
    return {"status": "cleared"}


@app.delete("/api/queue/{patient_id}")
async def remove_from_queue(patient_id: str):
    """Remove a single patient from the queue."""
    global patient_queue
    patient_queue[:] = [p for p in patient_queue if p.get("patientId") != patient_id]
    _save(QUEUE_FILE, patient_queue)
    await manager.broadcast_json({"type": "queue_remove", "patientId": patient_id})
    return {"status": "removed", "patientId": patient_id}


# ---- Hospital bed endpoints (maintained by the Bed Desk page) ----

async def _broadcast_beds():
    _save(BEDS_FILE, beds_db)
    await manager.broadcast_json({"type": "beds_update", "beds": _beds_view()})


@app.get("/api/beds")
async def get_beds():
    """Current bed state for all wards (patient + doctor views poll/subscribe)."""
    return _beds_view()


@app.put("/api/beds/{ward}")
async def set_ward(ward: str, request: dict):
    """Create a ward or update its total capacity."""
    ward = ward.upper().strip()
    if not ward:
        raise HTTPException(status_code=400, detail="Ward name required")
    total = max(0, int(request.get("total", 0)))
    if ward in beds_db:
        beds_db[ward]["total"] = total
        # Drop occupants that no longer fit if capacity was reduced
        beds_db[ward]["occupied"] = [o for o in beds_db[ward]["occupied"] if o["bed"] <= total]
    else:
        beds_db[ward] = {"total": total, "occupied": []}
    await _broadcast_beds()
    return _beds_view()


@app.delete("/api/beds/{ward}")
async def delete_ward(ward: str):
    """Remove a ward entirely."""
    beds_db.pop(ward.upper().strip(), None)
    await _broadcast_beds()
    return _beds_view()


@app.post("/api/beds/{ward}/admit")
async def admit_bed(ward: str, request: dict):
    """Admit a patient into the next free bed of a ward."""
    ward = ward.upper().strip()
    if ward not in beds_db:
        raise HTTPException(status_code=404, detail="Ward not found")
    data = beds_db[ward]
    if len(data["occupied"]) >= data["total"]:
        raise HTTPException(status_code=400, detail="No beds available in this ward")
    used = {o["bed"] for o in data["occupied"]}
    bed_no = next(i for i in range(1, data["total"] + 1) if i not in used)
    data["occupied"].append({
        "bed": bed_no,
        "patient": (request.get("patient") or "Unknown").strip(),
        "since": datetime.now().strftime("%d %b %Y %H:%M"),
    })
    await _broadcast_beds()
    return _beds_view()


@app.post("/api/beds/{ward}/discharge")
async def discharge_bed(ward: str, request: dict):
    """Free a specific bed in a ward."""
    ward = ward.upper().strip()
    if ward not in beds_db:
        raise HTTPException(status_code=404, detail="Ward not found")
    bed_no = int(request.get("bed"))
    beds_db[ward]["occupied"] = [o for o in beds_db[ward]["occupied"] if o["bed"] != bed_no]
    await _broadcast_beds()
    return _beds_view()


@app.get("/health")
async def health():
    return {"status": "ok", "backend": "sanjeevani", "queue_count": len(patient_queue)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

