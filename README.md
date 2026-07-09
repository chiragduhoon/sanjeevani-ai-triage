# Sanjeevani — AI Healthcare Triage

Emergency departments in India routinely triage patients at the front desk using verbal intake with no structured risk scoring. The result is that critical patients can wait behind lower-priority cases, and doctors receive no alert until the patient reaches them. Sanjeevani is a prototype that replaces that verbal intake step with a structured AI triage loop: patients describe symptoms by voice or text, the system classifies risk, queues the patient, and pushes real-time alerts to a doctor dashboard — with critical cases surfaced to the top.

Beyond triage, patients can photograph a paper prescription and have a vision LLM extract the medicines into structured records — and for any saved or previous prescription, ask the AI what illness it was likely treating and what each medicine helped with, explained in plain Hindi or English.

---

## Screenshots

**Patient intake — Hindi UI with voice/text symptom input**

![Patient intake](docs/patient-intake.png)

**Symptom analysis in progress — transcript editable before submission**

![Analysis in progress](docs/patient-analyzing.png)

**Triage result — risk classification and AI clinical summary**

![Triage result](docs/patient-result.png)

**Doctor dashboard — live queue with patient detail panel, AI care advice in Hindi**

![Doctor dashboard](docs/doctor-queue.png)

**Doctor–patient follow-up Q&A over WebSocket**

![Follow-up Q&A](docs/patient-followup.png)

**Hospital Bed Desk — live ward management**

![Bed desk](docs/bed-desk.png)

---

## Architecture

```
Patient (browser)
    |
    | POST /triage  (REST)
    v
FastAPI (backend/main.py)
    |-- triage.py                 LLM provider chain + keyword fallback
    |-- prescription_extract.py   Vision-LLM prescription photo -> structured medicines
    |-- prescription_insights.py  Past prescription -> likely illness + what each medicine helped with
    |-- websocket.py              ConnectionManager (broadcast + queue replay)
    |-- data/                     JSON persistence (queue, prescriptions, notes, followups)
    |
    | WebSocket /ws/doctor
    v
Doctor Dashboard (browser)
```

**Triage flow.** `POST /triage` accepts a free-text transcript. `analyze_transcript()` in `triage.py` tries providers in order: Groq (llama-3.3-70b) → OpenRouter (free model pool) → keyword-based fallback. The keyword fallback is not a last resort that silently degrades; it runs a negation-aware substring scan with Hindi/Hinglish/Devanagari patterns and is accurate enough to be the primary path in no-key environments. A safety net always runs: if the keyword detector flags an emergency the LLM missed, the result is escalated to CRITICAL. The response is appended to the in-memory queue, written to disk, and broadcast to all connected doctor clients over WebSocket.

**Prescription scan + insights.** Patients can photograph a paper prescription; `POST /api/prescriptions/extract` sends it to a vision LLM (`prescription_extract.py`) which returns structured medicines the patient reviews and saves — there is deliberately no keyword fallback here, since inventing prescription data would be unsafe. On top of any saved or previous prescription, `POST /api/prescriptions/{patient_id}/explain` (`prescription_insights.py`) asks a text LLM to explain in plain Hindi or English what illness the prescription was most likely treating and what each medicine helped with. Explanations are grounded: medicines the model invents are dropped, medicines it skips get an entry from a built-in knowledge base of common Indian medicines, and that same knowledge base serves as the full offline fallback when no API key is set — unknown drugs are honestly labeled "ask your doctor" rather than guessed.

**WebSocket queue replay.** When a doctor client connects to `/ws/doctor`, the server immediately streams the full current queue before the client enters the live event loop. This means a doctor who refreshes their tab or opens a second monitor gets a consistent view of all patients queued since server start, not just patients who arrived after their connection. The implementation is in `main.py` lines 152–157.

**Dual persistence.** The patient queue, prescriptions, notes, and follow-ups live in two places simultaneously: an in-memory Python list (for zero-latency reads and broadcasts) and flat JSON files under `backend/data/` (for restart survival). `_load()` and `_save()` are intentionally thin — no ORM, no migrations. The tradeoff is that concurrent writes are not safe, which is acceptable for a single-process prototype but would require a proper store (Postgres, Redis) under any real load.

**Vite proxy.** In development, Vite proxies `/triage`, `/api`, `/uploads`, and `/ws` to `localhost:8000`. The frontend therefore makes no cross-origin requests and the WebSocket upgrade is handled transparently. In production the FastAPI process serves the built frontend from `backend/static/` via `StaticFiles`, so there is a single origin and no proxy is needed.

---

