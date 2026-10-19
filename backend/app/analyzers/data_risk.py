from typing import Dict, Any, List
from .base import BaseAnalyzer


class DataRiskAnalyzer(BaseAnalyzer):
    """
    Deterministic analyzer that audits dataset profiles for data quality,
    fairness, leakage, PII, temporal bias, and missingness risks.
    """

    def analyze(self, profile: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []
        artifact_id = context.get("artifact_id")
        artifact_name = context.get("artifact_name", "Dataset")
        
        row_count = profile.get("row_count", 0)
        col_count = profile.get("col_count", 0)
        duplicate_rows = profile.get("duplicate_rows", 0)
        duplicate_pct = profile.get("duplicate_row_pct", 0.0)
        columns = profile.get("columns", {})

        # 1. Duplicate Rows Check
        if duplicate_pct > 1.0 or duplicate_rows > 10:
            findings.append({
                "type": "data_risk",
                "title": f"Elevated Duplicate Records Detected ({duplicate_rows} rows)",
                "explanation": f"The dataset contains {duplicate_rows} exact duplicate rows ({duplicate_pct}% of total records). Duplicate data artificially inflates training confidence and skews cross-validation splits. This leads to data leakage between train and test sets.",
                "why_it_matters": "Models trained on duplicate rows memorize samples rather than generalizing patterns, causing severe over-optimistic evaluation metrics.",
                "evidence": [{
                    "artifact_id": artifact_id,
                    "artifact_name": artifact_name,
                    "kind": "column_stat",
                    "locator": "dataset:duplicates",
                    "excerpt": f"duplicate_rows={duplicate_rows} ({duplicate_pct}%)",
                    "detail": f"Found {duplicate_rows} identical rows out of {row_count} total entries"
                }],
                "sub_scores": {
                    "severity": 0.65,
                    "likelihood": 0.85,
                    "breadth": 0.60,
                    "irreversibility": 0.40,
                    "time_sensitivity": 0.70,
                    "justifications": {
                        "severity": "Data leakage alters generalization and evaluation.",
                        "likelihood": "Directly present in dataset.",
                        "breadth": "Affects all model training and test folds.",
                        "irreversibility": "Can be cleaned with deduplication filter.",
                        "time_sensitivity": "Must be resolved before model retraining."
                    }
                },
                "recommendations": [
                    {"action": "Deduplicate records using primary business keys before partitioning splits.", "effort": "low"},
                    {"action": "Verify upstream data pipeline ingestion idempotency.", "effort": "medium"}
                ],
                "questions": [
                    "Why are identical customer records being recorded multiple times?",
                    "Are duplicate rows caused by retry attempts in webhook ingestion?"
                ]
            })

        # Check each column
        for col_name, stats in columns.items():
            null_pct = stats.get("null_pct", 0.0)
            null_count = stats.get("null_count", 0)
            pii_signals = stats.get("pii_signals", [])
            leakage_signals = stats.get("leakage_signals", [])
            top_cats = stats.get("top_categories", {})
            col_type = stats.get("type", "unknown")

            # 2. High Missingness (>20%)
            if null_pct >= 20.0:
                findings.append({
                    "type": "data_risk",
                    "title": f"Critical Missingness in Column '{col_name}' ({null_pct}%)",
                    "explanation": f"Column '{col_name}' exhibits {null_pct}% missing values ({null_count} nulls out of {row_count} rows). Missingness above the 20% threshold impairs statistical significance and model convergence. Naive imputation will introduce severe systematic bias.",
                    "why_it_matters": "Crucial behavioral variables missing at this magnitude force models to guess or discard nearly a quarter of all observations.",
                    "evidence": [{
                        "artifact_id": artifact_id,
                        "artifact_name": artifact_name,
                        "kind": "column_stat",
                        "locator": f"column:{col_name}",
                        "excerpt": f"null_pct={null_pct}%, null_count={null_count}/{row_count}",
                        "detail": f"25% or greater data missingness in required feature {col_name}"
                    }],
                    "sub_scores": {
                        "severity": 0.70,
                        "likelihood": 0.90,
                        "breadth": 0.55,
                        "irreversibility": 0.50,
                        "time_sensitivity": 0.75,
                        "justifications": {
                            "severity": "High missingness drops substantial feature signal.",
                            "likelihood": "Directly observed in 100% of data partition.",
                            "breadth": f"Restricts utility of {col_name} across downstream models.",
                            "irreversibility": "Missing historical data cannot be retrospectively recaptured.",
                            "time_sensitivity": "Requires telemetry instrumentation fix immediately."
                        }
                    },
                    "recommendations": [
                        {"action": f"Audit upstream form/client logging to prevent missing {col_name} submissions.", "effort": "medium"},
                        {"action": "Implement missingness indicator flags and evaluate multiple imputation techniques.", "effort": "low"}
                    ],
                    "questions": [
                        f"Why is {col_name} omitted for {null_pct}% of the records?",
                        "Is attendance missing at random, or does absence correlate with unmonitored dropouts?"
                    ]
                })

            # 3. PII Detection (Email, SSN, Phone, etc.)
            if pii_signals:
                signal_desc = ", ".join(pii_signals)
                findings.append({
                    "type": "data_risk",
                    "title": f"Exposed Personally Identifiable Information in '{col_name}'",
                    "explanation": f"Column '{col_name}' contains plain-text personal identifying information (signals: {signal_desc}). Storing and processing unmasked student or customer identifiers violates privacy regulations like GDPR, FERPA, and DPDP. It also creates immediate breach liability.",
                    "why_it_matters": "Exposing personal contact emails or identifiers in analytical or ML datasets risks compliance penalties and identity compromise.",
                    "evidence": [{
                        "artifact_id": artifact_id,
                        "artifact_name": artifact_name,
                        "kind": "column_stat",
                        "locator": f"column:{col_name}",
                        "excerpt": f"sample={stats.get('sample_values', [''])[0]}, signals={signal_desc}",
                        "detail": f"Plaintext student email address pattern identified in column {col_name}"
                    }],
                    "sub_scores": {
                        "severity": 0.85,
                        "likelihood": 0.95,
                        "breadth": 0.80,
                        "irreversibility": 0.75,
                        "time_sensitivity": 0.90,
                        "justifications": {
                            "severity": "Severe regulatory non-compliance and privacy risk.",
                            "likelihood": "Verifiable in sample values.",
                            "breadth": "Impacts all individuals represented in the table.",
                            "irreversibility": "Breached identifiers cannot be un-leaked once distributed.",
                            "time_sensitivity": "Needs immediate masking before downstream consumption."
                        }
                    },
                    "recommendations": [
                        {"action": f"Hash or pseudonymize '{col_name}' using salted SHA-256 before storage.", "effort": "low"},
                        {"action": "Exclude personal communication handles from analytical model training views.", "effort": "low"}
                    ],
                    "questions": [
                        "Has student consent been collected to store direct email addresses for analytics?",
                        "Who has read permissions to the unmasked raw dataset?"
                    ]
                })

            # 4. Target Leakage Columns
            if leakage_signals or "copy" in col_name.lower() or "label" in col_name.lower():
                findings.append({
                    "type": "data_risk",
                    "title": f"Target Leakage Feature Identified: '{col_name}'",
                    "explanation": f"Column '{col_name}' displays high correlation or exact naming overlap with the target outcome variable. Such columns replicate the outcome label after the event has already transpired. Using this column produces illusory 100% test accuracy that collapses in production.",
                    "why_it_matters": "A model relying on post-outcome features fails completely when deployed on real-time unlabelled inference data.",
                    "evidence": [{
                        "artifact_id": artifact_id,
                        "artifact_name": artifact_name,
                        "kind": "column_stat",
                        "locator": f"column:{col_name}",
                        "excerpt": f"column={col_name}, values={stats.get('sample_values', [])[:3]}",
                        "detail": f"Exact replica or proxy of target label '{col_name}' available at inference"
                    }],
                    "sub_scores": {
                        "severity": 0.90,
                        "likelihood": 0.95,
                        "breadth": 0.70,
                        "irreversibility": 0.30,
                        "time_sensitivity": 0.80,
                        "justifications": {
                            "severity": "Completely invalidates machine learning model validity.",
                            "likelihood": "Feature directly exposes ground truth.",
                            "breadth": "Distorts all weights and feature importance rankings.",
                            "irreversibility": "Easily fixed by dropping column.",
                            "time_sensitivity": "Must be eliminated prior to model validation."
                        }
                    },
                    "recommendations": [
                        {"action": f"Immediately drop '{col_name}' from the training feature matrix.", "effort": "low"},
                        {"action": "Verify feature timestamps ensure values were known prior to the prediction horizon.", "effort": "medium"}
                    ],
                    "questions": [
                        f"Is '{col_name}' known prior to determining the student's final risk status?",
                        "How was this label duplicate created during ETL export?"
                    ]
                })

            # 5. Class Imbalance (minority class < 10%)
            if top_cats and len(top_cats) == 2 and ("is_at_risk" in col_name.lower() or "target" in col_name.lower() or "label" in col_name.lower() or stats.get("unique_count") == 2):
                min_cat, min_pct = min(top_cats.items(), key=lambda x: x[1])
                if min_pct < 10.0:
                    findings.append({
                        "type": "data_risk",
                        "title": f"Severe Class Imbalance in '{col_name}' ({min_pct}% Minority)",
                        "explanation": f"The minority class represents only {min_pct}% of observations in '{col_name}'. Standard cross-entropy optimization will converge on the trivial majority class predictor. Consequently, the model will fail to identify actual at-risk cases in production.",
                        "why_it_matters": "When at-risk students are only 6% of the population, a 94% accurate model can predict 'not at-risk' every time and miss 100% of students needing help.",
                        "evidence": [{
                            "artifact_id": artifact_id,
                            "artifact_name": artifact_name,
                            "kind": "column_stat",
                            "locator": f"column:{col_name}",
                            "excerpt": f"distribution={top_cats}, minority_share={min_pct}%",
                            "detail": f"Minority class '{min_cat}' comprises only {min_pct}% of the {row_count} total rows"
                        }],
                        "sub_scores": {
                            "severity": 0.80,
                            "likelihood": 0.85,
                            "breadth": 0.65,
                            "irreversibility": 0.50,
                            "time_sensitivity": 0.70,
                            "justifications": {
                                "severity": "Primary target class fails detection under standard loss functions.",
                                "likelihood": "Observed class split in ground truth data.",
                                "breadth": "Affects all model recall metrics.",
                                "irreversibility": "Requires re-sampling or cost-sensitive objective loss.",
                                "time_sensitivity": "Needs sampling strategy before architecture tuning."
                            }
                        },
                        "recommendations": [
                            {"action": "Use focal loss or class-weighted cross-entropy loss during training.", "effort": "low"},
                            {"action": "Evaluate PR-AUC and recall at fixed precision rather than ROC-AUC or raw accuracy.", "effort": "low"}
                        ],
                        "questions": [
                            "What is the operational cost of missing a true at-risk student versus a false alarm?",
                            "Should stratified oversampling (SMOTE) or threshold tuning be applied?"
                        ]
                    })

            # 6. Narrow Temporal Coverage / Single Period Bias
            if col_name.lower() in ("semester", "quarter", "term", "academic_year") and stats.get("unique_count") == 1:
                dominant_val = stats.get("dominant_category", "Single Period")
                findings.append({
                    "type": "data_risk",
                    "title": f"Single-Cohort Temporal Bias in '{col_name}' ({dominant_val})",
                    "explanation": f"Column '{col_name}' contains data exclusively from a single term: '{dominant_val}'. The dataset possesses zero longitudinal diversity across varying seasonal or academic conditions. Models trained on this cohort will fail when applied across different semesters or curriculum structures.",
                    "why_it_matters": "Performance in Fall 2024 may reflect specific course instructor grading curves or exam schedules that will not repeat in Spring or future years.",
                    "evidence": [{
                        "artifact_id": artifact_id,
                        "artifact_name": artifact_name,
                        "kind": "column_stat",
                        "locator": f"column:{col_name}",
                        "excerpt": f"unique_count=1, dominant_value='{dominant_val}' (100%)",
                        "detail": f"Entire dataset constrained to single academic period: {dominant_val}"
                    }],
                    "sub_scores": {
                        "severity": 0.70,
                        "likelihood": 0.80,
                        "breadth": 0.90,
                        "irreversibility": 0.60,
                        "time_sensitivity": 0.60,
                        "justifications": {
                            "severity": "Cohort-specific covariates will not transfer to future semesters.",
                            "likelihood": "Zero temporal variation present in source data.",
                            "breadth": "Affects all student predictions across upcoming cohorts.",
                            "irreversibility": "Requires collecting multi-year historic archives.",
                            "time_sensitivity": "Important before deploying model across full academic year."
                        }
                    },
                    "recommendations": [
                        {"action": "Enrich the training dataset with at least 3-4 consecutive past semesters.", "effort": "high"},
                        {"action": "Conduct out-of-time validation on subsequent terms before university rollout.", "effort": "medium"}
                    ],
                    "questions": [
                        "Does student study behavior or attendance differ significantly between Fall and Spring semesters?",
                        "Were grading policies in Fall 2024 impacted by unique campus events?"
                    ]
                })

        return findings
