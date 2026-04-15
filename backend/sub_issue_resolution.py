from typing import Dict, List, Set, Tuple

from extractors import normalize_text


THREAD_SUB_ISSUE_KEYWORDS: Dict[str, Dict[str, Set[str]]] = {
    "sleep_rest": {
        "low_sleep_duration": {
            "not enough sleep",
            "little sleep",
            "less sleep",
            "short sleep",
            "few hours",
            "only slept",
            "hours sleep",
            "four hours",
            "five hours",
            "six hours",
            "didn't sleep much",
            "not much sleep",
            "lack of sleep",
        },
        "poor_sleep_quality": {
            "restless",
            "light sleep",
            "woke up",
            "woke a lot",
            "insomnia",
            "couldn't sleep",
            "cant sleep",
            "can't sleep",
            "broken sleep",
            "didn't rest well",
            "slept badly",
            "tossing",
            "turning",
            "kept waking",
        },
        "late_sleep_timing": {
            "went to bed late",
            "bed late",
            "late night",
            "stayed up",
            "up until",
            "up til",
            "past midnight",
            "night owl",
            "late bedtime",
        },
        "inconsistent_sleep_pattern": {
            "inconsistent",
            "all over the place",
            "irregular",
            "random",
            "different times",
            "no routine",
            "sleep schedule",
            "pattern",
            "never the same",
        },
        "daytime_fatigue": {
            "tired during the day",
            "exhausted at work",
            "afternoon slump",
            "nodding off",
            "drained in the day",
            "no energy in the day",
            "daytime tiredness",
            "foggy during the day",
        },
    },
    "work_study_routine": {
        "overload_pressure": {
            "too much work",
            "too much to do",
            "overloaded",
            "swamped",
            "piled up",
            "can't keep up",
            "juggling",
            "too many tasks",
            "overwhelmed with work",
        },
        "focus_difficulty": {
            "can't focus",
            "cant focus",
            "hard to focus",
            "distracted",
            "brain fog",
            "can't concentrate",
            "concentration",
            "mind keeps wandering",
        },
        "avoidance_procrastination": {
            "procrastinating",
            "procrastination",
            "avoiding",
            "putting off",
            "didn't start",
            "kept delaying",
            "avoid it",
        },
        "deadline_pressure": {
            "deadline",
            "due tomorrow",
            "due today",
            "running out of time",
            "due soon",
            "last minute",
        },
        "lack_of_breaks": {
            "no break",
            "no breaks",
            "didn't stop",
            "straight through",
            "nonstop",
            "without stopping",
            "hours straight",
        },
    },
    "daily_structure": {
        "no_consistent_routine": {
            "no routine",
            "no real structure",
            "no structure",
            "chaotic",
            "winging it",
            "nowhere to be",
            "no plan",
        },
        "overpacked_day": {
            "packed day",
            "packed schedule",
            "back to back",
            "every minute",
            "jam packed",
            "too much in one day",
        },
        "poor_time_distribution": {
            "lost track of time",
            "time flew",
            "spent too long",
            "too long on",
            "misjudged time",
            "bad time management",
        },
        "lack_of_downtime": {
            "no downtime",
            "no time to breathe",
            "no time to myself",
            "no rest between",
            "constantly on the go",
        },
    },
    "meals_regularity": {
        "skipping_meals": {
            "skipped breakfast",
            "skipped lunch",
            "skipped dinner",
            "skip meals",
            "skipping meals",
            "didn't eat lunch",
            "missed a meal",
        },
        "late_meals": {
            "ate late",
            "late dinner",
            "late lunch",
            "eating late",
        },
        "irregular_eating_pattern": {
            "irregular meals",
            "eating randomly",
            "snacking instead",
            "no regular meals",
            "all over the place with food",
        },
        "not_eating_enough": {
            "not eating enough",
            "not eating much",
            "barely ate",
            "hardly ate",
            "didn't eat much",
            "lost appetite",
        },
    },
    "physical_activity": {
        "very_low_activity": {
            "sedentary",
            "sat all day",
            "didn't move much",
            "hardly moved",
            "barely walked",
            "didn't leave",
        },
        "inconsistent_activity": {
            "inconsistent exercise",
            "on and off",
            "sometimes i exercise",
            "start and stop",
            "not consistent with",
        },
        "overexertion": {
            "overdid",
            "pushed too hard",
            "burnt out from",
            "overtrained",
            "too much exercise",
        },
        "lack_of_movement": {
            "lack of movement",
            "not active",
            "no exercise",
            "haven't exercised",
            "need to move more",
            "inactive",
        },
    },
}

SUB_ISSUE_LABELS: Dict[str, str] = {
    "low_sleep_duration": "you're not getting enough sleep",
    "poor_sleep_quality": "the quality or restfulness of your sleep",
    "late_sleep_timing": "you're going to bed or sleeping too late",
    "inconsistent_sleep_pattern": "your sleep pattern has been inconsistent",
    "daytime_fatigue": "tiredness or low energy during the day despite sleep",
    "overload_pressure": "overall overload and too much on your plate",
    "focus_difficulty": "staying focused or concentrating",
    "avoidance_procrastination": "avoiding tasks or procrastinating",
    "deadline_pressure": "deadlines or time running out",
    "lack_of_breaks": "not getting enough breaks or pauses",
    "no_consistent_routine": "not having a consistent routine",
    "overpacked_day": "the day feeling overpacked",
    "poor_time_distribution": "how time gets spread across the day",
    "lack_of_downtime": "not getting downtime or space to reset",
    "skipping_meals": "skipping meals",
    "late_meals": "eating late",
    "irregular_eating_pattern": "eating at irregular times",
    "not_eating_enough": "not eating enough overall",
    "very_low_activity": "very low movement day to day",
    "inconsistent_activity": "inconsistent activity or exercise",
    "overexertion": "doing too much physically or overexertion",
    "lack_of_movement": "not enough movement or activity overall",
}