## Technical Decisions

### WebSocket queue replay on connect

The doctor dashboard needs to show patients who were triaged before the doctor opened their browser. Two options:

1. **REST poll on load, then subscribe for updates.** The client fetches `/api/queue` to seed the list, then connects to WebSocket for live events. This is simple and the typical pattern for read-heavy UIs.

2. **Replay the queue over the WebSocket on connect.** When the doctor connects, the server replays the full queue through the same WebSocket channel before entering the live event loop. The client only has one data path to implement.

This project uses option 2. The reason is that the frontend already normalizes every incoming WebSocket frame into the queue state — emergency alerts, status updates, prescriptions, follow-ups — so adding a second REST-based seed path would require duplicating that normalization in two places. Funneling everything through one channel keeps the client code simpler.

The tradeoff is scale: replaying the full queue on every connect is O(n) in queue size. For a queue that grows without bound and a doctor dashboard that reconnects frequently (mobile network, tab hibernation), this degrades. The right fix at that point is pagination — either a `GET /api/queue?after=<cursor>` REST endpoint that seeds the client, or sending only the delta since a client-supplied cursor at connect time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Web Speech API |
| Backend | FastAPI, Python 3.11+ |
| LLM (primary) | Groq — llama-3.3-70b-versatile |
| LLM (fallback) | OpenRouter free model pool |
| LLM (vision, prescription scan) | Groq — llama-4-scout; OpenRouter vision pool as backup |
| Triage fallback | Keyword matching (English, Hindi, Hinglish, Devanagari) |
| Prescription-insights fallback | Built-in knowledge base of common Indian medicines |
| Persistence | In-memory + JSON files |
| Real-time | WebSocket (FastAPI native) |

---

## Known Limitations

**Patient history is localStorage-only.** The patient ID is generated and stored in the browser. There is no server-side patient record lookup. Clearing browser storage loses history.

**Appointments are mock.** The appointment booking UI generates a confirmation number client-side. No backend stores or validates appointment slots.

**Triage quality degrades without an API key.** Without `GROQ_API_KEY` or `OPENROUTER_API_KEY`, triage falls back to keyword matching. The keyword list covers common Hindi/Hinglish patterns and includes negation detection, but it cannot reason about symptom combinations or context the way an LLM can. Prescription scanning has no offline fallback at all (the photo form switches to manual entry), and prescription insights fall back to the built-in medicine knowledge base, which only recognizes common drugs.

**No real authentication.** The doctor dashboard and hospital bed desk have static PIN gates (client-side only, not server-enforced). Anyone who knows the PIN — or reads the source — can view the queue and write prescriptions. This is a prototype constraint, not an oversight.

**Single-process only.** The in-memory queue and `ConnectionManager` are process-local. Running multiple uvicorn workers would give each worker its own queue. A shared store (Redis pub/sub for WebSocket fan-out, Postgres for persistence) would be needed to scale horizontally.

---

## Setup

### Option 1 — Docker (one command)

```bash
git clone https://github.com/chiragduhoon/sanjeevani-ai-triage.git
cd sanjeevani-ai-triage
docker compose up              # backend at :8000, frontend at :5173
```

Optionally set `GROQ_API_KEY` and/or `OPENROUTER_API_KEY` in your shell (or a
`.env` file next to `docker-compose.yml`) to enable LLM triage, prescription
scanning and prescription insights — without a key, triage runs in keyword
demo mode, prescription scanning falls back to manual entry, and insights
come from the built-in medicine knowledge base.

### Option 2 — Run locally

```bash
git clone https://github.com/chiragduhoon/sanjeevani-ai-triage.git
cd sanjeevani-ai-triage/backend
pip install -r requirements.txt
cp .env.example .env           # optional: add a GROQ or OPENROUTER key;
                               # without one, triage falls back to keyword demo mode
python main.py                 # backend at http://localhost:8000
```

In a second terminal:

```bash
cd sanjeevani-ai-triage/frontend
npm install && npm run dev     # frontend at http://localhost:5173
```

Open `http://localhost:5173` (patient view) and `http://localhost:5173/doctor` (doctor dashboard) in separate tabs.

---

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) to get
started. The **Known Limitations** above double as a roadmap; issues labeled
[`good first issue`](https://github.com/chiragduhoon/sanjeevani-ai-triage/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
are a great entry point.

---

## License

Distributed under the MIT License — see [LICENSE](./LICENSE).

---

## Author

Chirag Duhoon — B.Tech Artificial Intelligence, Bennett University  
GitHub: [chiragduhoon](https://github.com/chiragduhoon)
