import json

import pytest

import triage
from triage import _apply_safety_net, _parse_llm_text, _validate_llm_result, demo_triage, detect_language

from .triage_cases import CASES

REQUIRED = set(triage.REQUIRED_FIELDS) | {"care_advice", "detectedLanguage"}


@pytest.mark.parametrize("text,expected", CASES, ids=[c[0][:40] for c in CASES])
def test_labelled_risk_levels(text, expected):
    r = demo_triage(text)
    assert r["risk_level"] == expected, f"{text!r} -> {r['risk_level']} {r['emergency_flags'] or r['symptoms']}"
    assert r["is_emergency"] == (expected == "CRITICAL")
    assert REQUIRED <= set(r)


def test_word_boundaries_avoid_false_alarms():
    assert demo_triage("benefits of yoga")["risk_level"] == "LOW"       # 'fits'
    assert demo_triage("my teacher is strict")["risk_level"] == "LOW"   # 'ache'
    assert demo_triage("painting is fun")["risk_level"] == "LOW"        # 'pain'


def test_negation_does_not_cross_clauses():
    assert demo_triage("no fever, but chest pain")["risk_level"] == "CRITICAL"
    assert demo_triage("bukhar nahi hai lekin seene mein dard hai")["risk_level"] == "CRITICAL"


def test_language_detection_and_care_language():
    assert detect_language("mujhe bukhar hai") == "hi"
    assert detect_language("सीने में दर्द") == "hi"
    assert detect_language("I have a headache") == "en"
    assert demo_triage("मुझे बुखार है")["care_advice"][0].startswith("अगले")
    assert demo_triage("mujhe bukhar hai", care_lang="en")["care_advice"][0].startswith("See a doctor")


def test_bad_air_quality_adds_note_for_respiratory_only():
    bad = {"aqi": 320, "band": "Very Poor"}
    with_note = demo_triage("I have a bad cough", air_quality=bad)["care_advice"]
    assert any("AQI 320" in c for c in with_note)
    assert not any("AQI" in c for c in demo_triage("my knee hurts", air_quality=bad)["care_advice"])
    assert not any("AQI" in c for c in demo_triage("I have a bad cough", air_quality={"aqi": 80})["care_advice"])


# --- LLM output handling -------------------------------------------------------------

def test_safety_net_escalates_missed_emergency():
    llm = {"risk_level": "LOW", "is_emergency": False, "emergency_flags": [], "symptoms": ["discomfort"]}
    out = _apply_safety_net(dict(llm), "seene mein bahut dard ho raha hai")
    assert out["risk_level"] == "CRITICAL" and out["is_emergency"] and "CHEST PAIN" in out["emergency_flags"]


def test_safety_net_never_downgrades():
    llm = {"risk_level": "CRITICAL", "is_emergency": True, "emergency_flags": ["SEPSIS"]}
    out = _apply_safety_net(dict(llm), "I feel okay today")
    assert out["risk_level"] == "CRITICAL" and out["emergency_flags"] == ["SEPSIS"]


def test_validate_coerces_messy_llm_json():
    raw = {"risk_level": " high ", "is_emergency": "false", "symptoms": "fever", "emergency_flags": None,
           "recommended_action": "", "medical_summary": None}
    out = _validate_llm_result(raw, "fever", "en", "en")
    assert out["risk_level"] == "HIGH" and out["is_emergency"] is False
    assert out["symptoms"] == ["fever"] and out["emergency_flags"] == []
    assert out["recommended_action"] and out["medical_summary"] and out["care_advice"]


def test_validate_rejects_unknown_risk():
    assert _validate_llm_result({"risk_level": "SEVERE"}, "x", "en", "en") is None
    assert _validate_llm_result(["not", "a", "dict"], "x", "en", "en") is None


def test_parse_extracts_json_from_chatty_reply():
    reply = "Sure! Here is the triage:\n```json\n" + json.dumps({"risk_level": "MODERATE", "symptoms": ["cough"]}) + "\n```"
    assert _parse_llm_text(reply, "cough", "en", "en")["risk_level"] == "MODERATE"
    with pytest.raises(ValueError):
        _parse_llm_text("I cannot help with that.", "x", "en", "en")
