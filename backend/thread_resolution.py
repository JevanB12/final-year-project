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

GUIDED_NARROWING_QUESTIONS = {
    "work_study_routine": "Alright — would you say it feels more like pressure in the moment, or more like your mind doesn’t really switch off afterwards?",
    "sleep_rest": "Alright — would you say it feels more like low energy physically, or more like your mind keeps going even when you’re trying to rest?",
    "daily_structure": "Alright — does it feel more like the day has been too full on, or more like there hasn’t been enough proper downtime?",
    "physical_activity": "Alright — does it feel more like physical tiredness in your body, or more like a mental heaviness?",
    "meals_regularity": "Alright — does it feel more like low energy from not eating properly, or more like something else has been weighing on you?",
}

GENERIC_GUIDED_QUESTION = (
    "Alright — would you say it feels more like pressure, tiredness, or difficulty switching off?"
)

THREAD_HINT_TERMS = {
    "work_study_routine": {"work", "study", "deadline", "assignment", "pressure", "coursework"},
    "sleep_rest": {"sleep", "rest", "tired", "exhausted", "drained", "energy"},
    "daily_structure": {"routine", "schedule", "structure", "busy", "nonstop", "downtime"},
    "physical_activity": {"exercise", "activity", "workout", "gym", "movement", "training", "physical"},
    "meals_regularity": {"meal", "meals", "eat", "eating", "breakfast", "lunch", "dinner", "food"},
}

