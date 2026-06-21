# Sanjeevani — Project Status & Reference

A healthcare triage system with separate **Patient** and **Doctor** dashboards.
Patients describe symptoms (voice or text), an AI/keyword triage assigns a risk
level, and patients flow into a live doctor queue. Doctors review, prescribe,
add notes, manage beds, and discharge.

---

## How to run

### Backend (FastAPI, port 8000)
```bash
cd backend
# IMPORTANT: force UTF-8 on Windows or prints with non-ASCII crash endpoints
PYTHONUTF8=1 PYTHONIOENCODING=utf-8 uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- Demo mode (keyword triage) runs when `GOOGLE_API_KEY` is **not** set.
- Set `GOOGLE_API_KEY` for Gemini-powered triage (`gemini-2.0-flash`).

### Frontend (Vite + React, port 5173)
```bash
cd frontend && npm install && npm run dev
```
- Patient page: `http://localhost:5173/`
- Doctor page:  `http://localhost:5173/doctor`  (login PIN: `1234`)
- ⚠️ Use **one** Vite port for both tabs so they share backend state. (We've
  had 5173 and 5174 both running at once — pick one.)
- ⚠️ `vite.config.js` proxy changes require a **Vite restart** (no HMR for config).

---

## Architecture

- **Routing:** React Router. `/` → `PatientPage`, `/doctor` → `DoctorPage`,
  `/hospital` → `HospitalPage` (Bed Desk, staff PIN `4321`).
- **Real-time:** WebSocket `ws://localhost:8000/ws/doctor`. Backend broadcasts
  `triage_result`, `emergency_alert`, `prescription_update`, `queue_status_update`.
  On connect, the backend **replays the full queue** to the new client.
- **Persistence:**
  - Backend: disk-backed JSON in `backend/data/` (`queue.json`, `prescriptions.json`)
    — survives server restart. Loaded at startup, saved on every mutation.
  - Frontend: `localStorage` for patient history (`patientHistoryStorage.js`).
    Same-origin tabs share localStorage, so in same-browser testing the doctor
    tab can see records the patient tab saved.
- **Vite proxy** (`vite.config.js`): forwards `/triage`, `/health`, `/api`, `/ws`
  to `localhost:8000`.

---

## Key files

### Backend
| File | Role |
|------|------|
| `backend/main.py` | FastAPI app, endpoints, in-memory + disk persistence |
| `backend/triage.py` | `analyze_transcript()` — Gemini or demo keyword triage |
| `backend/websocket.py` | `ConnectionManager` + `manager` singleton (broadcast) |

### Backend endpoints
- `POST /triage` — body `{transcript, patientId, patientName}` → triage result; appends to queue, broadcasts.
- `WS /ws/doctor` — replays queue on connect, then live updates.
- `POST /api/prescriptions/{id}` — save prescription, broadcasts `prescription_update`.
- `GET /api/prescriptions/{id}` — fetch prescriptions (patient polls this).
- `PATCH /api/queue/{id}/status` — set `WAITING|IN_REVIEW|TREATED|DISCHARGED`.
- `DELETE /api/queue/{id}` — remove from queue (used by discharge).
- `GET /health` — returns `queue_count` (use to confirm NEW code is running).
- **Beds** (source of truth, disk-backed `beds.json`, broadcasts `beds_update`):
  - `GET /api/beds` — all wards with computed `available`.
  - `PUT /api/beds/{ward}` body `{total}` — create ward / set capacity.
  - `DELETE /api/beds/{ward}` — remove ward.
  - `POST /api/beds/{ward}/admit` body `{patient}` — admit to next free bed.
  - `POST /api/beds/{ward}/discharge` body `{bed}` — free a bed.

### Frontend (`frontend/src/`)
| File | Role |
|------|------|
| `PatientPage.jsx` | Name input, voice/text symptoms, triage result, queue position, tabs (Assessment/Guidance/Appointments/Bed/Instructions/Prescriptions), returning-patient lookup. Polls `/api/prescriptions/{id}` every 5s + WS. |
| `DoctorPage.jsx` | Login gate (sessionStorage), WS consumer, tabs (Queue/History/Bed/Prescriptions/Notes), `selectPatient()` normalizer, `handleDischarge()`, `handleClearQueue()`. |
| `VoiceInput.jsx` | Web Speech API; editable transcript + "Clear & Redo". |
| `PatientDetailPanel.jsx` | Right sidebar: name, ID, risk, status selector, prescriptions, Prescribe/Notes quick actions, Discharge button. |
| `PrescriptionCreator.jsx` | Doctor form: medicine/dosage/frequency/duration/instructions. |
| `PrescriptionsList.jsx` | Patient-facing prescription display (shows date). |
| `CriticalAlert.jsx` | Flashing top banner + pulsing modal + 3-beep alarm for CRITICAL. |
| `PatientHistory.jsx` | Doctor history browser: search by name/ID/symptoms, risk filter, status (incl. "✓ Discharged"). |
| `patientHistoryStorage.js` | localStorage CRUD + name-based ID generation. |
| `HospitalPage.jsx` | **Bed Desk** (`/hospital`, PIN 4321): create/delete wards, set capacity, admit/discharge patients per bed. Source of truth for beds. |
| `BedAvailability.jsx` | Patient view — **live** read-only bed availability (`GET /api/beds` + `beds_update` WS). |
| `BedManagement.jsx` | Doctor view — **live** read-only ward status + admitted patients; links to Bed Desk. |

