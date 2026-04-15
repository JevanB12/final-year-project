from typing import Dict, List, Optional


THREAD_LABELS = {
    "work_study_routine": "work/study",
    "sleep_rest": "sleep",
    "daily_structure": "daily structure",
    "physical_activity": "physical activity",
    "meals_regularity": "meals",
}


THREAD_SOFT_PHRASES = {
    "work_study_routine": "how full-on things have been lately",
    "sleep_rest": "not really getting the chance to switch off properly",
    "daily_structure": "how your day has been flowing overall",
    "physical_activity": "your energy and movement through the day",
    "meals_regularity": "whether your meals have been a bit off",
}


def _dedupe(items: List[str]) -> List[str]:
    seen = set()
    ordered = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def _label(thread: Optional[str]) -> str:
    if not thread:
        return "none"
    return THREAD_LABELS.get(thread, thread)


def _soft_phrase(thread: Optional[str]) -> Optional[str]:
    if not thread:
        return None
    return THREAD_SOFT_PHRASES.get(thread, _label(thread))


def _candidate_threads(
    selected_thread: Optional[str],
    redirected_thread: Optional[str],
    themes: List[str],
    tried_threads: List[str],
) -> List[str]:
    candidates: List[str] = []

    if selected_thread:
        candidates.append(selected_thread)

    if redirected_thread and redirected_thread != selected_thread:
        candidates.append(redirected_thread)

    for theme in themes:
        if theme not in candidates and theme not in tried_threads:
            candidates.append(theme)

    return _dedupe(candidates)


def _pick_alternative(
    candidates: List[str],
    tried_threads: List[str],
    exclude: Optional[str] = None,
) -> Optional[str]:
    for candidate in candidates:
        if candidate != exclude and candidate not in tried_threads:
            return candidate
    return None


def _build_accept_response(resolved_thread: str) -> str:
    phrase = _soft_phrase(resolved_thread) or "that area"
    return (
        f"That makes sense. It does sound like {phrase} could be part of it. "
        "We can stay with that and narrow it down a bit more."
    )


def _build_reject_response(
    alternative_thread: Optional[str],
    original_thread: Optional[str],
) -> str:
    if alternative_thread:
        alt_phrase = _soft_phrase(alternative_thread) or "something else going on"
        return (
            "Alright, that’s useful to know. "
            f"Maybe it’s less about {_soft_phrase(original_thread) or 'that'} and more about {alt_phrase}. "
            "Does that feel any closer?"
        )

    return (
        "Alright, that’s useful to know. "
        "It might be something else going on then. "
        "We can take a step back and look at it a bit more openly."
    )


def _build_redirect_response(resolved_thread: str) -> str:
    phrase = _soft_phrase(resolved_thread) or "that side of things"
    return (
        f"Yeah, that makes sense. It may be more about {phrase}. "
        "We can shift focus there."
    )


def _build_unsure_response(
    primary_thread: Optional[str],
    secondary_thread: Optional[str],
) -> str:
    primary_phrase = _soft_phrase(primary_thread)
    secondary_phrase = _soft_phrase(secondary_thread)

    if primary_phrase and secondary_phrase:
        return (
            "Yeah, that makes sense — it can be hard to pin down exactly what’s behind it. "
            f"It could be something around {primary_phrase}, "
            f"or maybe {secondary_phrase}. "
            "Does either of those feel like it fits a bit, or is it still unclear?"
        )

    if primary_phrase:
        return (
            "Yeah, that makes sense — it can be hard to pin down exactly what’s behind it. "
            f"It could be something around {primary_phrase}, "
            "but it might also be something else in the background. "
            "Does that feel close, or not really?"
        )

    return (
        "Yeah, that makes sense — it can be hard to pin down exactly what’s behind it straight away. "
        "We can keep it open and narrow it down gently from here."
    )


