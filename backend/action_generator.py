from typing import Any, Dict, List, Tuple

from extractors import normalize_text

ActionTemplate = Tuple[str, str, str, float]

ACTION_BY_SUGGESTION_TARGET: Dict[str, ActionTemplate] = {
    "increase_sleep_time": (
        "sleep_window_extension",
        "A gentle step could be protecting a slightly longer sleep window tonight, even by 20-30 minutes, rather than aiming for a perfect reset.",
        "Would that feel manageable for tonight?",
        0.85,
    ),
    "improve_sleep_quality_support": (
        "wind_down_buffer",
        "It may help to add a short wind-down buffer before sleep, so your body has a clearer transition into rest.",
        "Would a short wind-down routine feel realistic for you?",
        0.84,
    ),
    "shift_sleep_timing_earlier": (
        "earlier_sleep_shift",
        "A practical step could be shifting sleep timing a little earlier, in small increments rather than all at once.",
        "Would a small earlier shift this week feel doable?",
        0.83,
    ),
    "stabilise_sleep_schedule": (
        "sleep_anchor",
        "One thing that could help is picking one consistent sleep anchor, like keeping your bedtime or wake-up time closer to the same each day.",
        "Does that feel realistic with how your week usually goes?",
        0.87,
    ),
    "improve_rest_recovery": (
        "recovery_pause",
        "It might help to add one intentional recovery pause earlier in the day, before exhaustion builds up fully.",
        "Would that fit into your usual day?",
        0.82,
    ),
    "reduce_task_load": (
        "task_trim",
        "It may help to reduce your immediate task load by picking one or two priorities first, instead of carrying everything at once.",
        "Would narrowing it down feel possible today?",
        0.86,
    ),
    "improve_focus_blocks": (
        "timed_focus_block",
        "You could try giving yourself one short focused block, with a clear start and finish, rather than expecting yourself to stay locked in for ages.",
        "Would a shorter focus block feel more realistic?",
        0.85,
    ),
    "reduce_start_friction": (
        "tiny_start",
        "It might help to make the starting point smaller — for example, just beginning with 5 minutes rather than the whole task.",
        "Does that sound like something that would fit your day?",
        0.86,
    ),
    "manage_deadline_pressure": (
        "deadline_slice",
        "A useful step could be splitting the deadline into the next smallest checkpoint, so the pressure feels less all-or-nothing.",
        "Would that make the workload feel more manageable?",
        0.83,
    ),
    "add_break_recovery": (
        "planned_short_break",
        "It may help to build in one proper short break earlier, before you hit the point of feeling fully drained.",
        "Do you think that would be possible in your routine?",
        0.85,
    ),
    "create_anchor_points": (
        "day_anchor_point",
        "A good first step might be setting one fixed anchor point in your day, so the rest has something stable to build around.",
        "Would one daily anchor feel manageable to try first?",
        0.84,
    ),
    "introduce_spacing": (
        "spacing_buffer",
        "It could help to leave a little spacing between key parts of your day, instead of packing everything back-to-back.",
        "Would adding one buffer point feel realistic?",
        0.84,
    ),
    "rebalance_time_use": (
        "time_rebalance",
        "A practical adjustment could be rebalancing where your time goes by setting a firmer limit on one part that keeps overrunning.",
        "Would that be something you could test this week?",
        0.82,
    ),
    "protect_downtime": (
        "downtime_protection",
        "It may help to protect one small block of downtime as non-negotiable, even if the rest of the day stays busy.",
        "Would that be possible with your current schedule?",
        0.85,
    ),
    "support_meal_consistency": (
        "meal_anchor",
        "It could help to anchor one regular meal into the day first, rather than trying to fix your whole eating pattern all at once.",
        "Would starting with one reliable meal feel manageable?",
        0.86,
    ),
    "improve_meal_timing": (
        "meal_timing_anchor",
        "A helpful step could be setting one clearer meal timing point in the day, then building consistency from there.",
        "Would that feel realistic for your routine?",
        0.83,
    ),
    "stabilise_eating_pattern": (
        "eating_rhythm_reset",
        "It might help to stabilise your eating rhythm with one predictable pattern first, instead of changing everything at once.",
        "Would that feel manageable this week?",
        0.84,
    ),
    "increase_meal_adequacy": (
        "meal_adequacy_boost",
        "A gentle adjustment could be making one meal a bit more substantial, so energy support feels steadier through the day.",
        "Would that be realistic to try?",
        0.82,
    ),
    "increase_daily_movement": (
        "movement_anchor",
        "A small step that might help is adding one regular bit of movement into the day, even if it's just a short walk.",
        "Does that sound doable with your current routine?",
        0.86,
    ),
    "stabilise_activity_pattern": (
        "activity_consistency_anchor",
        "It may help to make movement more regular with one repeatable activity slot, rather than relying on motivation each day.",
        "Would that feel realistic for your week?",
        0.84,
    ),
    "reduce_activity_strain": (
        "strain_reduction_step",
        "A useful adjustment could be easing activity intensity slightly so recovery can catch up.",
        "Would a lighter pace feel right for now?",
        0.83,
    ),
    "add_light_movement": (
        "light_movement_start",
        "It could help to start with light movement in short bursts, so it feels easier to sustain.",
        "Would a short, low-pressure movement step feel manageable?",
        0.84,
    ),
}

