from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

from extractors import (
    detect_strain,
    extract_intensity,
    extract_points,
    extract_sentiment,
    extract_themes,
    extract_tone,
    normalize_text,
    tokenize,
)
from hypothesis_reaction import classify_hypothesis_reaction
from responses import generate_iteration2_reply
from thread_resolution import resolve_thread
from thread_selector import get_future_lane, score_threads, select_thread, build_thread_evidence
from sub_issue_resolution import resolve_sub_issue
from suggestion_mapper import map_suggestion_target
from action_generator import generate_action

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


class ReactionPayload(BaseModel):
    reply: str
    selected_thread: str


class ThreadResolutionPayload(BaseModel):
    selected_thread: Optional[str] = None
    reaction: str
    redirected_thread: Optional[str] = None
    themes: List[str] = Field(default_factory=list)
    tried_threads: List[str] = Field(default_factory=list)


class SubIssueResolutionPayload(BaseModel):
    resolved_thread: str
    user_text: str
    tried_sub_issues: List[str] = Field(default_factory=list)


class SuggestionMapPayload(BaseModel):
    resolved_thread: str
    sub_issue: str


class ActionGenerationPayload(BaseModel):
    resolved_thread: str
    sub_issue: str
    suggestion_target: str
    user_text: str = ""


@app.post("/chat")
def chat(payload: Message):
    raw_text = payload.message
    text = normalize_text(raw_text)

    pos, neg = extract_sentiment(text)
    tone = extract_tone(pos, neg)
    word_count = len(tokenize(text))
    intensity = extract_intensity(pos, neg, raw_text, word_count)
    strain = detect_strain(text)
    if strain and tone == "neutral":
        tone = "mixed"
        intensity = min(1.0, intensity + 0.15)
    themes = extract_themes(text)
    positive_points, negative_points = extract_points(text)

    thread_scores = score_threads(text, themes, positive_points, negative_points)
    selected_thread = select_thread(thread_scores)
    future_lane = get_future_lane(selected_thread)
    thread_evidence = build_thread_evidence(text, themes, positive_points, negative_points)

    _fatigue_words = {"tired", "exhausted", "drained", "no energy"}
    _has_fatigue = any(word in text for word in _fatigue_words)
    if tone == "neutral" and intensity < 0.2 and not negative_points and not _has_fatigue:
        selected_thread = None
        future_lane = None
        thread_scores = {}
        thread_evidence = {}

    reply = generate_iteration2_reply(
        tone=tone,
        themes=themes,
        intensity=intensity,
        selected_thread=selected_thread,
        text=text,
        negative_points=negative_points,
        strain_detected=strain,
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


@app.post("/classify-reaction")
def classify_reaction(payload: ReactionPayload):
    return classify_hypothesis_reaction(
        reply_text=payload.reply,
        selected_thread=payload.selected_thread,
    )


@app.post("/resolve-thread")
def resolve_thread_endpoint(payload: ThreadResolutionPayload):
    return resolve_thread(
        selected_thread=payload.selected_thread,
        reaction=payload.reaction,
        redirected_thread=payload.redirected_thread,
        themes=payload.themes,
        tried_threads=payload.tried_threads,
    )


@app.post("/resolve-sub-issue")
def resolve_sub_issue_endpoint(payload: SubIssueResolutionPayload):
    return resolve_sub_issue(
        resolved_thread=payload.resolved_thread,
        user_text=payload.user_text,
        tried_sub_issues=payload.tried_sub_issues,
    )


@app.post("/map-suggestion")
def map_suggestion_endpoint(payload: SuggestionMapPayload):
    return map_suggestion_target(
        resolved_thread=payload.resolved_thread,
        sub_issue=payload.sub_issue,
    )


@app.post("/generate-action")
def generate_action_endpoint(payload: ActionGenerationPayload):
    return generate_action(
        resolved_thread=payload.resolved_thread,
        sub_issue=payload.sub_issue,
        suggestion_target=payload.suggestion_target,
        user_text=payload.user_text,
    )