def resolve_thread(
    selected_thread: Optional[str],
    reaction: str,
    redirected_thread: Optional[str] = None,
    themes: Optional[List[str]] = None,
    tried_threads: Optional[List[str]] = None,
) -> Dict:
    themes = themes or []
    tried_threads = tried_threads or []

    candidates = _candidate_threads(
        selected_thread=selected_thread,
        redirected_thread=redirected_thread,
        themes=themes,
        tried_threads=tried_threads,
    )

    reaction = (reaction or "").strip().lower()

    selected_history = [selected_thread] if selected_thread else []
    updated_tried_threads = _dedupe([*tried_threads, *selected_history])

    if reaction in {"accept", "agree"}:
        resolved_thread = selected_thread
        return {
            "resolved": True,
            "resolved_thread": resolved_thread,
            "next_thread": resolved_thread,
            "resolution_status": "resolved",
            "next_question": None,
            "tried_threads": updated_tried_threads,
            "reaction_status": "accepted",
            "response": _build_accept_response(resolved_thread) if resolved_thread else (
                "That makes sense. We can stay with that and narrow it down a bit more."
            ),
            "notes": ["User accepted/agreed with the current hypothesis thread."],
            "candidate_threads": candidates,
        }

    if reaction == "reject":
        alternative_thread = _pick_alternative(
            candidates=candidates,
            tried_threads=tried_threads,
            exclude=selected_thread,
        )

        if alternative_thread:
            return {
                "resolved": False,
                "resolved_thread": None,
                "next_thread": alternative_thread,
                "resolution_status": "retry_with_new_thread",
                "next_question": None,
                "tried_threads": updated_tried_threads,
                "reaction_status": "rejected",
                "response": _build_reject_response(alternative_thread, selected_thread),
                "notes": [
                    "User rejected the initial hypothesis.",
                    "Switching to another plausible thread for confirmation.",
                ],
                "candidate_threads": candidates,
            }

        return {
            "resolved": False,
            "resolved_thread": None,
            "next_thread": None,
            "resolution_status": "needs_clarification",
            "next_question": (
                "Thanks, that helps. Which area feels closer right now: sleep/rest, work/study, "
                "daily structure, physical activity, or meals?"
            ),
            "tried_threads": updated_tried_threads,
            "reaction_status": "rejected",
            "response": _build_reject_response(alternative_thread, selected_thread),
            "notes": [
                "User rejected the initial hypothesis and no strong alternative thread was available."
            ],
            "candidate_threads": candidates,
        }

    if reaction == "redirect":
        resolved_thread = redirected_thread or _pick_alternative(
            candidates=candidates,
            tried_threads=tried_threads,
            exclude=selected_thread,
        )

        if resolved_thread:
            return {
                "resolved": False,
                "resolved_thread": None,
                "next_thread": resolved_thread,
                "resolution_status": "retry_with_new_thread",
                "next_question": None,
                "tried_threads": updated_tried_threads,
                "reaction_status": "redirected",
                "response": _build_redirect_response(resolved_thread),
                "notes": [
                    "User redirected away from original thread.",
                    "Switching focus and requesting confirmation on redirected thread.",
                ],
                "candidate_threads": candidates,
            }

        return {
            "resolved": False,
            "resolved_thread": None,
            "next_thread": None,
            "resolution_status": "needs_clarification",
            "next_question": (
                "Got it. What does it feel more related to right now? "
                "Sleep/rest, work/study, routine, activity, or meals?"
            ),
            "tried_threads": updated_tried_threads,
            "reaction_status": "redirected",
            "response": "Yeah, that makes sense. We can shift focus a bit and see what fits better.",
            "notes": ["User redirected but no clear supported target was detected."],
            "candidate_threads": candidates,
        }

    if reaction == "unsure":
        secondary_thread = _pick_alternative(
            candidates=candidates,
            tried_threads=tried_threads,
            exclude=selected_thread,
        )

        return {
            "resolved": False,
            "resolved_thread": None,
            "next_thread": None,
            "resolution_status": "needs_clarification",
            "next_question": _build_unsure_response(selected_thread, secondary_thread),
            "tried_threads": updated_tried_threads,
            "reaction_status": "unsure",
            "response": _build_unsure_response(selected_thread, secondary_thread),
            "notes": [
                "User was unsure, so the system kept the conversation exploratory and offered soft possibilities."
            ],
            "candidate_threads": candidates,
            "suggested_threads": _dedupe([selected_thread, secondary_thread]),
        }

    return {
        "resolved": False,
        "resolved_thread": None,
        "next_thread": None,
        "resolution_status": "needs_clarification",
        "next_question": (
            "I’m not fully sure which direction fits best yet. Which area feels closest right now?"
        ),
        "tried_threads": updated_tried_threads,
        "reaction_status": "unknown",
        "response": (
            "I’m not fully sure which direction fits best yet, so we can keep it open and work through it gradually."
        ),
        "notes": ["Fallback branch used because reaction was unknown."],
        "candidate_threads": candidates,
    }