GUIDED_THREAD_SIGNALS = {
    "work_study_routine": {
        "pressure",
        "work",
        "study",
        "overthinking",
        "mind doesn't switch off",
        "mind doesnt switch off",
        "switch off afterwards",
        "afterwards",
        "mental pressure",
        "switching off",
        "switch off",
        "mind keeps going",
        "overthinking",
        "can't relax",
        "cant relax",
    },
    "sleep_rest": {
        "tired",
        "tiredness",
        "low energy",
        "rest",
        "sleep",
        "drained",
        "exhausted",
    },
    "daily_structure": {
        "full on",
        "busy",
        "packed",
        "nonstop",
        "downtime",
        "no downtime",
        "routine",
        "structure",
    },
    "physical_activity": {
        "physical",
        "body",
        "physically",
        "movement",
        "exercise",
        "gym",
        "active",
    },
    "meals_regularity": {
        "food",
        "meal",
        "meals",
        "eat",
        "eating",
        "hungry",
        "breakfast",
        "lunch",
        "dinner",
    },
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


def _build_guided_question(thread: Optional[str]) -> str:
    if not thread:
        return GENERIC_GUIDED_QUESTION
    return GUIDED_NARROWING_QUESTIONS.get(thread, GENERIC_GUIDED_QUESTION)


def _explicitly_mentions_thread(text: str, thread: str) -> bool:
    normalized = (text or "").strip().lower()
    if not normalized or not thread:
        return False
    return any(term in normalized for term in THREAD_HINT_TERMS.get(thread, set()))


def _score_thread_from_guided_answer(text: str, thread: str) -> float:
    normalized = (text or "").strip().lower()
    if not normalized:
        return 0.0

    score = 0.0

    for cue in GUIDED_THREAD_SIGNALS.get(thread, set()):
        if cue in normalized:
            score += 1.0

    if thread == "work_study_routine":
        if "switch off" in normalized or "overthinking" in normalized or "pressure" in normalized:
            score += 1.0
    if thread == "sleep_rest":
        if "low energy" in normalized or "tired" in normalized or "drained" in normalized:
            score += 1.0
    if thread == "physical_activity":
        if "physical" in normalized or "body" in normalized:
            score += 1.0

    return score


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
    original_phrase = _soft_phrase(original_thread)

    if alternative_thread:
        alt_phrase = _soft_phrase(alternative_thread) or "something else going on"
        if original_phrase:
            return (
                "Okay, that helps. "
                f"It sounds like it might be less about {original_phrase} after all. "
                f"I wonder if it could be more to do with {alt_phrase}. "
                "Does that feel any closer?"
            )
        return (
            "Okay, that helps. "
            f"I wonder if it could be more to do with {alt_phrase}. "
            "Does that feel any closer?"
        )

    return (
        "Okay, that helps. "
        "It sounds like that might not be the main thing here after all."
    )


def _build_redirect_response(resolved_thread: str) -> str:
    phrase = _soft_phrase(resolved_thread) or "that side of things"
    return (
        f"Yeah, that makes sense. It may be more about {phrase}. "
        "We can shift focus there gently."
    )


def _build_unsure_response(
    primary_thread: Optional[str],
    secondary_thread: Optional[str],
) -> str:
    primary_phrase = _soft_phrase(primary_thread)
    secondary_phrase = _soft_phrase(secondary_thread)

    if primary_phrase and secondary_phrase:
        return (
            "Yeah, that makes sense. "
            f"It could be something around {primary_phrase}, or maybe {secondary_phrase}."
        )

    if primary_phrase:
        return (
            "Yeah, that makes sense. "
            f"It could be something around {primary_phrase}, but it may be a bit more mixed than that."
        )

    return "Yeah, that makes sense. It may just need a slightly different angle."


def resolve_thread(
    selected_thread: Optional[str],
    reaction: str,
    redirected_thread: Optional[str] = None,
    user_text: str = "",
    themes: Optional[List[str]] = None,
    candidate_threads: Optional[List[str]] = None,
    tried_threads: Optional[List[str]] = None,
    rejected_threads: Optional[List[str]] = None,
    rejection_count: int = 0,
) -> Dict:
    themes = themes or []
    candidate_threads = candidate_threads or []
    tried_threads = tried_threads or []
    rejected_threads = rejected_threads or []

    candidates = _dedupe(candidate_threads) or _candidate_threads(
        selected_thread=selected_thread,
        redirected_thread=redirected_thread,
        themes=themes,
        tried_threads=tried_threads,
    )

    reaction = (reaction or "").strip().lower()

    selected_history = [selected_thread] if selected_thread else []
    updated_tried_threads = _dedupe([*tried_threads, *selected_history])
    updated_rejected_threads = _dedupe(rejected_threads)
    current_mode = "awaiting_reaction_to_hypothesis" if selected_thread else "awaiting_guided_clarification"

    if reaction in {"accept", "agree"}:
        resolved_thread = selected_thread
        return {
            "resolved": True,
            "resolved_thread": resolved_thread,
            "next_thread": resolved_thread,
            "resolution_status": "resolved",
            "next_question": None,
            "tried_threads": updated_tried_threads,
            "candidate_threads": candidates,
            "rejected_threads": updated_rejected_threads,
            "rejection_count": rejection_count,
            "mode": "resolved_thread",
            "latest_question_type": "hypothesis",
            "reaction_status": "accepted",
            "response": _build_accept_response(resolved_thread) if resolved_thread else (
                "That makes sense. We can stay with that and narrow it down a bit more."
            ),
            "notes": ["User accepted/agreed with the current hypothesis thread."],
        }

    if reaction == "reject":
        if selected_thread:
            updated_rejected_threads = _dedupe([*updated_rejected_threads, selected_thread])
            rejection_count = rejection_count + 1

        alternative_thread = _pick_alternative(
            candidates=candidates,
            tried_threads=tried_threads,
            exclude=selected_thread,
        )

        if alternative_thread and rejection_count < 2:
            return {
                "resolved": False,
                "resolved_thread": None,
                "next_thread": alternative_thread,
                "resolution_status": "retry_with_new_thread",
                "next_question": None,
                "tried_threads": updated_tried_threads,
                "candidate_threads": candidates,
                "rejected_threads": updated_rejected_threads,
                "rejection_count": rejection_count,
                "mode": "awaiting_reaction_to_hypothesis",
                "latest_question_type": "hypothesis",
                "reaction_status": "rejected",
                "response": _build_reject_response(alternative_thread, selected_thread),
                "notes": [
                    "User rejected the current hypothesis.",
                    "Switching to another plausible thread for confirmation.",
                ],
            }

        return {
            "resolved": False,
            "resolved_thread": None,
            "next_thread": None,
            "resolution_status": "needs_clarification",
            "next_question": _build_guided_question(selected_thread),
            "tried_threads": updated_tried_threads,
            "candidate_threads": candidates,
            "rejected_threads": updated_rejected_threads,
            "rejection_count": rejection_count,
            "mode": "awaiting_guided_clarification",
            "latest_question_type": "guided_clarification",
            "reaction_status": "rejected",
            "response": _build_reject_response(alternative_thread, selected_thread),
            "notes": [
                "User rejected the current hypothesis.",
                "Switching to a simpler guided narrowing question instead of open exploration.",
            ],
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
                "candidate_threads": candidates,
                "rejected_threads": updated_rejected_threads,
                "rejection_count": rejection_count,
                "mode": "awaiting_reaction_to_hypothesis",
                "latest_question_type": "hypothesis",
                "reaction_status": "redirected",
                "response": _build_redirect_response(resolved_thread),
                "notes": [
                    "User redirected away from original thread.",
                    "Switching focus and requesting confirmation on redirected thread.",
                ],
            }

        return {
            "resolved": False,
            "resolved_thread": None,
            "next_thread": None,
            "resolution_status": "needs_clarification",
            "next_question": GENERIC_GUIDED_QUESTION,
            "tried_threads": updated_tried_threads,
            "candidate_threads": candidates,
            "rejected_threads": updated_rejected_threads,
            "rejection_count": rejection_count,
            "mode": "awaiting_guided_clarification",
            "latest_question_type": "guided_clarification",
            "reaction_status": "redirected",
            "response": "Yeah, that makes sense. We can keep it simple and narrow it down from here.",
            "notes": ["User redirected but no clear supported target was detected."],
        }

    if reaction == "unsure":
        if not selected_thread:
            explicit_reintroduced = next(
                (thread for thread in updated_rejected_threads if _explicitly_mentions_thread(user_text, thread)),
                None,
            )

            eligible = [thread for thread in candidates if thread not in updated_rejected_threads]
            scored = sorted(
                [(thread, _score_thread_from_guided_answer(user_text, thread)) for thread in eligible],
                key=lambda item: item[1],
                reverse=True,
            )

            best_thread = scored[0][0] if scored else None
            best_score = scored[0][1] if scored else 0.0

            if explicit_reintroduced:
                best_thread = explicit_reintroduced
                best_score = max(best_score, 1.0)

            if best_thread:
                return {
                    "resolved": False,
                    "resolved_thread": None,
                    "next_thread": best_thread,
                    "resolution_status": "retry_with_new_thread",
                    "next_question": None,
                    "tried_threads": updated_tried_threads,
                    "candidate_threads": candidates,
                    "rejected_threads": updated_rejected_threads,
                    "rejection_count": rejection_count,
                    "mode": "awaiting_reaction_to_hypothesis",
                    "latest_question_type": "hypothesis",
                    "reaction_status": "unsure",
                    "response": _build_redirect_response(best_thread),
                    "notes": [
                        "Guided clarification answer surfaced a plausible candidate thread.",
                        "Moving back to a soft hypothesis check.",
                    ],
                }

            return {
                "resolved": False,
                "resolved_thread": None,
                "next_thread": None,
                "resolution_status": "needs_clarification",
                "next_question": GENERIC_GUIDED_QUESTION,
                "tried_threads": updated_tried_threads,
                "candidate_threads": candidates,
                "rejected_threads": updated_rejected_threads,
                "rejection_count": rejection_count,
                "mode": "awaiting_guided_clarification",
                "latest_question_type": "guided_clarification",
                "reaction_status": "unsure",
                "response": "That makes sense. Let’s keep it simple and narrow it down a little.",
                "notes": [
                    "Guided clarification answer did not surface a strong candidate thread.",
                    "Keeping clarification guided and concrete.",
                ],
            }

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
            "next_question": _build_guided_question(selected_thread),
            "tried_threads": updated_tried_threads,
            "candidate_threads": candidates,
            "rejected_threads": updated_rejected_threads,
            "rejection_count": rejection_count,
            "mode": "awaiting_guided_clarification",
            "latest_question_type": "guided_clarification",
            "reaction_status": "unsure",
            "response": _build_unsure_response(selected_thread, secondary_thread),
            "notes": [
                "User was unsure, so the system used a guided narrowing question instead of open exploration."
            ],
        }

    return {
        "resolved": False,
        "resolved_thread": None,
        "next_thread": None,
        "resolution_status": "needs_clarification",
        "next_question": GENERIC_GUIDED_QUESTION,
        "tried_threads": updated_tried_threads,
        "candidate_threads": candidates,
        "rejected_threads": updated_rejected_threads,
        "rejection_count": rejection_count,
        "mode": "awaiting_guided_clarification" if current_mode != "awaiting_reaction_to_hypothesis" else current_mode,
        "latest_question_type": "guided_clarification",
        "reaction_status": "unknown",
        "response": "I’m not fully sure yet, but we can narrow it down in a simpler way.",
        "notes": ["Fallback branch used because reaction was unknown."],
    }