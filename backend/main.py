from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

from extractors import (
    extract_intensity,
    extract_points,
    extract_sentiment,
    extract_themes,
    extract_tone,
    normalize_text,
    tokenize,
)
from responses import generate_iteration2_reply
from thread_selector import get_future_lane, score_threads, select_thread, build_thread_evidence

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    message: str


@app.post("/chat")
def chat(payload: Message):
    raw_text = payload.message
    text = normalize_text(raw_text)

    pos, neg = extract_sentiment(text)
    tone = extract_tone(pos, neg)
    word_count = len(tokenize(text))
    intensity = extract_intensity(pos, neg, raw_text, word_count)
    themes = extract_themes(text)
    positive_points, negative_points = extract_points(text)

    thread_scores = score_threads(text, themes, positive_points, negative_points)
    selected_thread = select_thread(thread_scores)
    future_lane = get_future_lane(selected_thread)
    thread_evidence = build_thread_evidence(text, themes, positive_points, negative_points)

    if tone == "neutral" and intensity < 0.2:
        selected_thread = None
        future_lane = None
        thread_scores = {}
        thread_evidence = {}

    reply = generate_iteration2_reply(
        tone=tone,
        themes=themes,
        intensity=intensity,
        selected_thread=selected_thread,
    )

    return {
        "reply": reply,
        "emotion": tone,
        "intensity": intensity,
        "themes": themes,
        "positive_points": positive_points,
        "negative_points": negative_points,
        "selected_thread": selected_thread,
        "future_lane": future_lane,
        "thread_scores": thread_scores,
        "thread_evidence": thread_evidence,
        "debug": {
            "pos_score": pos,
            "neg_score": neg,
            "word_count": word_count,
        },
    }