GENERIC_NARROW_QUESTIONS: Dict[str, str] = {
    "sleep_rest": (
        "When you think about sleep lately, is it more about how long you sleep, "
        "how well you sleep, when you go to bed, how regular the pattern is, or how tired you feel in the day?"
    ),
    "work_study_routine": (
        "When you picture work or study pressure, does it feel more like overload, "
        "focus problems, putting things off, deadlines, or not getting breaks?"
    ),
    "daily_structure": (
        "Does the day feel more like there's no routine, it's overpacked, time is poorly spread, "
        "or there's no real downtime?"
    ),
    "meals_regularity": (
        "Is eating more of a problem around skipping meals, eating late, irregular patterns, or not eating enough?"
    ),
    "physical_activity": (
        "Does movement feel more very low right now, inconsistent, too intense, or like there's not enough of it?"
    ),
}


def _score_sub_issues(
    text: str,
    keywords: Dict[str, Set[str]],
    tried: Set[str],
) -> List[Tuple[str, int]]:
    scored: List[Tuple[str, int]] = []
    for sub_id, cues in keywords.items():
        if sub_id in tried:
            continue
        count = sum(1 for cue in cues if cue in text)
        scored.append((sub_id, count))
    scored.sort(key=lambda x: (-x[1], x[0]))
    return scored


def _comparison_question(sub_a: str, sub_b: str) -> str:
    label_a = SUB_ISSUE_LABELS.get(sub_a, sub_a)
    label_b = SUB_ISSUE_LABELS.get(sub_b, sub_b)
    return f"Would you say it's more that {label_a}, or that {label_b}?"


def _notes_for_hits(
    text: str,
    keywords: Dict[str, Set[str]],
    tried: Set[str],
) -> List[str]:
    hits = [
        sid
        for sid, cues in keywords.items()
        if sid not in tried and any(cue in text for cue in cues)
    ]
    if not hits:
        return ["No sub-issue keyword matches (excluding tried_sub_issues)."]
    return [f"Keyword matches for: {', '.join(sorted(hits))}."]


def resolve_sub_issue(
    resolved_thread: str,
    user_text: str,
    tried_sub_issues: List[str],
) -> Dict:
    text = normalize_text(user_text)
    tried_set = set(tried_sub_issues)
    base_out: Dict = {
        "sub_issue": None,
        "resolved": False,
        "sub_issue_status": "needs_clarification",
        "next_question": None,
        "candidate_sub_issues": [],
        "tried_sub_issues": list(tried_sub_issues),
        "notes": [],
    }

    keywords = THREAD_SUB_ISSUE_KEYWORDS.get(resolved_thread)
    if not keywords:
        base_out["notes"].append(f"Unknown or unsupported resolved_thread: {resolved_thread!r}.")
        base_out["next_question"] = (
            "Which part of that feels strongest for you right now — sleep, work or study, "
            "daily routine, meals, or movement?"
        )
        return base_out

    base_out["notes"].extend(_notes_for_hits(text, keywords, tried_set))

    scored = _score_sub_issues(text, keywords, tried_set)
    positive = [(sid, s) for sid, s in scored if s > 0]

    if not positive:
        base_out["sub_issue_status"] = "needs_clarification"
        base_out["next_question"] = GENERIC_NARROW_QUESTIONS.get(
            resolved_thread,
            "Which part of that feels most true for you?",
        )
        base_out["notes"].append("No clear sub-issue match; using generic narrowing question.")
        return base_out

    s0, c0 = positive[0]
    c1 = positive[1][1] if len(positive) > 1 else 0

    clear_winner = c0 >= 1 and (c1 == 0 or c0 - c1 >= 2)

    if clear_winner:
        base_out["sub_issue"] = s0
        base_out["resolved"] = True
        base_out["sub_issue_status"] = "confirmed"
        base_out["candidate_sub_issues"] = [s0]
        base_out["notes"].append("Single dominant sub-issue match.")
        return base_out

    if c0 >= 1 and c1 >= 1 and (c0 - c1) <= 1:
        a, b = positive[0][0], positive[1][0]
        base_out["sub_issue"] = None
        base_out["resolved"] = False
        base_out["sub_issue_status"] = "needs_clarification"
        base_out["next_question"] = _comparison_question(a, b)
        base_out["candidate_sub_issues"] = [a, b]
        base_out["notes"].append("Two plausible sub-issues detected.")
        return base_out

    base_out["sub_issue_status"] = "needs_clarification"
    base_out["next_question"] = GENERIC_NARROW_QUESTIONS.get(
        resolved_thread,
        "Which part of that feels most true for you?",
    )
    base_out["notes"].append("Ambiguous scores; using generic narrowing question.")
    return base_out
