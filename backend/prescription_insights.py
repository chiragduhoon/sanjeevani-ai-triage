import hashlib
import json
import os
import re

# Plain-language explanation of a saved prescription: what illness it was most
# likely treating and what each medicine helped with. Mirrors the provider chain
# in triage.py (Groq first, OpenRouter free models as backup). Unlike triage the
# offline fallback is a small knowledge base of common medicines rather than
# keywords — an explanation must stay grounded in known drug facts, so unknown
# medicines are honestly marked "ask your doctor" instead of guessed.

EXPLAIN_PROMPT = """You are a medical prescription explainer for patients in India. Below are the medicines from a patient's past prescription. Analyze them TOGETHER and respond with ONLY valid JSON (no markdown, no preamble, no extra text).

Prescription records:
{records}

Return this exact JSON structure:
{{
  "likely_condition": "the illness/condition this prescription was most likely treating, short (e.g. 'Throat infection with fever')",
  "condition_explanation": "2-3 simple sentences explaining why these medicines together point to that illness",
  "medicines": [
    {{
      "medicine_name": "name exactly as given in the records",
      "purpose": "what kind of medicine this is (e.g. antibiotic, painkiller, antacid)",
      "helped_with": "what symptom or problem it helped the patient with, in simple words"
    }}
  ],
  "confidence": "high" | "medium" | "low"
}}

Rules:
- If a diagnosis is written in the records, treat it as the strongest signal for likely_condition.
- Explain ONLY the medicines listed — NEVER add medicines that are not in the records.
- If a medicine name is unrecognizable, say so honestly in its fields; do not guess wildly.
- Use simple language a person with no medical background understands.
- Do NOT give new medical advice, change doses, or suggest new medicines.
- Set confidence to "low" if the medicines are ambiguous or fit many different conditions.
- Write likely_condition, condition_explanation, purpose and helped_with in {language}. Keep medicine_name as given and JSON keys exactly as above.

Only return the JSON object, nothing else."""

VALID_CONFIDENCE = {"high", "medium", "low"}

