import random
from typing import List, Optional

from lexicons import general_soft_clarification_questions, soft_clarification_questions


def generate_acknowledgement(tone: str, themes: List[str], intensity: float) -> str:
    if tone == "positive":
        base = "Sounds like there were some good parts to the day."
    elif tone == "negative":
        base = "That sounds like a pretty tough day."
    elif tone == "mixed":
        base = "Sounds like the day had a bit of both."
    else:
        base = "Got you."

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
    if analysis:
        tone = analysis.get("tone")
        themes = analysis.get("themes", [])
        if tone == "mixed" or len(themes) > 1:
            return random.choice(general_soft_clarification_questions)

    if not selected_thread or selected_thread not in soft_clarification_questions:
        return random.choice(general_soft_clarification_questions)

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
) -> str:
    if tone == "positive" and not negative_points:
        return generate_positive_reflection(themes)
    if selected_thread is None:
        if tone == "negative":
            return random.choice(NEGATIVE_FALLBACK_RESPONSES)
        return random.choice(NEUTRAL_RESPONSES)
    acknowledgement = generate_acknowledgement(tone, themes, intensity)
    bridge = generate_thread_bridge(selected_thread, text)
    question = generate_soft_clarification(
        selected_thread,
        analysis={"tone": tone, "themes": themes, "intensity": intensity},
    )
    return f"{acknowledgement} {bridge} {question}"
