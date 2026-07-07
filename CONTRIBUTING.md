# Contributing to Sanjeevani

Thanks for your interest in improving Sanjeevani! This is a prototype AI
healthcare triage system, and contributions of all sizes are welcome — bug
reports, documentation fixes, translations, and features.

## Getting set up

Follow the [Setup section of the README](README.md#setup). The short version:

```bash
git clone https://github.com/chiragduhoon/sanjeevani-ai-triage.git
cd sanjeevani-ai-triage/backend
pip install -r requirements.txt
python main.py            # backend at http://localhost:8000
```

```bash
cd sanjeevani-ai-triage/frontend
npm install && npm run dev   # frontend at http://localhost:5173
```

No API key is required to develop — without one, triage runs in keyword demo
mode. Add an `OPENROUTER_API_KEY` or `GROQ_API_KEY` (see
`backend/.env.example`) to exercise the LLM path.

## What to work on

- Check the [open issues](https://github.com/chiragduhoon/sanjeevani-ai-triage/issues),
  especially anything labeled `good first issue`.
- The **Known Limitations** section of the README doubles as a roadmap:
  server-side patient records, real appointment booking, server-enforced
  authentication, and horizontal scaling (Redis pub/sub + Postgres) are all
  open areas.
- For anything larger than a small fix, please open an issue first so we can
  discuss the approach before you invest time.

## Pull requests

- Branch from `main` and keep each PR focused on one change.
- Describe **what** changed and **why**; include screenshots for UI changes.
- Never commit API keys or secrets — `backend/.env` is gitignored for a reason.

## Code notes

- **Backend** is FastAPI with intentionally thin persistence (in-memory list +
  flat JSON files, no ORM). Don't introduce a database without discussing it
  in an issue first — it's a deliberate prototype constraint.
- **Triage logic** lives in `backend/triage.py`. The keyword fallback must
  stay negation-aware and keep its Hindi/Hinglish/Devanagari coverage; the
  safety net (keyword-detected emergencies escalate LLM results to CRITICAL)
  must never be weakened.
- **Frontend** is React + Vite. All WebSocket frames are normalized into queue
  state in one place — keep it that way rather than adding parallel data paths.
