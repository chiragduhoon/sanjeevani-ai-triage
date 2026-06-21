import json
import os
import re

REQUIRED_FIELDS = ["symptoms", "risk_level", "is_emergency", "emergency_flags", "recommended_action", "medical_summary"]

CRITICAL_KEYWORDS = {
    "chest pain": [
        "chest pain", "chest pressure", "heart attack", "myocardial",
        # Hindi (Devanagari)
        "सीने में दर्द", "छाती में दर्द", "दिल का दौरा", "हार्ट अटैक", "दिल में दर्द",
        # Hinglish — cardiac: many spelling variants users actually type/speak
        "seene mein dard", "chhaati mein dard", "seene mein takleef",
        "dil ka daura", "dil ka doora", "dil ka dawra", "dil ka dora",
        "dil mein dard", "dil mein takleef", "dil mein dardh",
        "dil ka attak", "dil ka attack", "heart ka attack",
        "seene mein jalan", "sine mein dard", "sine mein takleef",
    ],
    "breathing": [
        "difficulty breathing", "shortness of breath", "choking", "can't breathe",
        # Hindi
        "सांस लेने में दिक्कत", "सांस नहीं आ रही", "सांस लेने में तकलीफ",
        # Hinglish
        "saans lene mein dikkat", "saans nahi aa rahi", "saans lene mein taklif",
        "saas lene mein dikkat", "saas nahi aa rahi",
        "sans nahi aa rahi", "sans lene mein dikkat",
    ],
    "stroke": [
        "facial drooping", "arm weakness", "slurred speech", "stroke",
        # Hindi
        "लकवा", "मुंह टेढ़ा", "बोलने में दिक्कत",
        # Hinglish
        "lakwa", "muh tedha", "bolne mein dikkat",
    ],
    "unconscious": [
        "loss of consciousness", "fainting", "passed out", "unconscious",
        # Hindi
        "बेहोश", "होश नहीं", "चक्कर आकर गिर",
        # Hinglish
        "behosh", "hosh nahi", "chakkar aakar gira",
    ],
    "bleeding": [
        "severe bleeding", "major trauma", "bleeding heavily",
        # Hindi
        "बहुत खून बह", "गंभीर चोट",
        # Hinglish
        "bahut khoon bah", "gambhir chot",
    ],
    "allergic": [
        "severe allergic", "anaphylaxis",
        # Hindi
        "गंभीर एलर्जी",
        # Hinglish
        "gambhir allergy",
    ],
    "head injury": [
        "severe head injury", "sudden severe headache",
        # Hindi
        "सिर में गंभीर चोट", "अचानक तेज सिरदर्द",
        # Hinglish
        "sir mein gambhir chot", "achanak tez sir dard",
    ],
}

HIGH_KEYWORDS = {
    "severe pain": [
        "severe pain", "excruciating",
        # Hindi / Hinglish
        "बहुत तेज दर्द", "असहनीय दर्द", "bahut tez dard", "asahneey dard",
    ],
    "vomiting": [
        "vomiting blood", "vomiting", "nausea",
        # Hindi
        "उल्टी", "खून की उल्टी", "जी मिचला",
        # Hinglish
        "ulti", "khoon ki ulti", "ji michla",
    ],
    "fever": [
        "high fever", "fever",
        # Hindi
        "तेज बुखार", "बुखार",
        # Hinglish
        "tez bukhar", "bukhar",
    ],
    "injury": [
        "injury", "accident", "fall",
        # Hindi
        "चोट", "दुर्घटना", "गिर गया",
        # Hinglish
        "chot", "durghatna", "gir gaya",
    ],
}

MODERATE_KEYWORDS = {
    "pain": [
        "pain", "ache", "hurt",
        # Hindi
        "दर्द", "पीड़ा",
        # Hinglish
        "dard", "peeda", "takleef",
    ],
    "cough": [
        "cough", "cold",
        # Hindi
        "खांसी", "जुकाम",
        # Hinglish
        "khansi", "zukam",
    ],
    "headache": [
        "headache",
        # Hindi
        "सिरदर्द", "सिर में दर्द",
        # Hinglish
        "sir dard", "sar dard",
    ],
}


def detect_language(text: str) -> str:
    """Detect if text is Hindi/Hinglish or English."""
    # Devanagari Unicode block: U+0900–U+097F
    devanagari_chars = sum(1 for c in text if 'ऀ' <= c <= 'ॿ')
    if devanagari_chars > 2:
        return 'hi'
    # Common Hindi words written in Roman script (Hinglish)
    hinglish_re = re.compile(
        r'\b(mujhe|meri|mera|mere|hai|hain|ho raha|hua|raha|rahi|nahi|kuch|bahut|thoda|'
        r'zyada|dard|bukhar|ulti|chakkar|sans|saans|saas|pet|sar|sir|ankh|kaan|naak|gala|'
        r'taklif|takleef|dikkat|seene|chhaati|badan|haath|pair|bukhaar|peeda|chot|'
        r'abhi|accha|theek|bilkul|bahut|zyada|bahot)\b',
        re.IGNORECASE,
    )
    if hinglish_re.search(text):
        return 'hi'
    return 'en'


