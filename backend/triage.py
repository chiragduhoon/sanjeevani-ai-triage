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
    "seizure": [
        "seizure", "convulsion", "convulsions", "fits",
        # Hindi
        "मिर्गी", "दौरा पड़", "ऐंठन",
        # Hinglish
        "daura pad", "daura aa", "mirgi", "aithan",
    ],
    "poisoning": [
        "poisoning", "poison", "overdose", "swallowed poison",
        # Hindi
        "ज़हर", "जहर", "दवा की ज्यादा खुराक",
        # Hinglish
        "zeher", "zahar", "zyada dawa", "overdose le li",
    ],
    "throat swelling": [
        "throat closing", "throat swelling", "tongue swelling", "can't swallow",
        # Hindi
        "गला बंद", "जीभ सूज", "निगलने में दिक्कत",
        # Hinglish
        "gala band", "gala bandh", "jeebh sooj", "jeebh suj", "nigalne mein dikkat",
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
    "ongoing condition": [
        # Common chronic / named conditions a patient may mention by name. These
        # warrant a doctor visit (MODERATE) rather than the generic LOW fallback.
        "thyroid", "diabetes", "sugar problem", "blood pressure", "bp problem",
        "cholesterol", "asthma", "migraine", "acidity", "gas problem",
        # Hindi
        "थायराइड", "थाइरॉइड", "मधुमेह", "शुगर", "रक्तचाप", "बीपी",
        "दमा", "अस्थमा", "माइग्रेन", "एसिडिटी", "गैस",
        # Hinglish
        "thyroid ki problem", "sugar ki bimari", "bp ki problem",
        "blood pressure ki problem", "thairoid",
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
# Note: a bare "nahi"/"nhi" is deliberately NOT a positive token here — on its own it is
# usually a negator ("dikkat nahi" = no difficulty). The positive "breath not coming" sense
# is still caught via "nahi aa" / "aa rahi" / "lene".
HINGLISH_BREATHING_RE = re.compile(
    r'\b(saans?|saas|sans)\b.{0,30}\b(dikkat|taklif|takleef|lene|aa rahi|nahi aa)\b',
    re.IGNORECASE,
)
# Devanagari proximity patterns. \b word boundaries don't work for Devanagari, so we
# allow a small character gap to catch natural phrasing like "सीने में बहुत दर्द"
# (chest ... a lot ... pain) which an exact-substring match would miss.
DEVANAGARI_CARDIAC_RE = re.compile(
    r'(दिल|सीन|सीने|सीना|छाती|छात).{0,15}(दर्द|दौरा|तकलीफ|जलन|अटैक)'
    r'|(दिल|हार्ट).{0,10}(अटैक|दौरा)'
)
DEVANAGARI_BREATHING_RE = re.compile(
    r'(सांस|साँस|सास).{0,20}(दिक्कत|तकलीफ|नहीं आ|नही आ|लेने|बंद)'
)

# Words that negate a nearby symptom ("no chest pain", "seene mein dard nahi hai").
# Kept to unambiguous negators so we don't accidentally drop real symptoms.
NEGATORS = {
    "not", "no", "don't", "dont", "doesn't", "doesnt", "didn't", "didnt",
    "without", "never",
    "nahi", "nhi", "nahin", "बिना", "नहीं", "नही",
}
_WORD_RE = re.compile(r"\S+")


def _window_has_negator(before: str, after: str, span: int = 3) -> bool:
    """True if a negator sits within `span` words before or after a matched symptom."""
    before_words = _WORD_RE.findall(before.lower())[-span:]
    after_words = _WORD_RE.findall(after.lower())[:span]
    window = {w.strip(".,!?;:।\"'()") for w in before_words + after_words}
    return bool(window & NEGATORS)


def _has_unnegated(text_lower: str, keyword: str) -> bool:
    """True if `keyword` appears at least once without a nearby negator."""
    kw = keyword.lower()
    if not kw:
        return False
    start = text_lower.find(kw)
    while start != -1:
        end = start + len(kw)
        if not _window_has_negator(text_lower[:start], text_lower[end:]):
            return True
        start = text_lower.find(kw, start + 1)
    return False


def _regex_unnegated(text: str, regex: re.Pattern) -> bool:
    """True if a regex symptom pattern matches without a nearby negator."""
    for m in regex.finditer(text):
        if not _window_has_negator(text[:m.start()], text[m.end():]):
            return True
    return False


_CARE_ADVICE = {
    "en": {
        "CRITICAL": [
            "Call 108 (ambulance) immediately.",
            "Do not eat or drink anything.",
            "Sit or lie down and stay calm.",
            "Have someone stay with you until help arrives.",
        ],
        "HIGH": [
            "See a doctor within the next 24 hours.",
            "Rest and drink plenty of fluids.",
            "Monitor your symptoms closely.",
            "Go to a hospital if symptoms get worse.",
        ],
        "MODERATE": [
            "Book an appointment with your doctor.",
            "Rest and stay hydrated.",
            "Track whether symptoms improve or worsen.",
        ],
        "LOW": [
            "Rest and stay hydrated.",
            "Monitor your symptoms over the next few days.",
            "See a doctor if it persists or worsens.",
        ],
    },
    "hi": {
        "CRITICAL": [
            "तुरंत 108 (एम्बुलेंस) पर कॉल करें।",
            "कुछ भी खाएं या पिएं नहीं।",
            "शांत रहें और बैठ या लेट जाएं।",
            "मदद आने तक किसी को अपने साथ रखें।",
        ],
        "HIGH": [
            "अगले 24 घंटों में डॉक्टर को दिखाएं।",
            "आराम करें और खूब पानी पिएं।",
            "अपने लक्षणों पर नज़र रखें।",
            "हालत बिगड़ने पर अस्पताल जाएं।",
        ],
        "MODERATE": [
            "अपने डॉक्टर से अपॉइंटमेंट लें।",
            "आराम करें और पानी पीते रहें।",
            "देखें कि लक्षण बढ़ रहे हैं या कम हो रहे हैं।",
        ],
        "LOW": [
            "आराम करें और पानी पीते रहें।",
            "कुछ दिनों तक अपने लक्षणों पर नज़र रखें।",
            "अगर बना रहे या बढ़े तो डॉक्टर को दिखाएं।",
        ],
    },
}


def _default_care_advice(risk: str, lang: str) -> list:
    """Fallback self-care steps (no medicines) by risk level and language."""
    lang_map = _CARE_ADVICE.get(lang, _CARE_ADVICE["en"])
    return lang_map.get(risk, lang_map["LOW"])


def demo_triage(transcript: str, care_lang: str = None) -> dict:
    """Hardcoded triage logic for demo/testing without API keys. Supports Hindi/Hinglish.
    care_lang ('hi'|'en') sets the care_advice language; defaults to the detected language."""
    text_lower = transcript.lower()
    care_lang = care_lang if care_lang in ("hi", "en") else detect_language(transcript)

    # Check for CRITICAL keywords (negation-aware substring match)
    emergency_flags = []
    for category, keywords in CRITICAL_KEYWORDS.items():
        if any(_has_unnegated(text_lower, kw) for kw in keywords):
            emergency_flags.append(category.upper())

    # Regex fallback for Hinglish + Devanagari cardiac/breathing patterns. Catches
    # spelling variants and words inserted between the body part and the symptom.
    flags_lower = [f.lower() for f in emergency_flags]
    if "chest pain" not in flags_lower and (
        _regex_unnegated(transcript, HINGLISH_CARDIAC_RE)
        or _regex_unnegated(transcript, DEVANAGARI_CARDIAC_RE)
    ):
        emergency_flags.append("CHEST PAIN")
    if "breathing" not in flags_lower and (
        _regex_unnegated(transcript, HINGLISH_BREATHING_RE)
        or _regex_unnegated(transcript, DEVANAGARI_BREATHING_RE)
    ):
        emergency_flags.append("BREATHING")

    if emergency_flags:
        return {
            "symptoms": emergency_flags,
            "risk_level": "CRITICAL",
            "is_emergency": True,
            "emergency_flags": emergency_flags,
            "recommended_action": "Call 108 immediately. Do not move the patient.",
            "medical_summary": f"CRITICAL: Patient reports {', '.join(emergency_flags).lower()}. Requires immediate emergency intervention.",
            "care_advice": _default_care_advice("CRITICAL", care_lang),
            "detectedLanguage": detect_language(transcript),
        }

    # Check for HIGH keywords
    symptoms = []
    for category, keywords in HIGH_KEYWORDS.items():
        if any(_has_unnegated(text_lower, kw) for kw in keywords):
            symptoms.append(category)

    if symptoms:
        return {
            "symptoms": symptoms,
            "risk_level": "HIGH",
            "is_emergency": False,
            "emergency_flags": [],
            "recommended_action": "Seek urgent medical attention within 24 hours.",
            "medical_summary": f"HIGH: Patient presents with {', '.join(symptoms).lower()}. Requires prompt medical evaluation.",
            "care_advice": _default_care_advice("HIGH", care_lang),
            "detectedLanguage": detect_language(transcript),
        }

    # Check for MODERATE keywords
    symptoms = []
    for category, keywords in MODERATE_KEYWORDS.items():
        if any(_has_unnegated(text_lower, kw) for kw in keywords):
            symptoms.append(category)

    if symptoms:
        return {
            "symptoms": symptoms or ["general malaise"],
            "risk_level": "MODERATE",
            "is_emergency": False,
            "emergency_flags": [],
            "recommended_action": "Follow up with primary care physician.",
            "medical_summary": f"MODERATE: Patient reports {', '.join(symptoms).lower() if symptoms else 'general symptoms'}. Recommend primary care evaluation.",
            "care_advice": _default_care_advice("MODERATE", care_lang),
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
        "care_advice": _default_care_advice("LOW", care_lang),
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
  "medical_summary": "2-3 sentence clinical assessment in English",
  "care_advice": ["step 1", "step 2", "step 3"]
}}

care_advice rules: 3-5 short, safe self-care steps FOR THE PATIENT that are
SPECIFIC to the condition they described — not generic "rest and drink water".
Tailor the advice to their actual symptoms/illness (e.g. for a thyroid problem:
take medication on time and get TSH tested; for a sprain: rest, ice, elevate the
limb). You may include when to see a doctor or call 108. NO medicine names, NO
drug dosages. Write care_advice in the SAME language the patient used
(Hindi/Hinglish/English). Keep all OTHER fields in English.

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


VALID_RISK = {"CRITICAL", "HIGH", "MODERATE", "LOW"}


def _coerce_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes", "y")
    return bool(value)


def _coerce_list(value) -> list:
    if isinstance(value, list):
        return [str(x) for x in value if str(x).strip()]
    if value is None or value == "":
        return []
    return [str(value)]


def _validate_llm_result(raw: dict, transcript: str, detected_lang: str, care_lang: str) -> dict:
    """Coerce a model response into the strict triage schema. Returns None if unusable."""
    if not isinstance(raw, dict):
        return None

    risk = str(raw.get("risk_level", "")).upper().strip()
    if risk not in VALID_RISK:
        return None  # caller falls back to demo mode

    return {
        "symptoms": _coerce_list(raw.get("symptoms")) or ["general symptoms"],
        "risk_level": risk,
        "is_emergency": _coerce_bool(raw.get("is_emergency")),
        "emergency_flags": _coerce_list(raw.get("emergency_flags")),
        "recommended_action": str(raw.get("recommended_action") or "").strip()
        or "Consult a doctor for evaluation.",
        "medical_summary": str(raw.get("medical_summary") or "").strip()
        or "Patient described symptoms; clinical evaluation recommended.",
        "care_advice": _coerce_list(raw.get("care_advice")) or _default_care_advice(risk, care_lang),
        "detectedLanguage": detected_lang,
    }


def _apply_safety_net(result: dict, transcript: str) -> dict:
    """Never under-triage a red flag: if keywords detect an emergency the LLM missed,
    escalate to CRITICAL and merge the flags. One-directional — never downgrades."""
    demo = demo_triage(transcript)
    if demo.get("is_emergency") and not result.get("is_emergency"):
        result["risk_level"] = "CRITICAL"
        result["is_emergency"] = True
        merged = list(dict.fromkeys(
            (result.get("emergency_flags") or []) + demo.get("emergency_flags", [])
        ))
        result["emergency_flags"] = merged
    return result


def _parse_llm_text(response_text: str, transcript: str, detected_lang: str, care_lang: str) -> dict:
    """Extract the first JSON object from a model reply and validate it.
    Returns a clean triage dict, or None if the reply is unusable."""
    match = re.search(r'\{.*\}', response_text or "", re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return _validate_llm_result(json.loads(match.group(0)), transcript, detected_lang, care_lang)


# OpenRouter is OpenAI-compatible. Free models are shared and can rate-limit (429)
# upstream at any moment, so we try a list of them in order and use whichever
# responds. Override the list via OPENROUTER_MODEL (comma-separated) if slugs change.
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_DEFAULT_MODELS = [
    # General-purpose free models confirmed responding (free models rotate, so this
    # is just a backup ordering — Groq is the primary provider).
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nex-agi/nex-n2-pro:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
]


def _openrouter_models() -> list:
    raw = os.getenv("OPENROUTER_MODEL", "")
    if raw.strip():
        return [m.strip() for m in raw.split(",") if m.strip()]
    return OPENROUTER_DEFAULT_MODELS


def _call_openrouter(prompt: str, api_key: str) -> str:
    """Try each candidate free model until one returns a usable reply. Raises if all fail."""
    import httpx
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # Optional attribution headers OpenRouter recommends.
        "HTTP-Referer": "https://sanjeevani.app",
        "X-Title": "Sanjeevani Triage",
    }
    last_err = None
    # Only try the first 2 backup models, with a short timeout, so a congested
    # OpenRouter can never make the user wait long before we fall back to demo mode.
    for model in _openrouter_models()[:2]:
        try:
            resp = httpx.post(
                OPENROUTER_URL,
                headers=headers,
                json={
                    "model": model,
                    "messages": [
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 512,
                },
                timeout=10.0,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"] or ""
            last_err = f"{model} -> {resp.status_code}"
            print(f"OpenRouter {last_err}; trying next model.")
        except Exception as e:
            last_err = f"{model} -> {e}"
            print(f"OpenRouter {last_err}; trying next model.")
    raise RuntimeError(f"All OpenRouter models failed ({last_err})")


def _call_groq(prompt: str, api_key: str) -> str:
    """Call Groq and return the raw reply text."""
    from groq import Groq
    client = Groq(api_key=api_key, timeout=15.0)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,
        max_tokens=512,
    )
    return response.choices[0].message.content or ""


def _care_lang_instruction(care_lang: str) -> str:
    name = "Hindi (Devanagari script)" if care_lang == "hi" else "English"
    return f"\n\nWrite the care_advice steps in {name}."


async def analyze_transcript(transcript: str, pref_lang: str = None) -> dict:
    """Analyze a transcript with an LLM. Prefers Groq, then OpenRouter, then a
    keyword-based demo fallback. Always returns a valid triage dict.

    pref_lang ('hi'|'en') is the patient's chosen UI language and controls the
    language of the care_advice steps. If not given, the detected language is used."""
    detected_lang = detect_language(transcript)
    care_lang = pref_lang if pref_lang in ("hi", "en") else detected_lang
    prompt = TRIAGE_PROMPT.format(transcript=transcript) + _care_lang_instruction(care_lang)

    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")

    # Try each configured provider in order; fall through on any failure.
    # Groq is first — its free tier is fast and reliable. OpenRouter (free models)
    # is a backup since those can rate-limit upstream.
    providers = []
    if groq_key:
        providers.append(("Groq", lambda: _call_groq(prompt, groq_key)))
    if openrouter_key:
        providers.append(("OpenRouter", lambda: _call_openrouter(prompt, openrouter_key)))

    for name, call in providers:
        try:
            result = _parse_llm_text(call(), transcript, detected_lang, care_lang)
            if result is None:
                print(f"{name} returned an invalid result. Trying next option.")
                continue
            return _apply_safety_net(result, transcript)
        except Exception as e:
            print(f"{name} API error: {e}. Trying next option.")

    if not providers:
        print("[demo] No LLM API key set. Using DEMO MODE (hardcoded keywords).")
    else:
        print("[demo] All LLM providers failed. Using DEMO MODE (hardcoded keywords).")
    return demo_triage(transcript, care_lang)
