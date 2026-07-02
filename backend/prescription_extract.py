import base64
import json
import os
import re

# Vision-LLM extraction of structured data from a prescription photo. Mirrors the
# provider chain in triage.py (Groq first, OpenRouter free models as backup) but
# deliberately has NO keyword/demo fallback — inventing prescription data would be
# unsafe, so on failure we return a structured error and the frontend falls back
# to manual entry.

EXTRACT_PROMPT = """You are a medical prescription transcription AI. Look at this photo of a medical prescription and respond with ONLY valid JSON (no markdown, no preamble, no extra text).

Return this exact JSON structure:
{
  "medicines": [
    {
      "medicine_name": "name as written (correct obvious misspellings of known drugs)",
      "dosage": "e.g. 500mg — empty string if not visible",
      "frequency": "e.g. Twice daily or 1-0-1 — empty string if not visible",
      "duration": "e.g. 7 days — empty string if not visible",
      "instructions": "e.g. after food — empty string if not visible"
    }
  ],
  "doctor_name": "prescribing doctor's name or empty string",
  "prescription_date": "date written on the prescription (e.g. 12 Mar 2026) or empty string",
  "diagnosis": "diagnosis or clinical notes written on the prescription or empty string",
  "confidence": "high" | "medium" | "low"
}

Rules:
- Transcribe ONLY what is visible in the image — NEVER invent or guess medicines that are not written.
- If handwriting is illegible for a field, use an empty string for that field.
- If the image is not a medical prescription at all, return {"medicines": [], "doctor_name": "", "prescription_date": "", "diagnosis": "", "confidence": "low"}.
- Text may be in English or Hindi; output field values in the language written, but JSON keys exactly as above.
- Set confidence to "low" if the handwriting is hard to read, "high" only for clear printed prescriptions.

Only return the JSON object, nothing else."""

VALID_CONFIDENCE = {"high", "medium", "low"}

MEDICINE_FIELDS = ["medicine_name", "dosage", "frequency", "duration", "instructions"]


def _image_to_data_url(content: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(content).decode()}"


def _vision_messages(data_url: str) -> list:
    return [{
        "role": "user",
        "content": [
            {"type": "text", "text": EXTRACT_PROMPT},
            {"type": "image_url", "image_url": {"url": data_url}},
        ],
    }]


def _call_groq_vision(data_url: str, api_key: str) -> str:
    """Call a Groq vision model and return the raw reply text."""
    from groq import Groq
    client = Groq(api_key=api_key, timeout=30.0)
    response = client.chat.completions.create(
        model=os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
        messages=_vision_messages(data_url),
        temperature=0.1,
        max_tokens=1024,
    )
    return response.choices[0].message.content or ""


# Free vision-capable models on OpenRouter. Free slugs rotate; override via
# OPENROUTER_VISION_MODEL (comma-separated) if these stop responding.
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_VISION_DEFAULT_MODELS = [
    "meta-llama/llama-4-scout:free",
    "qwen/qwen2.5-vl-72b-instruct:free",
    "google/gemma-3-27b-it:free",
]


def _openrouter_vision_models() -> list:
    raw = os.getenv("OPENROUTER_VISION_MODEL", "")
    if raw.strip():
        return [m.strip() for m in raw.split(",") if m.strip()]
    return OPENROUTER_VISION_DEFAULT_MODELS


def _call_openrouter_vision(data_url: str, api_key: str) -> str:
    """Try each candidate free vision model until one returns a reply. Raises if all fail."""
    import httpx
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sanjeevani.app",
        "X-Title": "Sanjeevani Prescription Scan",
    }
    last_err = None
    for model in _openrouter_vision_models()[:2]:
        try:
            resp = httpx.post(
                OPENROUTER_URL,
                headers=headers,
                json={
                    "model": model,
                    "messages": _vision_messages(data_url),
                    "temperature": 0.1,
                    "max_tokens": 1024,
                },
                timeout=25.0,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"] or ""
            last_err = f"{model} -> {resp.status_code}"
            print(f"OpenRouter vision {last_err}; trying next model.")
        except Exception as e:
            last_err = f"{model} -> {e}"
            print(f"OpenRouter vision {last_err}; trying next model.")
    raise RuntimeError(f"All OpenRouter vision models failed ({last_err})")


def _validate_extraction(raw: dict):
    """Coerce a model response into the strict extraction schema.
    Returns None if unusable (no readable medicines)."""
    if not isinstance(raw, dict):
        return None

    medicines = []
    for med in raw.get("medicines") or []:
        if not isinstance(med, dict):
            continue
        clean = {field: str(med.get(field) or "").strip() for field in MEDICINE_FIELDS}
        if clean["medicine_name"]:
            medicines.append(clean)
    if not medicines:
        return None

    confidence = str(raw.get("confidence") or "").lower().strip()
    return {
        "medicines": medicines,
        "doctor_name": str(raw.get("doctor_name") or "").strip(),
        "prescription_date": str(raw.get("prescription_date") or "").strip(),
        "diagnosis": str(raw.get("diagnosis") or "").strip(),
        "confidence": confidence if confidence in VALID_CONFIDENCE else "low",
    }


def _parse_extraction(response_text: str):
    """Extract the first JSON object from a model reply and validate it."""
    match = re.search(r'\{.*\}', response_text or "", re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return _validate_extraction(json.loads(match.group(0)))


async def extract_prescription(image_bytes: bytes, mime_type: str) -> dict:
    """Extract structured prescription data from an image. Never raises.

    Returns {"success": True, "extracted": {...}, "provider": "groq"|"openrouter"}
    or {"success": False, "error": "no_api_key"|"extraction_failed"}."""
    data_url = _image_to_data_url(image_bytes, mime_type)

    groq_key = os.getenv("GROQ_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    providers = []
    if groq_key:
        providers.append(("groq", lambda: _call_groq_vision(data_url, groq_key)))
    if openrouter_key:
        providers.append(("openrouter", lambda: _call_openrouter_vision(data_url, openrouter_key)))

    if not providers:
        print("[rx-scan] No LLM API key set. Cannot extract; frontend falls back to manual entry.")
        return {"success": False, "error": "no_api_key"}

    for name, call in providers:
        try:
            extracted = _parse_extraction(call())
            if extracted is None:
                print(f"[rx-scan] {name} returned no readable medicines. Trying next option.")
                continue
            return {"success": True, "extracted": extracted, "provider": name}
        except Exception as e:
            print(f"[rx-scan] {name} vision error: {e}. Trying next option.")

    print("[rx-scan] All vision providers failed; frontend falls back to manual entry.")
    return {"success": False, "error": "extraction_failed"}
