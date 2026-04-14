from typing import Dict, List, Optional

SUPPORTED_THREADS = {
    "sleep_rest",
    "work_study_routine",
    "physical_activity",
    "meals_regularity",
    "daily_structure",
}

DEFAULT_THREAD_ORDER = [
    "sleep_rest",
    "work_study_routine",
    "daily_structure",
    "meals_regularity",
    "physical_activity",
]

THREAD_LABELS = {
    "sleep_rest": "sleep",
    "work_study_routine": "work/study",
    "physical_activity": "physical activity",
    "meals_regularity": "meals",
    "daily_structure": "routine",
}

SAME_THREAD_CLARIFICATION_QUESTIONS = {
    "sleep_rest": "Do you think tiredness or lack of rest is the main thing affecting how the day feels?",
    "work_study_routine": "Does it feel like work or study pressure is the main thing dragging the day down?",
    "daily_structure": "Does it feel more like the day has lacked structure or consistency?",
    "meals_regularity": "Do you think eating irregularly has been part of why the day felt off?",
    "physical_activity": "Do you think low movement or activity has played a noticeable part in how you’ve felt?",
}


def _normalize_thread(thread: Optional[str]) -> Optional[str]:
    if not thread:
        return None
    return thread if thread in SUPPORTED_THREADS else None


def _normalize_tried_threads(tried_threads: List[str]) -> List[str]:
    normalized: List[str] = []
    for thread in tried_threads:
        if thread in SUPPORTED_THREADS and thread not in normalized:
            normalized.append(thread)
    return normalized


def _candidate_threads_from_themes(themes: List[str]) -> List[str]:
    candidates: List[str] = []

    for theme in themes:
        if theme in SUPPORTED_THREADS and theme not in candidates:
            candidates.append(theme)

    for fallback_thread in DEFAULT_THREAD_ORDER:
        if fallback_thread not in candidates:
            candidates.append(fallback_thread)

    return candidates


def _get_next_untried_thread(
    themes: List[str],
    tried_threads: List[str],
    excluded_threads: Optional[List[str]] = None,
) -> Optional[str]:
    excluded = set(excluded_threads or [])
    candidates = _candidate_threads_from_themes(themes)

    for thread in candidates:
        if thread in tried_threads:
            continue
        if thread in excluded:
            continue
        return thread

    return None


def _build_compare_question(thread_a: str, thread_b: str) -> str:
    label_a = THREAD_LABELS.get(thread_a, thread_a)
    label_b = THREAD_LABELS.get(thread_b, thread_b)
    return (
        f"Sounds like it might be a mix between {label_a} and {label_b} — "
        f"which feels more like the main issue right now?"
    )


def _build_same_thread_question(selected_thread: Optional[str]) -> str:
    if selected_thread and selected_thread in SAME_THREAD_CLARIFICATION_QUESTIONS:
        return SAME_THREAD_CLARIFICATION_QUESTIONS[selected_thread]
    return "Which area feels most like the main issue right now?"


def resolve_thread(
    selected_thread: Optional[str],
    reaction: str,
    redirected_thread: Optional[str],
    themes: List[str],
    tried_threads: List[str],
) -> Dict:
    selected_thread = _normalize_thread(selected_thread)
    redirected_thread = _normalize_thread(redirected_thread)
    tried_threads = _normalize_tried_threads(tried_threads)

    if selected_thread and selected_thread not in tried_threads:
        current_tried = tried_threads.copy()
    else:
        current_tried = tried_threads.copy()

    candidates = _candidate_threads_from_themes(themes)
    alternatives = [
        thread
        for thread in candidates
        if thread != selected_thread and thread not in current_tried
    ]

    result: Dict = {
        "resolved_thread": None,
        "next_thread": selected_thread,
        "resolved": False,
        "resolution_status": "needs_clarification",
        "next_question": None,
        "tried_threads": current_tried,
        "notes": [],
    }

    if reaction == "agree":
        if selected_thread:
            result["resolved_thread"] = selected_thread
            result["next_thread"] = selected_thread
            result["resolved"] = True
            result["resolution_status"] = "confirmed"
            result["notes"].append("User agreed with the current thread.")
            return result

        fallback_thread = _get_next_untried_thread(themes, current_tried)
        result["next_thread"] = fallback_thread
        result["resolution_status"] = "needs_clarification"
        result["next_question"] = "Which area feels closest to the main issue right now?"
        result["notes"].append("No valid selected thread was available, so clarification is needed.")
        return result

    if reaction == "reject":
        if selected_thread and selected_thread not in current_tried:
            current_tried.append(selected_thread)

        next_thread = _get_next_untried_thread(
            themes=themes,
            tried_threads=current_tried,
            excluded_threads=[selected_thread] if selected_thread else [],
        )

        result["tried_threads"] = current_tried
        result["next_thread"] = next_thread
        result["resolved_thread"] = None
        result["resolved"] = False

        if next_thread:
            result["resolution_status"] = "retry_with_new_thread"
            result["notes"].append("Current thread was rejected; moving to the next untried thread.")
        else:
            result["resolution_status"] = "needs_clarification"
            result["next_question"] = "None of those quite fit so far — which area feels closest to the main issue?"
            result["notes"].append("Current thread was rejected and no untried thread remained.")
        return result

    if reaction == "redirect":
        if redirected_thread:
            result["resolved_thread"] = redirected_thread
            result["next_thread"] = redirected_thread
            result["resolved"] = True
            result["resolution_status"] = "confirmed"
            result["notes"].append("User redirected to another supported thread.")
            return result

        result["resolution_status"] = "needs_clarification"
        result["next_question"] = "That sounds like it may be pointing somewhere else — which area feels closer: sleep, work/study, routine, meals, or activity?"
        result["notes"].append("Redirect was detected, but no supported redirected thread was available.")
        return result

    if reaction == "unsure":
        if selected_thread and not alternatives:
            result["next_thread"] = selected_thread
            result["resolution_status"] = "needs_clarification"
            result["next_question"] = _build_same_thread_question(selected_thread)
            result["notes"].append("User was unsure, but there was no strong alternative thread available.")
            return result

        if selected_thread and alternatives:
            compare_thread = alternatives[0]
            result["next_thread"] = selected_thread
            result["resolution_status"] = "needs_clarification"
            result["next_question"] = _build_compare_question(selected_thread, compare_thread)
            result["notes"].append("User was unsure and there is at least one plausible alternative thread.")
            return result

        fallback_thread = _get_next_untried_thread(themes, current_tried)
        result["next_thread"] = fallback_thread
        result["resolution_status"] = "needs_clarification"
        result["next_question"] = "Which area feels most like the main issue right now?"
        result["notes"].append("User was unsure and no valid selected thread was available.")
        return result

    result["next_thread"] = selected_thread
    result["resolution_status"] = "needs_clarification"
    result["next_question"] = "I’m not fully sure which direction to take yet — which area feels most like the main issue right now?"
    result["notes"].append("Unknown reaction value; defaulted to clarification.")
    return result