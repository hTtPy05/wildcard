import pytest
import pandas as pd
from app.ingest.dataset import profile_dataset
from app.analyzers.data_risk import DataRiskAnalyzer


def test_data_risk_analyzer_detects_all_planted_risks():
    # Construct a DataFrame with all planted risks
    data = {
        "student_id": [f"STU-{i}" for i in range(100)],
        "student_email": [f"student{i}@university.edu" for i in range(100)],  # PII
        "final_result_label_copy": ["Passing"] * 94 + ["At-Risk"] * 6,       # Leakage
        "is_at_risk": [0] * 94 + [1] * 6,                                   # Class imbalance: 6% minority
        "attendance_rate": [85.0] * 75 + [None] * 25,                       # 25% missing
        "semester": ["Fall 2024"] * 100,                                    # Single semester
    }
    df = pd.DataFrame(data)
    profile = profile_dataset(df)
    
    analyzer = DataRiskAnalyzer()
    findings = analyzer.analyze(profile, {"artifact_id": 1, "artifact_name": "student_test.csv"})

    finding_types = [f["type"] for f in findings]
    finding_titles = " ".join([f["title"] for f in findings])

    # Assert that all finding types are data_risk
    assert all(t == "data_risk" for t in finding_types)
    assert len(findings) >= 5

    # Check that each planted issue is flagged with concrete evidence
    assert "Missingness in Column 'attendance_rate'" in finding_titles
    assert "Personally Identifiable Information in 'student_email'" in finding_titles
    assert "Target Leakage Feature Identified: 'final_result_label_copy'" in finding_titles
    assert "Class Imbalance in 'is_at_risk'" in finding_titles
    assert "Single-Cohort Temporal Bias in 'semester'" in finding_titles

    # Verify that every finding has at least one valid evidence item
    for f in findings:
        assert len(f["evidence"]) >= 1
        ev = f["evidence"][0]
        assert ev["kind"] == "column_stat"
        assert "column:" in ev["locator"] or "dataset:" in ev["locator"]
        assert len(ev["excerpt"]) > 0