---

## Patient ID system
- Format: `NAME-NNN` (uppercase, non-alphanumerics stripped), e.g.
  `CHIRAG-001`, `CHIRAGDUHOON-001`. No name → `PATIENT-001`.
- Counter per name kept in `localStorage` key `sanjeevani_patient_id_counters`.
- ID is generated **client-side before** the `/triage` POST and sent to the
  backend so the same ID flows patient → backend → doctor.
- ⚠️ Prescriptions are keyed by ID. If doctor and patient IDs don't match,
  prescriptions won't show. Legacy queue entries without IDs get a fresh ID
  assigned at selection time (won't match the patient's own ID) — **Clear Queue
  and submit fresh patients** to avoid mismatch.

---

## Major bugs fixed (chronological)

1. **Prescribe did nothing** — `patientId` was generated *after* the API call and
   never sent to backend. Fixed: generate before, send in `/triage`, broadcast to doctor.
2. **Voice input not editable** — transcript was read-only. Fixed: editable
   textarea after recording + "Clear & Redo".
3. **Long ugly IDs** (`PAT-1781...`) → name-based `NAME-NNN`.
4. **Queue disappeared on refresh** — was frontend-only RAM. Fixed: backend
   in-memory queue + disk persistence + replay on WS connect; doctor login
   persisted in `sessionStorage`; WS handler keeps full message (was stripping
   `patientId`/`patientName`/`queueStatus`).
5. **`/api` calls 404 through Vite** — proxy only had `/triage`,`/health`,`/ws`.
   Fixed: added `/api`.
6. **"Select a patient" despite selection** — Prescriptions/Notes tabs gated on
   `selectedPatient?.patientId`; selected patient lacked an ID. Fixed: gate on
   `selectedPatient`, and `selectPatient()` guarantees an ID. (NOT a state-sharing
   problem — state already lives in DoctorPage and persists across tabs.)
7. **History stuck on "Awaiting review" after discharge** — discharge didn't flag
   the record. Fixed: `updatePatientDetails(id,{queueStatus:'DISCHARGED',reviewed:true})`
   + PatientHistory shows "✓ Discharged".
8. **Prescription never reached patient** — relied only on WS. Fixed: patient
   **polls** `/api/prescriptions/{id}` every 5s (+ immediate fetch) as a fallback.
9. **"Could not reach backend"** — `triage.py` had an emoji in a `print()` that
   crashed `/triage` with `UnicodeEncodeError` on Windows cp1252 stdout. Fixed:
   ASCII-only print + launch with `PYTHONUTF8=1 PYTHONIOENCODING=utf-8`.

### Recurring operational gotcha
Several "still broken" reports were because **the backend wasn't actually
restarted** — old code (no `/api` routes) kept running, sometimes as orphaned
worker processes bound to port 8000 via socket reuse. **Confirm new code is live
with `curl /health` and check for `queue_count` in the response.** If endpoints
404, kill ALL python procs on 8000 (including orphaned `multiprocessing-fork`
workers) and relaunch.

---

## Indian emergency numbers (AmbulanceButton.jsx)
- Primary: **108** (ambulance, `tel:108`). Also shown: **112** (national
  emergency), **102** (govt. ambulance).

---

## Feature inventory
- **Patient:** voice/text symptoms, AI triage + risk, queue position, immediate
  guidance, ambulance (108/112), appointment booking (mock), bed availability
  (mock), doctor instructions, prescriptions (live), returning-patient history lookup.
- **Doctor:** login (PIN 1234), live queue (risk-sorted), critical alerts,
  patient detail panel, queue status, prescriptions, clinical notes, bed
  management, patient history (search/filter), discharge.

---

## Known limitations / not yet done
- Appointments & bed availability on patient side are **mock data**.
- No prescription-delete endpoint (only add/get).
- Patient history is per-browser `localStorage` (not a shared DB) — cross-device
  history only works for data the backend holds (queue, prescriptions).
- Demo triage is keyword-based unless `GOOGLE_API_KEY` is set.
