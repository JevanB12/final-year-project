def compute_day_score(
    *,
    tone: str,
    pos: int,
    neg: int,
    strain_detected: bool,
    strong_distress_detected: bool,
    intensity: float,
) -> int:
    score = 3

    if tone == "positive":
        score += 1
    elif tone == "negative":
        score -= 1

    if pos > neg:
        score += 1
    elif neg > pos:
        score -= 1

    if strain_detected:
        score -= 1

    if strong_distress_detected:
        score -= 1

    if tone == "positive" and intensity >= 0.5:
        score += 1
    elif tone == "negative" and intensity >= 0.5:
        score -= 1

    return max(1, min(5, score))