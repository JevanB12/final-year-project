from typing import Dict, List

from lexicons import ongoing_cues, present_cues, thread_to_future_lane


NON_ACTIONABLE_THEMES = {"social"}

FATIGUE_WORDS = {"tired", "exhausted", "drained", "worn", "fatigue"}
WORK_IMPACT_PHRASES = {
    "hard to study",
    "hard to focus",
    "hard to get things done",
    "struggling to study",
    "struggling to focus",
    "can't get things done",
    "cant get things done",
    "making it hard to study",
    "making it hard to focus",
    "making it hard to get things done",
}
ROUTINE_PRESSURE_PHRASES = {
    "all over the place",
    "one thing after another",
    "nonstop",
    "packed",
    "busy",
    "no time",
    "no free time",
}


def _count_present_cues(text: str) -> float:
    score = 0.0
    for cue in present_cues:
        if cue in text:
            score += 0.4
    return score


def _count_ongoing_cues(text: str) -> float:
    score = 0.0
    for cue in ongoing_cues:
        if cue in text:
            score += 0.5
    return score


def _has_any_phrase(text: str, phrases: set[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def build_thread_evidence(text: str, themes: List[str], positive_points: List[str], negative_points: List[str]) -> Dict[str, dict]:
    evidence = {}

    for theme in themes:
        if theme in NON_ACTIONABLE_THEMES:
            continue

        base_score = 1.0
        ongoing_score = _count_ongoing_cues(text)
        present_score = _count_present_cues(text)
        burden_score = 0.0
        resolved_penalty = 0.0
        special_boost = 0.0

        # Positive-only physical activity should not steal focus
        if theme == "physical_activity":
            if any(p in positive_points for p in {"good", "great", "good session", "felt good"}):
                resolved_penalty += 1.2

        # Strong fatigue thread
        if theme == "sleep_rest":
            if any(word in text.split() for word in FATIGUE_WORDS):
                burden_score += 1.5
            if "not enough sleep" in text or "not enough rest" in text:
                burden_score += 1.5
            if _has_any_phrase(text, WORK_IMPACT_PHRASES):
                # Main fix: tiredness causing difficulty should lean sleep/rest
                special_boost += 2.0

        # Work/study thread exists, but should lose to the root cause in fatigue-causing-work cases
        if theme == "work_study_routine":
            if any(word in text.split() for word in {"study", "work", "deadline", "assignment", "exam"}):
                burden_score += 1.0
            if _has_any_phrase(text, WORK_IMPACT_PHRASES):
                burden_score += 1.0
            if any(word in negative_points for word in {"stressed", "overwhelmed", "frustrated", "behind", "pressure"}):
                burden_score += 1.0
            if any(word in text.split() for word in FATIGUE_WORDS) and _has_any_phrase(text, WORK_IMPACT_PHRASES):
                # Small score only; work is impacted but not the main cause
                special_boost += 0.4

        # Daily structure should pick up busy/nonstop/routine issues
        if theme == "daily_structure":
            if _has_any_phrase(text, ROUTINE_PRESSURE_PHRASES):
                burden_score += 1.2
            if "routine" in text or "schedule" in text or "consistent" in text:
                burden_score += 0.8

        # Meals
        if theme == "meals_regularity":
            if any(word in text.split() for word in {"meal", "meals", "eat", "eating", "breakfast", "lunch", "dinner", "hungry"}):
                burden_score += 1.0
            if "not eating enough" in text or "not enough food" in text:
                burden_score += 1.2

        # Activity
        if theme == "physical_activity":
            if any(word in text.split() for word in {"walk", "run", "gym", "exercise", "training", "sports"}):
                burden_score += 0.6

        score = base_score + ongoing_score + present_score + burden_score + special_boost - resolved_penalty

        evidence[theme] = {
            "base_score": round(base_score, 2),
            "ongoing_score": round(ongoing_score, 2),
            "present_score": round(present_score, 2),
            "burden_score": round(burden_score, 2),
            "special_boost": round(special_boost, 2),
            "resolved_penalty": round(resolved_penalty, 2),
            "future_lane": thread_to_future_lane.get(theme),
        }

    return evidence


def score_threads(text: str, themes: List[str], positive_points: List[str], negative_points: List[str]) -> Dict[str, float]:
    evidence = build_thread_evidence(text, themes, positive_points, negative_points)
    return {
        theme: round(
            info["base_score"]
            + info["ongoing_score"]
            + info["present_score"]
            + info["burden_score"]
            + info["special_boost"]
            - info["resolved_penalty"],
            2,
        )
        for theme, info in evidence.items()
    }


def select_thread(scores: Dict[str, float]) -> str | None:
    if not scores:
        return None
    return max(scores, key=scores.get)


def get_future_lane(selected_thread: str | None) -> str | None:
    if not selected_thread:
        return None
    return thread_to_future_lane.get(selected_thread)
