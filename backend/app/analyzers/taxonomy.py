from typing import Dict, Any, List

TAXONOMY_CATEGORIES = {
    "security_and_privacy": {
        "title": "Security and Privacy",
        "description": "Data protection, consent frameworks, PII exposure, and attack surfaces.",
        "checklist": [
            "Is user location or behavioral telemetry collected with explicit user consent?",
            "Are sensitive credentials and personal data encrypted at rest and in transit?",
            "Is there role-based access control (RBAC) governing internal operator data views?"
        ]
    },
    "legal_and_compliance": {
        "title": "Legal and Compliance",
        "description": "Regulatory mandates (GDPR, FERPA, DPDP), terms of service, and consumer protections.",
        "checklist": [
            "Are refund, cancellation, and consumer dispute resolution workflows formalized?",
            "Does data processing adhere to student privacy or financial compliance standards?",
            "Are third-party vendor terms compliant with data sharing obligations?"
        ]
    },
    "budget_and_timeline": {
        "title": "Budget and Timeline",
        "description": "Financial runway realism, paid API operational expenditures, and delivery timelines.",
        "checklist": [
            "Do pay-as-you-go third-party API costs (e.g. Google Maps) fit within allocated budget?",
            "Is the delivery schedule achievable given team headcount and technical scope?",
            "Has emergency contingency budget been set aside for operational overages?"
        ]
    },
    "scalability_and_capacity": {
        "title": "Scalability and Capacity",
        "description": "Concurrency limits, physical courier throughput, cold start dynamics, and traffic peaks.",
        "checklist": [
            "Can courier fleet capacity fulfill stated peak order throughput within the promised SLA?",
            "How does the platform handle the cold-start problem (sparse merchant/inventory supply)?",
            "Can the backend scale during lunch and dinner rush hours without latency degradation?"
        ]
    },
    "data_quality_and_bias": {
        "title": "Data Quality and Bias",
        "description": "Feature leakage, label integrity, missingness, class skew, and demographic representation.",
        "checklist": [
            "Are future outcome labels inadvertently leaking into inference features?",
            "Is missingness distributed non-randomly across critical behavioral variables?",
            "Is the minority target class sufficiently represented to avoid trivial null models?"
        ]
    },
    "user_adoption": {
        "title": "User Adoption",
        "description": "User prerequisites, digital access constraints, device capabilities, and network stability.",
        "checklist": [
            "Does the plan assume all target users possess modern smartphones and continuous high-speed data?",
            "What is the fallback when users have poor cellular coverage in dorm basements?",
            "Is the user onboarding journey frictionless for first-time cafeteria patrons?"
        ]
    },
    "dependencies_and_vendors": {
        "title": "Dependencies and Vendors",
        "description": "External API dependencies, payment gateway reliability, and third-party logistics.",
        "checklist": [
            "What happens when third-party mapping or SMS APIs experience an outage?",
            "Are payment gateway webhooks idempotent and resilient to dropped packets?",
            "Is there single-vendor lock-in for mission-critical logistics or compute?"
        ]
    },
    "ethics": {
        "title": "Ethics & Fairness",
        "description": "Algorithmic fairness, disparate impact on student sub-groups, and worker welfare.",
        "checklist": [
            "Are delivery couriers burdened with dangerous speed incentives to meet tight SLAs?",
            "Does the student risk model penalize disadvantaged or working students unfairly?",
            "Is algorithmic decision-making explainable to end users and academic counselors?"
        ]
    },
    "operations_and_maintenance": {
        "title": "Operations and Maintenance",
        "description": "Incident response, customer support, refunds, and daily vendor management.",
        "checklist": [
            "Who handles student food complaints, spills, or wrong item packaging in real time?",
            "Is there a dedicated operator for daily menu synchronization and stockout management?",
            "Are physical courier assets (e.g. electric bikes, batteries) maintained and insured?"
        ]
    },
    "failure_and_recovery": {
        "title": "Failure and Recovery",
        "description": "Disaster recovery, manual overrides, graceful degradation, and rollback paths.",
        "checklist": [
            "What happens if payment succeeds at the bank but the merchant kitchen app is offline?",
            "Can orders be manually cancelled and refunded by human support staff?",
            "Is there an automatic fallback when estimated courier delivery time exceeds the SLA?"
        ]
    }
}