# ---- Offline knowledge base of medicines commonly seen on Indian prescriptions ----
# match: lowercase substrings checked against the written medicine name.
# hint: condition family used to infer the likely illness when no diagnosis is written.
MEDICINE_KB = [
    {
        "match": ("paracetamol", "dolo", "crocin", "calpol", "pcm", "acetaminophen"),
        "hint": "fever",
        "purpose": {"en": "Fever and pain reliever", "hi": "बुखार और दर्द की दवा"},
        "helped": {"en": "Brought down fever and eased headache or body ache.",
                   "hi": "बुखार कम करने और सिरदर्द/बदन दर्द में आराम देने के लिए।"},
    },
    {
        "match": ("ibuprofen", "brufen", "combiflam", "diclofenac", "voveran", "aceclofenac", "naproxen"),
        "hint": "pain",
        "purpose": {"en": "Painkiller (anti-inflammatory)", "hi": "दर्द और सूजन की दवा"},
        "helped": {"en": "Reduced pain and swelling/inflammation.",
                   "hi": "दर्द और सूजन कम करने के लिए।"},
    },
    {
        "match": ("amoxicillin", "amoxyclav", "augmentin", "moxikind", "mox ", "clavam", "azithromycin",
                  "azithral", "azee", "cefixime", "taxim", "zifi", "cefpodoxime", "ciprofloxacin",
                  "ofloxacin", "levofloxacin", "doxycycline", "cephalexin", "amoxil"),
        "hint": "infection",
        "purpose": {"en": "Antibiotic", "hi": "एंटीबायोटिक (संक्रमण की दवा)"},
        "helped": {"en": "Fought the bacterial infection causing the illness.",
                   "hi": "बीमारी पैदा करने वाले बैक्टीरियल संक्रमण को खत्म करने के लिए।"},
    },
    {
        "match": ("metronidazole", "metrogyl", "flagyl", "ornidazole", "tinidazole"),
        "hint": "stomach_infection",
        "purpose": {"en": "Antibiotic for stomach/gut infections", "hi": "पेट के संक्रमण की एंटीबायोटिक"},
        "helped": {"en": "Treated stomach or intestinal infection (like loose motions from infection).",
                   "hi": "पेट या आंत के संक्रमण (जैसे संक्रमण से दस्त) के इलाज के लिए।"},
    },
    {
        "match": ("cetirizine", "levocetirizine", "cetzine", "allegra", "fexofenadine", "loratadine",
                  "chlorpheniramine", "cpm", "avil"),
        "hint": "allergy",
        "purpose": {"en": "Anti-allergy medicine (antihistamine)", "hi": "एलर्जी की दवा"},
        "helped": {"en": "Relieved sneezing, runny nose, itching or rashes from allergy.",
                   "hi": "छींक, बहती नाक, खुजली या एलर्जी के दानों में आराम के लिए।"},
    },
    {
        "match": ("montelukast", "montair", "montek"),
        "hint": "allergy",
        "purpose": {"en": "Allergy and airway medicine", "hi": "एलर्जी और सांस की नली की दवा"},
        "helped": {"en": "Controlled allergic cough, wheezing or blocked nose.",
                   "hi": "एलर्जी वाली खांसी, सांस की घरघराहट या बंद नाक के लिए।"},
    },
    {
        "match": ("pantoprazole", "pan 40", "pan-40", "pantop", "omeprazole", "omez", "rabeprazole",
                  "razo", "esomeprazole", "ranitidine", "famotidine"),
        "hint": "acidity",
        "purpose": {"en": "Acidity reducer (protects the stomach)", "hi": "एसिडिटी कम करने की दवा"},
        "helped": {"en": "Reduced stomach acid — for acidity/heartburn, or to protect the stomach while taking other medicines.",
                   "hi": "पेट का एसिड कम करने के लिए — एसिडिटी/सीने की जलन में, या दूसरी दवाओं से पेट बचाने के लिए।"},
    },
    {
        "match": ("domperidone", "domstal", "ondansetron", "emeset", "ondem", "vomikind"),
        "hint": "nausea",
        "purpose": {"en": "Anti-vomiting medicine", "hi": "उल्टी रोकने की दवा"},
        "helped": {"en": "Stopped nausea and vomiting.", "hi": "जी मिचलाना और उल्टी रोकने के लिए।"},
    },
    {
        "match": ("ors", "electral", "enerzal"),
        "hint": "dehydration",
        "purpose": {"en": "Oral rehydration salts", "hi": "ओआरएस (पानी-नमक का घोल)"},
        "helped": {"en": "Replaced water and salts lost from loose motions, vomiting or fever.",
                   "hi": "दस्त, उल्टी या बुखार में शरीर का पानी-नमक पूरा करने के लिए।"},
    },
    {
        "match": ("loperamide", "racecadotril", "zinc"),
        "hint": "dehydration",
        "purpose": {"en": "Loose-motion control / recovery support", "hi": "दस्त रोकने / रिकवरी की दवा"},
        "helped": {"en": "Helped control loose motions and recover faster.",
                   "hi": "दस्त रोकने और जल्दी ठीक होने में मदद के लिए।"},
    },
    {
        "match": ("salbutamol", "asthalin", "levolin", "budesonide", "budecort", "formoterol", "foracort"),
        "hint": "asthma",
        "purpose": {"en": "Breathing/asthma medicine (opens airways)", "hi": "सांस/दमा की दवा"},
        "helped": {"en": "Opened the airways to ease breathing, wheezing or asthma.",
                   "hi": "सांस की नली खोलकर सांस लेने में आसानी के लिए (दमा/घरघराहट)।"},
    },
    {
        "match": ("dextromethorphan", "ascoril", "benadryl", "corex", "grilinctus", "ambroxol",
                  "bromhexine", "guaifenesin", "cough syrup"),
        "hint": "cough_cold",
        "purpose": {"en": "Cough medicine", "hi": "खांसी की दवा"},
        "helped": {"en": "Eased cough and loosened mucus.", "hi": "खांसी में आराम और बलगम ढीला करने के लिए।"},
    },
    {
        "match": ("metformin", "glycomet", "glimepiride", "glimestar", "sitagliptin", "januvia", "insulin"),
        "hint": "diabetes",
        "purpose": {"en": "Diabetes medicine (controls blood sugar)", "hi": "डायबिटीज (शुगर) की दवा"},
        "helped": {"en": "Kept blood sugar under control.", "hi": "खून में शुगर काबू में रखने के लिए।"},
    },
    {
        "match": ("amlodipine", "amlong", "telmisartan", "telma", "losartan", "atenolol", "metoprolol",
                  "ramipril", "enalapril"),
        "hint": "bp",
        "purpose": {"en": "Blood pressure medicine", "hi": "ब्लड प्रेशर की दवा"},
        "helped": {"en": "Kept blood pressure under control.", "hi": "ब्लड प्रेशर काबू में रखने के लिए।"},
    },
    {
        "match": ("atorvastatin", "rosuvastatin", "rosuvas", "storvas"),
        "hint": "cholesterol",
        "purpose": {"en": "Cholesterol-lowering medicine", "hi": "कोलेस्ट्रॉल कम करने की दवा"},
        "helped": {"en": "Lowered cholesterol to protect the heart.", "hi": "दिल की हिफाज़त के लिए कोलेस्ट्रॉल कम करने हेतु।"},
    },
    {
        "match": ("thyroxine", "thyronorm", "eltroxin", "levothyroxine"),
        "hint": "thyroid",
        "purpose": {"en": "Thyroid hormone medicine", "hi": "थायराइड की दवा"},
        "helped": {"en": "Replaced low thyroid hormone to fix tiredness, weight and energy problems.",
                   "hi": "थायराइड हार्मोन की कमी पूरी करने के लिए (थकान, वज़न, ऊर्जा की दिक्कतें)।"},
    },
    {
        "match": ("vitamin", "becosules", "becadexamin", "zincovit", "calcium", "shelcal", "d3",
                  "folic", "iron", "ferrous", "multivitamin", "b12", "b-complex", "b complex"),
        "hint": "supplement",
        "purpose": {"en": "Vitamin/mineral supplement", "hi": "विटामिन/मिनरल सप्लीमेंट"},
        "helped": {"en": "Supported recovery and covered nutritional gaps.",
                   "hi": "जल्दी ठीक होने और पोषण की कमी पूरी करने के लिए।"},
    },
]

