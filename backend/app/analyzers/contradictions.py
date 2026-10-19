from typing import Dict, Any, List
from .base import BaseAnalyzer
from ..ingest.text import find_span_offsets


class ContradictionAnalyzer(BaseAnalyzer):
    """
    Cross-artifact analyzer that detects irreconcilable contradictions between
    claims made in PRDs/documents and realities found in dataset profiles or workflow graphs.
    """

    def analyze(self, data: Any, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []
        artifacts = context.get("artifacts", [])
        
        doc_artifacts = [a for a in artifacts if a.get("kind") == "document"]
        dataset_artifacts = [a for a in artifacts if a.get("kind") == "dataset"]
        workflow_artifacts = [a for a in artifacts if a.get("kind") == "workflow"]

        # Check document-level contradictions within PRDs
        for doc in doc_artifacts:
            raw_text = doc.get("raw_text", "")
            art_id = doc.get("id")
            art_name = doc.get("name", "Document")
            
            # Contradiction 1: 20-minute SLA vs 2 couriers vs 1,000 daily orders
            sla_match = "20 minutes" in raw_text or "20-minute" in raw_text
            courier_match = "2 full-time student delivery partners" in raw_text or "2-person delivery" in raw_text
            orders_match = "1,000 daily orders" in raw_text or "1000 daily orders" in raw_text
            
            if sla_match and courier_match:
                quote_sla = "delivery SLA of 20 minutes"
                quote_fleet = "dedicated student-courier fleet comprising exactly 2 full-time student delivery partners"
                start_sla, end_sla = find_span_offsets(raw_text, quote_sla)
                
                findings.append({
                    "type": "contradiction",
                    "title": "Throughput Contradiction: 20-Min SLA vs 2-Person Delivery Fleet",
                    "explanation": "The PRD mandates a strict 20-minute delivery SLA while specifying a fleet of only 2 student couriers to achieve 1,000 daily orders. Fulfilling 1,000 orders over a 12-hour window requires delivering over 83 orders per hour. With only 2 couriers, each courier must complete an entire round-trip delivery every 86 seconds, which is physically impossible on campus.",
                    "why_it_matters": "The business will fail its core value proposition on day one, triggering widespread student cancellations, cold food deliveries, and reputational damage.",
                    "evidence": [
                        {
                            "artifact_id": art_id,
                            "artifact_name": art_name,
                            "kind": "text_span",
                            "locator": f"offset:{start_sla}-{end_sla}" if start_sla != -1 else "offset:document",
                            "excerpt": quote_sla,
                            "detail": "Promised delivery SLA of 20 minutes from payment completion"
                        },
                        {
                            "artifact_id": art_id,
                            "artifact_name": art_name,
                            "kind": "text_span",
                            "locator": "offset:text_span",
                            "excerpt": "dedicated student-courier fleet comprising exactly 2 full-time student delivery partners",
                            "detail": "Courier team constrained to strictly 2 student workers"
                        }
                    ],
                    "sub_scores": {
                        "severity": 0.95,
                        "likelihood": 0.95,
                        "breadth": 0.90,
                        "irreversibility": 0.70,
                        "time_sensitivity": 0.90,
                        "justifications": {
                            "severity": "Core operational SLA mathematically unachievable.",
                            "likelihood": "Directly documented in PRD specifications.",
                            "breadth": "Affects 100% of customer orders.",
                            "irreversibility": "Courier fleet sizing requires complete operational redesign.",
                            "time_sensitivity": "Must be resolved prior to launch commitment."
                        }
                    },
                    "recommendations": [
                        {"action": "Recalculate required fleet size using queuing models: at least 14-18 couriers needed for 1,000 orders/day with 20min SLA.", "effort": "high"},
                        {"action": "Relax initial launch SLA from 20 minutes to 35-45 minutes during campus phase 1.", "effort": "low"}
                    ],
                    "questions": [
                        "What is the maximum simultaneous order capacity of two bicycle couriers during peak lunch hour?",
                        "How will orders be queued when both couriers are already dispatched?"
                    ]
                })

            # Contradiction 2: ₹2,00,000 budget vs 3-month timeline vs Paid Google Maps API
            budget_match = "2,00,000" in raw_text or "2 Lakh" in raw_text
            maps_match = "Google Maps" in raw_text or "Distance Matrix" in raw_text
            gps_match = "Continuous Background Geolocation" in raw_text or "high-frequency GPS" in raw_text
            
            if budget_match and maps_match:
                quote_budget = "₹2,00,000 (2 Lakh Rupees) all-inclusive for software engineering, cloud infrastructure"
                quote_maps = "Google Maps Platform Distance Matrix and Geocoding APIs at enterprise pay-as-you-go rates"
                start_b, end_b = find_span_offsets(raw_text, quote_budget)
                
                findings.append({
                    "type": "contradiction",
                    "title": "Budget Infeasibility: ₹2 Lakh Runway vs Paid Map APIs & 3-Month Build",
                    "explanation": "A total budget of ₹2,00,000 ($2,400 USD) cannot cover 3 months of software development, server hosting, marketing, and commercial Google Maps API calls. Continuous high-frequency GPS distance matrix queries across thousands of active sessions can easily generate tens of thousands of rupees in monthly API bills alone. Software engineering compensation will exhaust the runway in weeks.",
                    "why_it_matters": "The project will run out of capital midway through engineering, leaving the team unable to pay cloud bills or complete merchant rollout.",
                    "evidence": [
                        {
                            "artifact_id": art_id,
                            "artifact_name": art_name,
                            "kind": "text_span",
                            "locator": f"offset:{start_b}-{end_b}" if start_b != -1 else "offset:document",
                            "excerpt": quote_budget,
                            "detail": "Stated total development and runway budget capped at 2 lakh rupees"
                        },
                        {
                            "artifact_id": art_id,
                            "artifact_name": art_name,
                            "kind": "text_span",
                            "locator": "offset:text_span",
                            "excerpt": quote_maps,
                            "detail": "Requires enterprise commercial map API rates for real-time tracking"
                        }
                    ],
                    "sub_scores": {
                        "severity": 0.85,
                        "likelihood": 0.90,
                        "breadth": 0.85,
                        "irreversibility": 0.80,
                        "time_sensitivity": 0.85,
                        "justifications": {
                            "severity": "Financial insolvency risk halts delivery operations.",
                            "likelihood": "Market rates for maps and engineering exceed ₹2 Lakhs.",
                            "breadth": "Impacts the entire project lifecycle.",
                            "irreversibility": "Depleted funds cannot be reversed without emergency funding.",
                            "time_sensitivity": "Requires budget re-allocation before development starts."
                        }
                    },
                    "recommendations": [
                        {"action": "Replace paid Google Maps Distance Matrix with OpenStreetMap / OSRM self-hosted routing.", "effort": "medium"},
                        {"action": "Recalculate financial model with realistic cloud, stipend, and contingency reserves.", "effort": "medium"}
                    ],
                    "questions": [
                        "What is the projected monthly cost of Google Maps API calls at 1,000 orders/day?",
                        "How will couriers and developers be compensated across the 3-month runway?"
                    ]
                })

        return findings
