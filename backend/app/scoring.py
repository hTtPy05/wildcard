from typing import Dict, Any, List, Optional


DEFAULT_WEIGHTS = {
    "severity": 0.35,
    "likelihood": 0.25,
    "breadth": 0.20,
    "irreversibility": 0.10,
    "time_sensitivity": 0.10,
}


def calculate_impact(
    sub_scores: Dict[str, Any],
    weights: Optional[Dict[str, float]] = None,
) -> float:
    """
    Computes Impact on a 0 to 100 scale based on weighted sub-scores.
    formula: 100 * (0.35*sev + 0.25*lik + 0.20*brd + 0.10*irr + 0.10*time)
    """
    w = weights or DEFAULT_WEIGHTS
    
    # Normalize weights so they sum to 1.0 if custom weights are passed
    total_w = sum(w.values())
    if total_w <= 0:
        w = DEFAULT_WEIGHTS
        total_w = sum(w.values())
    
    sev = float(sub_scores.get("severity", 0.5))
    lik = float(sub_scores.get("likelihood", 0.5))
    brd = float(sub_scores.get("breadth", 0.5))
    irr = float(sub_scores.get("irreversibility", 0.5))
    tim = float(sub_scores.get("time_sensitivity", 0.5))
    
    # Bound each between 0.0 and 1.0
    sev = max(0.0, min(1.0, sev))
    lik = max(0.0, min(1.0, lik))
    brd = max(0.0, min(1.0, brd))
    irr = max(0.0, min(1.0, irr))
    tim = max(0.0, min(1.0, tim))
    
    raw_impact = (
        (w.get("severity", 0.35) * sev) +
        (w.get("likelihood", 0.25) * lik) +
        (w.get("breadth", 0.20) * brd) +
        (w.get("irreversibility", 0.10) * irr) +
        (w.get("time_sensitivity", 0.10) * tim)
    ) / total_w
    
    return round(raw_impact * 100.0, 1)


def calculate_confidence(
    evidence: List[Dict[str, Any]],
    agreement_bonus: bool = False,
) -> float:
    """
    Computes Confidence in [0.0, 1.0] from:
    1. Evidence count (more evidence items increase confidence)
    2. Directness (text_span or column_stat or node is higher than inference)
    3. Agreement between deterministic rule checks and LLM reasoning (+0.10 bonus)
    """
    if not evidence:
        return 0.20  # Minimum confidence floor when evidence is sparse
    
    directness_points = 0.0
    for item in evidence:
        kind = item.get("kind", "")
        locator = item.get("locator", "")
        excerpt = item.get("excerpt", "")
        
        # Directness scores: verbatim quote / computed stat / workflow node
        if kind in ("column_stat", "node"):
            directness_points += 0.35
        elif kind == "text_span" and "offset:" in locator and len(excerpt) > 10:
            directness_points += 0.35
        else:
            directness_points += 0.15
            
    # Normalize directness points (capped at 0.70)
    base_confidence = min(0.70, directness_points)
    
    # Evidence count bonus: each item adds 0.08, capped at 0.20
    count_bonus = min(0.20, len(evidence) * 0.08)
    
    # Agreement bonus: 0.10 if deterministic analyzer corroborates LLM finding
    rule_bonus = 0.10 if agreement_bonus else 0.0
    
    total = base_confidence + count_bonus + rule_bonus
    # Bound between 0.1 and 1.0
    return round(max(0.1, min(1.0, total)), 2)


def calculate_priority(impact: float, confidence: float) -> float:
    """
    priority = impact * (0.5 + 0.5 * confidence)
    """
    return round(impact * (0.5 + 0.5 * confidence), 1)


def determine_tier(impact: float) -> str:
    """
    Tiers:
    Critical: 75 and above
    High: 55 to 74
    Medium: 35 to 54
    Low: below 35
    """
    if impact >= 75.0:
        return "Critical"
    elif impact >= 55.0:
        return "High"
    elif impact >= 35.0:
        return "Medium"
    else:
        return "Low"


def score_finding(
    finding_data: Dict[str, Any],
    weights: Optional[Dict[str, float]] = None,
    agreement_bonus: bool = False,
) -> Dict[str, Any]:
    """
    Calculates impact, confidence, priority, and tier for a finding.
    """
    sub_scores = finding_data.get("sub_scores", {})
    evidence = finding_data.get("evidence", [])
    
    impact = calculate_impact(sub_scores, weights)
    confidence = calculate_confidence(evidence, agreement_bonus)
    priority = calculate_priority(impact, confidence)
    tier = determine_tier(impact)
    
    finding_data["impact"] = impact
    finding_data["confidence"] = confidence
    finding_data["priority"] = priority
    finding_data["tier"] = tier
    return finding_data
