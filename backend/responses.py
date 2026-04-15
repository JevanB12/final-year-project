import random
from typing import List, Optional

from lexicons import soft_clarification_questions


STRONG_NEGATIVE_CUES = {
    "no energy",
    "cant do",
    "can't do",
    "cant do it",
    "can't do it",
    "struggling",
    "slipping",
    "falling behind",
}


def generate_acknowledgement(
    tone: str,
    themes: List[str],
    intensity: float,
    text: str = "",
    strain_detected: bool = False,
) -> str:
    has_strong_negative = any(cue in text for cue in STRONG_NEGATIVE_CUES)

    if strain_detected and tone != "negative" and not has_strong_negative:
        base = "Sounds like you've got quite a lot going on, even if you're managing it."
        if intensity > 0.7:
            base += " It sounds pretty intense."
    elif tone == "negative" or has_strong_negative:
        base = "That sounds like a pretty tough day."
    elif tone == "positive":
        base = "Sounds like there were some good parts to the day."
    elif tone == "mixed":
        base = "Sounds like the day had a bit of both."
    else:
        base = "Got you."

    if not (strain_detected and tone != "negative" and not has_strong_negative):
        if intensity > 0.7:
            base += " It sounds pretty intense."
        elif intensity > 0.4:
            base += " There's a bit going on in there."

    if "sleep_rest" in themes and tone in {"negative", "mixed"}:
        base += " The tiredness stands out."
    elif "work_study_routine" in themes and tone in {"negative", "mixed"}:
        base += " The workload seems to be weighing on you a bit."
    elif "daily_structure" in themes and tone in {"negative", "mixed"}:
        base += " It also sounds like you haven't had much room to reset."

    return base


POSITIVE_THEME_REFLECTIONS = {
    "work_study_routine": "things have been going well on the work and study front",
    "sleep_rest": "you've been resting well",
    "physical_activity": "you've been keeping active",
    "meals_regularity": "you've been keeping on top of meals",
    "daily_structure": "you've had a good routine going",
}


def generate_positive_reflection(themes: List[str]) -> str:
    for theme in themes:
        if theme in POSITIVE_THEME_REFLECTIONS:
            reflection = POSITIVE_THEME_REFLECTIONS[theme]
            return f"That's good to hear — sounds like {reflection}. What do you think has been helping most?"
    return "That's good to hear — sounds like things have been going well. What do you think has been helping most?"


def generate_thread_bridge(selected_thread: Optional[str], text: str = "") -> str:
    return "To understand that a bit better,"


def generate_soft_clarification(selected_thread: Optional[str], analysis: Optional[dict] = None) -> str:
    if not selected_thread or selected_thread not in soft_clarification_questions:
        return "Do you think that's been part of what you're feeling?"

    return random.choice(soft_clarification_questions[selected_thread])


NEUTRAL_RESPONSES = [
    "Got you — sounds like a pretty steady day. Did it feel like a good balance overall?",
    "Sounds like a fairly normal day. Did everything feel alright energy-wise, or was anything slightly off?",
]

NEGATIVE_FALLBACK_RESPONSES = [
    "Sounds like even though things were alright on the surface, something still feels a bit off underneath. Do you want to talk more about that?",
    "It sounds like things haven't quite felt right, even if it's hard to pin down exactly why. What's been sitting with you most?",
]


def generate_iteration2_reply(
    tone: str,
    themes: List[str],
    intensity: float,
    selected_thread: Optional[str],
    text: str = "",
    negative_points: Optional[List[str]] = None,
    strain_detected: bool = False,
) -> str:
    if tone == "positive" and not negative_points:
        return generate_positive_reflection(themes)
    if selected_thread is None:
        if tone == "negative":
            return random.choice(NEGATIVE_FALLBACK_RESPONSES)
        if strain_detected:
            return (
                "Sounds like you've got quite a lot going on, even if you're managing it. "
                "Does any part of that feel harder to carry than the rest right now?"
            )
        return random.choice(NEUTRAL_RESPONSES)
    acknowledgement = generate_acknowledgement(
        tone, themes, intensity, text, strain_detected=strain_detected
    )
    bridge = generate_thread_bridge(selected_thread, text)
    question = generate_soft_clarification(
        selected_thread,
        analysis={"tone": tone, "themes": themes, "intensity": intensity},
    )
    return f"{acknowledgement} {bridge} {question}"
