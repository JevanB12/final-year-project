import random
from typing import List, Optional

from lexicons import thread_questions


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

    if "sleep" in themes and tone in {"negative", "mixed"}:
        base += " The tiredness stands out."
    elif "work" in themes and tone in {"negative", "mixed"}:
        base += " The work side seems to be weighing on you a bit."
    elif "recovery" in themes and tone in {"negative", "mixed"}:
        base += " It also sounds like you haven't had much room to reset."

    return base


def generate_thread_bridge(selected_thread: Optional[str]) -> str:
    if selected_thread == "sleep":
        return "The part I'd focus on first is your energy / sleep side."
    if selected_thread == "work":
        return "The part I'd focus on first is the workload side."
    if selected_thread == "recovery":
        return "The part I'd focus on first is whether you've had any space to recover."
    if selected_thread == "movement":
        return "The part I'd focus on first is how movement is affecting your energy."
    if selected_thread == "social":
        return "The part I'd focus on first is how the social side felt for you."
    return "The part I'd focus on first is what feels most active in this right now."


def generate_thread_question(selected_thread: Optional[str]) -> str:
    if not selected_thread or selected_thread not in thread_questions:
        return "What feels like the biggest part of it right now?"

    return random.choice(thread_questions[selected_thread])


def generate_iteration2_reply(
    tone: str,
    themes: List[str],
    intensity: float,
    selected_thread: Optional[str],
) -> str:
    acknowledgement = generate_acknowledgement(tone, themes, intensity)
    bridge = generate_thread_bridge(selected_thread)
    question = generate_thread_question(selected_thread)
    return f"{acknowledgement} {bridge} {question}"