HINGLISH_CARDIAC_RE = re.compile(
    r'\b(dil|seene?|sine|chhaati?|chati)\b.{0,25}\b(dard|dardh|takleef|taklif|jalan|daura|doora|dawra|dora|attak|attack)\b'
    r'|\b(dil|heart)\b.{0,15}\b(attak|attack|doora|daura|dawra)\b',
    re.IGNORECASE,
)
HINGLISH_BREATHING_RE = re.compile(
    r'\b(saans?|saas|sans)\b.{0,30}\b(nahi|nhi|dikkat|taklif|takleef|lene|aa rahi|nahi aa)\b',
    re.IGNORECASE,
)


def demo_triage(transcript: str) -> dict:
    """Hardcoded triage logic for demo/testing without API keys. Supports Hindi/Hinglish."""
    text_lower = transcript.lower()

    # Check for CRITICAL keywords (exact string match)
    emergency_flags = []
    for category, keywords in CRITICAL_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            emergency_flags.append(category.upper())

    # Regex fallback for Hinglish cardiac/breathing patterns (catches spelling variants)
    if "chest pain" not in [f.lower() for f in emergency_flags] and HINGLISH_CARDIAC_RE.search(transcript):
        emergency_flags.append("CHEST PAIN")
    if "breathing" not in [f.lower() for f in emergency_flags] and HINGLISH_BREATHING_RE.search(transcript):
        emergency_flags.append("BREATHING")

    if emergency_flags:
        return {
            "symptoms": emergency_flags,
            "risk_level": "CRITICAL",
            "is_emergency": True,
            "emergency_flags": emergency_flags,
            "recommended_action": "Call 108 immediately. Do not move the patient.",
            "medical_summary": f"CRITICAL: Patient reports {', '.join(emergency_flags).lower()}. Requires immediate emergency intervention.",
            "detectedLanguage": detect_language(transcript),
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
            "recommended_action": "Seek urgent medical attention within 24 hours.",
            "medical_summary": f"HIGH: Patient presents with {', '.join(symptoms).lower()}. Requires prompt medical evaluation.",
            "detectedLanguage": detect_language(transcript),
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
            "detectedLanguage": detect_language(transcript),
        }

    # Default to LOW
    return {
        "symptoms": ["general inquiry"],
        "risk_level": "LOW",
        "is_emergency": False,
        "emergency_flags": [],
        "recommended_action": "Monitor symptoms. Seek care if symptoms worsen.",
        "medical_summary": "LOW: Patient describes non-acute symptoms. Monitor and follow up as needed.",
        "detectedLanguage": detect_language(transcript),
    }


TRIAGE_PROMPT = """You are a medical triage AI. Analyze this patient description and respond with ONLY valid JSON (no markdown, no preamble, no extra text).

IMPORTANT: The patient may have described symptoms in Hindi, Hinglish, or English. You MUST always respond in English only. Translate all symptom names, summaries, and actions to English.

Patient describes: "{transcript}"

Return this exact JSON structure:
{{
  "symptoms": ["symptom1", "symptom2", "symptom3"],
  "risk_level": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
  "is_emergency": true | false,
  "emergency_flags": ["flag1", "flag2"] | [],
  "recommended_action": "brief action in English (max 10 words)",
  "medical_summary": "2-3 sentence clinical assessment in English"
}}

CRITICAL keywords that ALWAYS mean is_emergency=true:
- Chest pain, chest pressure, heart attack (or Hindi: seene mein dard, dil ka daura/doora)
- Difficulty breathing, shortness of breath, choking (or Hindi: saans lene mein dikkat)
- Stroke signs: facial drooping, arm weakness, slurred speech (or Hindi: lakwa)
- Loss of consciousness, fainting (or Hindi: behosh)
- Severe bleeding, major trauma (or Hindi: bahut khoon bah raha)
- Severe allergic reaction, anaphylaxis
- Severe head injury, sudden severe headache (or Hindi: sir mein gambhir chot)

If ANY critical keyword is present (in any language), set is_emergency to true and risk_level to CRITICAL.

Only return the JSON object, nothing else."""


async def analyze_transcript(transcript: str) -> dict:
    """Analyze transcript using Groq API if key available, otherwise use demo mode."""
    api_key = os.getenv("GROQ_API_KEY")
    detected_lang = detect_language(transcript)

    if not api_key:
        print("[demo] GROQ_API_KEY not set. Using DEMO MODE (hardcoded keywords).")
        return demo_triage(transcript)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": TRIAGE_PROMPT.format(transcript=transcript)},
            ],
            temperature=0.1,
            max_tokens=512,
        )

        response_text = response.choices[0].message.content.strip()

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
        result["detectedLanguage"] = detected_lang
        return result

    except Exception as e:
        print(f"Groq API error: {e}. Falling back to DEMO MODE.")
        return demo_triage(transcript)