# Condition-family phrases used to compose the likely illness in demo mode.
# Ordered by how strongly each family identifies the illness — the first one or
# two families found decide the wording. "supplement" never names an illness.
CONDITION_PHRASES = [
    ("infection", {"en": "a bacterial infection", "hi": "बैक्टीरियल संक्रमण"}),
    ("stomach_infection", {"en": "a stomach/gut infection", "hi": "पेट का संक्रमण"}),
    ("asthma", {"en": "asthma or a breathing problem", "hi": "दमा या सांस की तकलीफ"}),
    ("diabetes", {"en": "diabetes (blood sugar)", "hi": "डायबिटीज (शुगर)"}),
    ("bp", {"en": "high blood pressure", "hi": "हाई ब्लड प्रेशर"}),
    ("thyroid", {"en": "a thyroid problem", "hi": "थायराइड की समस्या"}),
    ("cholesterol", {"en": "high cholesterol", "hi": "बढ़ा हुआ कोलेस्ट्रॉल"}),
    ("dehydration", {"en": "loose motions/dehydration", "hi": "दस्त/पानी की कमी"}),
    ("acidity", {"en": "acidity or stomach trouble", "hi": "एसिडिटी या पेट की तकलीफ"}),
    ("allergy", {"en": "an allergy", "hi": "एलर्जी"}),
    ("cough_cold", {"en": "cough and cold", "hi": "खांसी-जुकाम"}),
    ("nausea", {"en": "nausea/vomiting", "hi": "जी मिचलाना/उल्टी"}),
    ("fever", {"en": "fever", "hi": "बुखार"}),
    ("pain", {"en": "pain or inflammation", "hi": "दर्द या सूजन"}),
]

UNKNOWN_MEDICINE = {
    "purpose": {"en": "Not in our offline medicine list", "hi": "हमारी ऑफलाइन दवा सूची में नहीं है"},
    "helped": {"en": "Ask your doctor or pharmacist what this medicine was for.",
               "hi": "यह दवा किस लिए थी, अपने डॉक्टर या केमिस्ट से पूछें।"},
}


def _kb_lookup(medicine_name: str):
    """Match a written medicine name against the knowledge base (substring, case-insensitive)."""
    name = f" {medicine_name.lower().strip()} "
    for entry in MEDICINE_KB:
        if any(pat in name for pat in entry["match"]):
            return entry
    return None


def _first_diagnosis(prescriptions: list) -> str:
    """The first diagnosis a doctor or scan recorded, if any."""
    for rx in prescriptions:
        for field in ("scanned_diagnosis", "diagnosis"):
            value = str(rx.get(field) or "").strip()
            if value:
                return value
    return ""


