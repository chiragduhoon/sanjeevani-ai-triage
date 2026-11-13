"""Labelled sentences for the rule-based red-flag detector (`triage.demo_triage`).

Each case: (patient text, expected risk level). The detector is also the safety net
that escalates an LLM answer to CRITICAL, so CRITICAL recall is the number that matters most.
"""

CRITICAL = [
    # English
    "I have severe chest pain spreading to my left arm",
    "my chest hurts a lot",
    "tightness in my chest since an hour",
    "I can't breathe properly",
    "I am not able to breathe",
    "my father fell down and is not breathing",
    "she suddenly has facial drooping and slurred speech",
    "he passed out and is unresponsive",
    "my child swallowed poison",
    "he had fits last night",
    "there is severe bleeding from the wound",
    "my throat is closing after eating peanuts",
    "I have chest pain, not fever",
    "chest pain but no fever",
    "no fever, but I passed out this morning",
    # Hinglish
    "seene mein bahut dard ho raha hai",
    "dil ka daura pad gaya lagta hai",
    "saans nahi aa rahi",
    "saans lene mein dikkat ho rahi hai",
    "papa behosh ho gaye",
    "bacche ko mirgi ka daura aa raha hai",
    "usne zeher kha liya",
    # Hindi
    "सीने में बहुत दर्द हो रहा है",
    "सांस लेने में तकलीफ हो रही है",
    "वो बेहोश हो गए",
    "मुंह टेढ़ा हो गया है और बोलने में दिक्कत",
]

HIGH = [
    "I have high fever since two days",
    "mujhe tez bukhar hai",
    "I have been vomiting since morning",
    "mujhe bukhar nahi hai lekin ulti ho rahi hai",
    "I had an accident on my bike",
    "मुझे बुखार है",
]

MODERATE = [
    "I have a bad cough and cold",
    "severe headaches since morning",
    "I feel dizzy and weak",
    "my knee hurts when I walk",
    "sugar ki bimari hai",
    "no chest pain, just a mild cough",
    "seene mein dard nahi hai, bas khansi hai",
]

LOW = [
    "I want to know my appointment time",
    "my teacher said I look tired",
    "I take vitamins for their benefits",
    "I had a painting class and feel fine",
    "my chest does not hurt",
    "सीने में दर्द नहीं है",
    "I feel okay today",
]

CASES = [(t, "CRITICAL") for t in CRITICAL] + [(t, "HIGH") for t in HIGH] + \
        [(t, "MODERATE") for t in MODERATE] + [(t, "LOW") for t in LOW]
