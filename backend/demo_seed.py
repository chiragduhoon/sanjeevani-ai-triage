"""Demo seed data so the doctor dashboard looks alive during a live pitch.

These are realistic, pre-triaged patient records in exactly the same shape the
/triage endpoint produces, so a seeded patient is indistinguishable from a real
submission. Used to populate an empty queue on startup and to power a one-click
"reset demo" so you can re-run the demo cleanly between pitches.
"""
from datetime import datetime, timedelta


def _record(minutes_ago, patient_id, name, transcript, result, status="WAITING"):
    ts = datetime.now() - timedelta(minutes=minutes_ago)
    return {
        "type": "triage_result",
        "transcript": transcript,
        "time": ts.strftime("%H:%M:%S"),
        "queuedAt": ts.isoformat(),
        "queueStatus": status,
        "patientName": name,
        "patientId": patient_id,
        **result,
    }


def demo_patients():
    """A spread of risk levels and languages that tells the story at a glance.
    Deliberately NO pre-seeded CRITICAL patient — the critical case should only
    appear when it's triggered live during the demo, so it stands out."""
    return [
        _record(
            5, "PRIYA-001", "Priya Verma",
            "I've had a very high fever and severe body pain since last night",
            {
                "symptoms": ["fever", "severe pain"],
                "risk_level": "HIGH",
                "is_emergency": False,
                "emergency_flags": [],
                "recommended_action": "Seek urgent medical attention within 24 hours.",
                "medical_summary": "HIGH: Patient presents with high fever and severe body pain. Requires prompt medical evaluation.",
                "detectedLanguage": "en",
            },
        ),
        _record(
            11, "RAHUL-001", "Rahul Singh",
            "thoda sir dard aur khansi hai do din se",
            {
                "symptoms": ["headache", "cough"],
                "risk_level": "MODERATE",
                "is_emergency": False,
                "emergency_flags": [],
                "recommended_action": "Follow up with primary care physician.",
                "medical_summary": "MODERATE: Patient reports headache and cough. Recommend primary care evaluation.",
                "detectedLanguage": "hi",
            },
        ),
        _record(
            18, "MEERA-001", "Meera Nair",
            "I have a mild sore throat and want to ask about diet",
            {
                "symptoms": ["general inquiry"],
                "risk_level": "LOW",
                "is_emergency": False,
                "emergency_flags": [],
                "recommended_action": "Monitor symptoms. Seek care if symptoms worsen.",
                "medical_summary": "LOW: Patient describes non-acute symptoms. Monitor and follow up as needed.",
                "detectedLanguage": "en",
            },
            status="TREATED",
        ),
    ]
