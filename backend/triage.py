import json
import os

REQUIRED_FIELDS = ["symptoms", "risk_level", "is_emergency", "emergency_flags", "recommended_action", "medical_summary"]

CRITICAL_KEYWORDS = {
    "chest pain": ["chest pain", "chest pressure", "heart attack", "myocardial"],
    "breathing": ["difficulty breathing", "shortness of breath", "choking", "can't breathe"],
    "stroke": ["facial drooping", "arm weakness", "slurred speech", "stroke"],
    "unconscious": ["loss of consciousness", "fainting", "passed out", "unconscious"],
    "bleeding": ["severe bleeding", "major trauma", "bleeding heavily"],
    "allergic": ["severe allergic", "anaphylaxis"],
    "head injury": ["severe head injury", "sudden severe headache"],
}

HIGH_KEYWORDS = {
    "severe pain": ["severe pain", "excruciating"],
    "vomiting": ["vomiting blood", "vomiting", "nausea"],
    "fever": ["high fever", "fever"],
    "injury": ["injury", "accident", "fall"],
}

MODERATE_KEYWORDS = {
    "pain": ["pain", "ache", "hurt"],
    "cough": ["cough", "cold"],
    "headache": ["headache"],
}


def demo_triage(transcript: str) -> dict:
    """Hardcoded triage logic for demo/testing without API keys."""
    text_lower = transcript.lower()

    # Check for CRITICAL keywords
    emergency_flags = []
    for category, keywords in CRITICAL_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            emergency_flags.append(category.upper())

    if emergency_flags:
        return {
            "symptoms": emergency_flags,
            "risk_level": "CRITICAL",
            "is_emergency": True,
            "emergency_flags": emergency_flags,
            "recommended_action": "Call 911 immediately. Ensure airway patency.",
            "medical_summary": f"CRITICAL: Patient reports {', '.join(emergency_flags).lower()}. Requires immediate emergency intervention.",
        }

    # Check for HIGH keywords
    symptoms = []
    for category, keywords in HIGH_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            symptoms.append(category)

    if symptoms:
        return {
            "symptoms": symptoms,
            "risk_level": "HIGH",
            "is_emergency": False,
            "emergency_flags": [],
            "recommended_action": "Schedule urgent specialist appointment within 24 hours.",
            "medical_summary": f"HIGH: Patient presents with {', '.join(symptoms).lower()}. Requires prompt medical evaluation.",
        }

    # Check for MODERATE keywords
    symptoms = []
    for category, keywords in MODERATE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            symptoms.append(category)

    if symptoms:
        return {
            "symptoms": symptoms or ["general malaise"],
            "risk_level": "MODERATE",
            "is_emergency": False,
            "emergency_flags": [],
            "recommended_action": "Follow up with primary care physician.",
            "medical_summary": f"MODERATE: Patient reports {', '.join(symptoms).lower() if symptoms else 'general symptoms'}. Recommend primary care evaluation.",
        }

    # Default to LOW
    return {
        "symptoms": ["general inquiry"],
        "risk_level": "LOW",
        "is_emergency": False,
        "emergency_flags": [],
        "recommended_action": "Monitor symptoms. Seek care if symptoms worsen.",
        "medical_summary": "LOW: Patient describes non-acute symptoms. Monitor and follow up as needed.",
    }


async def analyze_transcript(transcript: str) -> dict:
    """Analyze transcript using Gemini API if key available, otherwise use demo mode."""
    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        print("[demo] GOOGLE_API_KEY not set. Using DEMO MODE (hardcoded keywords).")
        return demo_triage(transcript)

    # Use Gemini API
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')

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

        response = model.generate_content(triage_prompt)
        response_text = response.text.strip()

        # Strip markdown fences if present
        for prefix in ("```json", "```"):
            if response_text.startswith(prefix):
                response_text = response_text[len(prefix):]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        result = json.loads(response_text)
        for field in REQUIRED_FIELDS:
            result.setdefault(field, None)
        return result

    except Exception as e:
        print(f"API error: {e}. Falling back to DEMO MODE.")
        return demo_triage(transcript)