def demo_explain(prescriptions: list, lang: str) -> dict:
    """Knowledge-base explanation for no-key/offline environments. Grounded only in
    the KB and any diagnosis written on the record — never invents drug facts."""
    medicines = []
    hints = []
    matched_any = False
    for rx in prescriptions:
        name = str(rx.get("medicine_name") or rx.get("name") or "").strip()
        if not name:
            continue
        entry = _kb_lookup(name)
        if entry:
            matched_any = True
            if entry["hint"] != "supplement":
                hints.append(entry["hint"])
            medicines.append({
                "medicine_name": name,
                "purpose": entry["purpose"][lang],
                "helped_with": entry["helped"][lang],
            })
        else:
            medicines.append({
                "medicine_name": name,
                "purpose": UNKNOWN_MEDICINE["purpose"][lang],
                "helped_with": UNKNOWN_MEDICINE["helped"][lang],
            })

    diagnosis = _first_diagnosis(prescriptions)
    if diagnosis:
        likely = diagnosis
        explanation = (
            f"डॉक्टर ने पर्ची पर यही लिखा था: \"{diagnosis}\"। नीचे हर दवा का काम समझाया गया है।"
            if lang == "hi" else
            f"The doctor wrote this on the prescription: \"{diagnosis}\". Each medicine's role is explained below."
        )
        confidence = "high"
    else:
        # Compose the illness from the one or two strongest condition families found.
        found = [phrase[lang] for hint, phrase in CONDITION_PHRASES if hint in hints]
        joiner = " के साथ " if lang == "hi" else " with "
        if found:
            likely = joiner.join(found[:2])
            explanation = (
                "पर्ची पर कोई डायग्नोसिस नहीं लिखा था, इसलिए यह अंदाज़ा दवाओं के आम इस्तेमाल से लगाया गया है।"
                if lang == "hi" else
                "No diagnosis was written on the prescription, so this is inferred from what these medicines are commonly used for."
            )
            confidence = "medium"
        else:
            likely = "पता नहीं चल पाया — डॉक्टर से पूछें" if lang == "hi" else "Could not determine — ask your doctor"
            explanation = (
                "इन दवाओं से बीमारी का पक्का अंदाज़ा नहीं लगाया जा सका।"
                if lang == "hi" else
                "The illness could not be confidently inferred from these medicines."
            )
            confidence = "low"

    if not matched_any and not diagnosis:
        confidence = "low"

    return {
        "likely_condition": likely,
        "condition_explanation": explanation,
        "medicines": medicines,
        "confidence": confidence,
    }


# ---- LLM provider chain (text models; mirrors triage.py ordering) ----

def _call_groq_text(prompt: str, api_key: str) -> str:
    from groq import Groq
    client = Groq(api_key=api_key, timeout=15.0)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1024,
    )
    return response.choices[0].message.content or ""


def _call_openrouter_text(prompt: str, api_key: str) -> str:
    """Try the same free-model pool triage uses. Raises if all fail."""
    import httpx
    from triage import _openrouter_models
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sanjeevani.app",
        "X-Title": "Sanjeevani Prescription Insights",
    }
    last_err = None
    for model in _openrouter_models()[:2]:
        try:
            resp = httpx.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 1024,
                },
                timeout=15.0,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"] or ""
            last_err = f"{model} -> {resp.status_code}"
            print(f"OpenRouter insights {last_err}; trying next model.")
        except Exception as e:
            last_err = f"{model} -> {e}"
            print(f"OpenRouter insights {last_err}; trying next model.")
    raise RuntimeError(f"All OpenRouter models failed ({last_err})")


def _records_for_prompt(prescriptions: list) -> list:
    """Compact, prompt-friendly view of the stored prescription records."""
    records = []
    for rx in prescriptions:
        name = str(rx.get("medicine_name") or rx.get("name") or "").strip()
        if not name:
            continue
        record = {"medicine_name": name}
        for field in ("dosage", "frequency", "duration", "instructions"):
            value = str(rx.get(field) or "").strip()
            if value:
                record[field] = value
        records.append(record)
    diagnosis = _first_diagnosis(prescriptions)
    if diagnosis and records:
        records[0]["diagnosis_written_on_prescription"] = diagnosis
    return records


