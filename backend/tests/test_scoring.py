import pytest
from app.scoring import (
    calculate_impact,
    calculate_confidence,
    calculate_priority,
    determine_tier,
    score_finding,
    DEFAULT_WEIGHTS,
)


def test_calculate_impact_default_weights():
    # When all sub-scores are 1.0, impact should be 100.0
    sub_scores_max = {
        "severity": 1.0,
        "likelihood": 1.0,
        "breadth": 1.0,
        "irreversibility": 1.0,
        "time_sensitivity": 1.0,
    }
    assert calculate_impact(sub_scores_max) == 100.0

    # When all sub-scores are 0.0, impact should be 0.0
    sub_scores_min = {
        "severity": 0.0,
        "likelihood": 0.0,
        "breadth": 0.0,
        "irreversibility": 0.0,
        "time_sensitivity": 0.0,
    }
    assert calculate_impact(sub_scores_min) == 0.0

    # Specific mixed sub-scores:
    # 0.35*0.8 + 0.25*0.6 + 0.20*0.5 + 0.10*0.9 + 0.10*0.4
    # = 0.28 + 0.15 + 0.10 + 0.09 + 0.04 = 0.66 -> 66.0
    sub_scores_mixed = {
        "severity": 0.8,
        "likelihood": 0.6,
        "breadth": 0.5,
        "irreversibility": 0.9,
        "time_sensitivity": 0.4,
    }
    assert calculate_impact(sub_scores_mixed) == 66.0


def test_calculate_impact_custom_weights():
    sub_scores = {
        "severity": 1.0,
        "likelihood": 0.0,
        "breadth": 0.0,
        "irreversibility": 0.0,
        "time_sensitivity": 0.0,
    }
    # If custom weights assign 100% to severity
    custom_weights = {
        "severity": 1.0,
        "likelihood": 0.0,
        "breadth": 0.0,
        "irreversibility": 0.0,
        "time_sensitivity": 0.0,
    }
    assert calculate_impact(sub_scores, custom_weights) == 100.0


def test_determine_tier():
    assert determine_tier(85.0) == "Critical"
    assert determine_tier(75.0) == "Critical"
    assert determine_tier(74.9) == "High"
    assert determine_tier(55.0) == "High"
    assert determine_tier(54.9) == "Medium"
    assert determine_tier(35.0) == "Medium"
    assert determine_tier(34.9) == "Low"
    assert determine_tier(10.0) == "Low"


def test_calculate_confidence():
    # Direct evidence items should produce higher confidence
    direct_evidence = [
        {"kind": "column_stat", "locator": "column:attendance", "excerpt": "25% nulls"},
        {"kind": "node", "locator": "node:step_4", "excerpt": "unowned"},
    ]
    conf = calculate_confidence(direct_evidence, agreement_bonus=True)
    assert 0.70 <= conf <= 1.0

    # Empty evidence should return minimum base confidence
    assert calculate_confidence([]) == 0.20


def test_calculate_priority():
    impact = 80.0
    confidence = 0.8
    # priority = 80 * (0.5 + 0.5 * 0.8) = 80 * 0.9 = 72.0
    assert calculate_priority(impact, confidence) == 72.0


def test_score_finding_end_to_end():
    finding = {
        "title": "Test Finding",
        "sub_scores": {
            "severity": 0.9,
            "likelihood": 0.8,
            "breadth": 0.7,
            "irreversibility": 0.6,
            "time_sensitivity": 0.8,
        },
        "evidence": [
            {"kind": "column_stat", "locator": "column:label", "excerpt": "leakage detected"}
        ]
    }
    scored = score_finding(finding)
    assert "impact" in scored
    assert "confidence" in scored
    assert "priority" in scored
    assert "tier" in scored
    assert scored["tier"] in ["Critical", "High", "Medium", "Low"]
