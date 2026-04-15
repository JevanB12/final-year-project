from typing import Any, Dict, List, Tuple

# (suggestion_target, change_area, suggestion_type, confidence)
SubMapping = Tuple[str, str, str, float]

SUB_ISSUE_MAPPINGS: Dict[str, Dict[str, SubMapping]] = {
    "sleep_rest": {
        "low_sleep_duration": (
            "increase_sleep_time",
            "bedtime_and_sleep_duration",
            "gentle_adjustment",
            0.86,
        ),
        "poor_sleep_quality": (
            "improve_sleep_quality_support",
            "sleep_quality",
            "recovery_change",
            0.85,
        ),
        "late_sleep_timing": (
            "shift_sleep_timing_earlier",
            "sleep_timing",
            "gentle_adjustment",
            0.84,
        ),
        "inconsistent_sleep_pattern": (
            "stabilise_sleep_schedule",
            "sleep_schedule_consistency",
            "consistency_change",
            0.87,
        ),
        "daytime_fatigue": (
            "improve_rest_recovery",
            "rest_and_recovery",
            "recovery_change",
            0.84,
        ),
    },
    "work_study_routine": {
        "overload_pressure": (
            "reduce_task_load",
            "workload",
            "pacing_change",
            0.86,
        ),
        "focus_difficulty": (
            "improve_focus_blocks",
            "focus_structure",
            "structure_change",
            0.85,
        ),
        "avoidance_procrastination": (
            "reduce_start_friction",
            "task_initiation",
            "gentle_adjustment",
            0.84,
        ),
        "deadline_pressure": (
            "manage_deadline_pressure",
            "deadline_planning",
            "pacing_change",
            0.83,
        ),
        "lack_of_breaks": (
            "add_break_recovery",
            "breaks_and_pacing",
            "pacing_change",
            0.85,
        ),
    },
    "daily_structure": {
        "no_consistent_routine": (
            "create_anchor_points",
            "daily_routine_structure",
            "consistency_change",
            0.86,
        ),
        "overpacked_day": (
            "introduce_spacing",
            "day_spacing",
            "pacing_change",
            0.84,
        ),
        "poor_time_distribution": (
            "rebalance_time_use",
            "time_distribution",
            "structure_change",
            0.83,
        ),
        "lack_of_downtime": (
            "protect_downtime",
            "downtime_and_recovery",
            "recovery_change",
            0.85,
        ),
    },
    "meals_regularity": {
        "skipping_meals": (
            "support_meal_consistency",
            "meal_consistency",
            "consistency_change",
            0.86,
        ),
        "late_meals": (
            "improve_meal_timing",
            "meal_timing",
            "gentle_adjustment",
            0.84,
        ),
        "irregular_eating_pattern": (
            "stabilise_eating_pattern",
            "eating_pattern",
            "consistency_change",
            0.85,
        ),
        "not_eating_enough": (
            "increase_meal_adequacy",
            "meal_adequacy",
            "gentle_adjustment",
            0.83,
        ),
    },
    "physical_activity": {
        "very_low_activity": (
            "increase_daily_movement",
            "movement_level",
            "gentle_adjustment",
            0.86,
        ),
        "inconsistent_activity": (
            "stabilise_activity_pattern",
            "activity_consistency",
            "consistency_change",
            0.85,
        ),
        "overexertion": (
            "reduce_activity_strain",
            "recovery_balance",
            "recovery_change",
            0.84,
        ),
        "lack_of_movement": (
            "add_light_movement",
            "low_intensity_movement",
            "gentle_adjustment",
            0.85,
        ),
    },
}

THREAD_FALLBACK: Dict[str, SubMapping] = {
    "sleep_rest": ("improve_sleep_support", "sleep", "gentle_adjustment", 0.55),
    "work_study_routine": (
        "improve_work_study_support",
        "work_study",
        "gentle_adjustment",
        0.55,
    ),
    "daily_structure": (
        "improve_daily_structure_support",
        "daily_structure",
        "structure_change",
        0.55,
    ),
    "meals_regularity": (
        "improve_meals_support",
        "meals",
        "gentle_adjustment",
        0.55,
    ),
    "physical_activity": (
        "improve_movement_support",
        "movement",
        "gentle_adjustment",
        0.55,
    ),
}

GLOBAL_FALLBACK: SubMapping = (
    "general_wellbeing_support",
    "general",
    "gentle_adjustment",
    0.45,
)


def _build_result(
    suggestion_target: str,
    change_area: str,
    suggestion_type: str,
    confidence: float,
    notes: List[str],
) -> Dict[str, Any]:
    return {
        "suggestion_target": suggestion_target,
        "change_area": change_area,
        "suggestion_type": suggestion_type,
        "confidence": confidence,
        "notes": notes,
    }


def map_suggestion_target(
    resolved_thread: str,
    sub_issue: str,
) -> Dict[str, Any]:
    thread = (resolved_thread or "").strip()
    sub = (sub_issue or "").strip()

    thread_map = SUB_ISSUE_MAPPINGS.get(thread)
    if thread_map and sub in thread_map:
        target, area, stype, conf = thread_map[sub]
        return _build_result(
            target,
            area,
            stype,
            conf,
            [f"Mapped from {thread}:{sub}"],
        )

    if thread in THREAD_FALLBACK:
        target, area, stype, conf = THREAD_FALLBACK[thread]
        note = f"Used fallback mapping for {thread}"
        if sub:
            note += f" (unrecognised sub_issue: {sub!r})"
        return _build_result(target, area, stype, conf, [note])

    target, area, stype, conf = GLOBAL_FALLBACK
    return _build_result(
        target,
        area,
        stype,
        conf,
        [f"No mapping for thread {thread!r}; used global fallback."],
    )