def _validate_explanation(raw: dict, prescriptions: list, lang: str):
    """Coerce a model reply into the strict insights schema, and guarantee every
    input medicine gets an entry (unmatched ones fall back to the KB). Returns
    None if the reply is unusable."""
    if not isinstance(raw, dict):
        return None
    likely = str(raw.get("likely_condition") or "").strip()
    if not likely:
        return None

    input_names = []
    for rx in prescriptions:
        name = str(rx.get("medicine_name") or rx.get("name") or "").strip()
        if name:
            input_names.append(name)

    # Keep only model entries that correspond to a medicine actually in the records.
    remaining = {n.lower(): n for n in input_names}
    medicines = []
    for med in raw.get("medicines") or []:
        if not isinstance(med, dict):
            continue
        name = str(med.get("medicine_name") or "").strip()
        helped = str(med.get("helped_with") or "").strip()
        if not name or not helped:
            continue
        key = next(
            (k for k in remaining
             if k in name.lower() or name.lower() in k),
            None,
        )
        if key is None:
            continue  # model invented a medicine — drop it
        medicines.append({
            "medicine_name": remaining.pop(key),
            "purpose": str(med.get("purpose") or "").strip(),
            "helped_with": helped,
        })
    if not medicines:
        return None

    # Any medicine the model skipped still gets an honest KB/unknown entry.
    for name in remaining.values():
        entry = _kb_lookup(name)
        medicines.append({
            "medicine_name": name,
            "purpose": (entry["purpose"][lang] if entry else UNKNOWN_MEDICINE["purpose"][lang]),
            "helped_with": (entry["helped"][lang] if entry else UNKNOWN_MEDICINE["helped"][lang]),
        })

    confidence = str(raw.get("confidence") or "").lower().strip()
    return {
        "likely_condition": likely,
        "condition_explanation": str(raw.get("condition_explanation") or "").strip(),
        "medicines": medicines,
        "confidence": confidence if confidence in VALID_CONFIDENCE else "low",
    }


def _parse_explanation(response_text: str, prescriptions: list, lang: str):
    match = re.search(r'\{.*\}', response_text or "", re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in model response")
    return _validate_explanation(json.loads(match.group(0)), prescriptions, lang)


# Repeat clicks on the same prescription list shouldn't re-bill the LLM.
_CACHE = {}
_CACHE_MAX = 200


def _cache_key(records: list, lang: str) -> str:
    return hashlib.sha1(json.dumps([records, lang], sort_keys=True).encode()).hexdigest()


async def explain_prescriptions(prescriptions: list, lang: str = None) -> dict:
    """Explain what illness a prescription was treating and what each medicine
    helped with. Never raises; always returns a usable insights dict.

    Returns {"success": True, "insights": {...}, "provider": "groq"|"openrouter"|"knowledge_base"}."""
    lang = lang if lang in ("hi", "en") else "en"
    records = _records_for_prompt(prescriptions)
    if not records:
        return {"success": False, "error": "no_medicines"}

    key = _cache_key(records, lang)
    if key in _CACHE:
        return _CACHE[key]

    language = "Hindi (Devanagari script)" if lang == "hi" else "English"
    prompt = EXPLAIN_PROMPT.format(records=json.dumps(records, ensure_ascii=False), language=language)

    groq_key = os.getenv("GROQ_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    providers = []
    if groq_key:
        providers.append(("groq", lambda: _call_groq_text(prompt, groq_key)))
    if openrouter_key:
        providers.append(("openrouter", lambda: _call_openrouter_text(prompt, openrouter_key)))

    result = None
    for name, call in providers:
        try:
            insights = _parse_explanation(call(), prescriptions, lang)
            if insights is None:
                print(f"[rx-insights] {name} returned an invalid result. Trying next option.")
                continue
            result = {"success": True, "insights": insights, "provider": name}
            break
        except Exception as e:
            print(f"[rx-insights] {name} error: {e}. Trying next option.")

    if result is None:
        if not providers:
            print("[rx-insights] No LLM API key set. Using knowledge-base fallback.")
        else:
            print("[rx-insights] All LLM providers failed. Using knowledge-base fallback.")
        result = {"success": True, "insights": demo_explain(prescriptions, lang), "provider": "knowledge_base"}

    if len(_CACHE) >= _CACHE_MAX:
        _CACHE.clear()
    _CACHE[key] = result
    return result