FALLBACK_ACTION: ActionTemplate = (
    "general_supportive_adjustment",
    "It may help to make one small, manageable adjustment in this area rather than trying to change everything at once.",
    "Does that sound like something you could try?",
    0.55,
)


def _context_prefix(user_text: str) -> str:
    text = normalize_text(user_text or "")
    if not text:
        return ""
    if "putting things off" in text or "procrastinat" in text:
        return "Since getting started seems to be the hard part, "
    if "no time" in text:
        return "Given how tight time feels, "
    if "busy" in text or "packed" in text:
        return "Given how busy things sound, "
    if "tired" in text or "exhaust" in text or "drained" in text:
        return "Since energy sounds low right now, "
    return ""


def _build_result(
    action_label: str,
    action_text: str,
    follow_up_question: str,
    confidence: float,
    notes: List[str],
) -> Dict[str, Any]:
    return {
        "action_label": action_label,
        "action_text": action_text,
        "follow_up_question": follow_up_question,
        "confidence": confidence,
        "notes": notes,
    }


def generate_action(
    resolved_thread: str,
    sub_issue: str,
    suggestion_target: str,
    user_text: str = "",
) -> Dict[str, Any]:
    target = (suggestion_target or "").strip()
    thread = (resolved_thread or "").strip()
    sub = (sub_issue or "").strip()

    if target in ACTION_BY_SUGGESTION_TARGET:
        label, text, follow_up, confidence = ACTION_BY_SUGGESTION_TARGET[target]
        prefix = _context_prefix(user_text)
        action_text = f"{prefix}{text}" if prefix else text
        return _build_result(
            action_label=label,
            action_text=action_text,
            follow_up_question=follow_up,
            confidence=confidence,
            notes=[f"Mapped from suggestion target {target}.", f"Thread={thread}, sub_issue={sub}."],
        )

    fallback_label, fallback_text, fallback_question, fallback_conf = FALLBACK_ACTION
    prefix = _context_prefix(user_text)
    action_text = f"{prefix}{fallback_text}" if prefix else fallback_text
    notes = ["Used fallback action mapping."]
    if target:
        notes.append(f"Unrecognised suggestion_target: {target!r}.")
    if thread or sub:
        notes.append(f"Thread={thread or 'none'}, sub_issue={sub or 'none'}.")
    return _build_result(
        action_label=fallback_label,
        action_text=action_text,
        follow_up_question=fallback_question,
        confidence=fallback_conf,
        notes=notes,
    )
