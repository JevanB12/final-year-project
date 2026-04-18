from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_user
from app.chat.analysis import analyze_first_message
from app.chat.responses import generate_iteration2_reply
from app.db.crud import create_checkin
from app.db.database import SessionLocal
from app.db.models import User
from app.resolution.action_generator import generate_action
from app.resolution.hypothesis_reaction import classify_hypothesis_reaction
from app.resolution.sub_issue_resolution import resolve_sub_issue
from app.resolution.suggestion_mapper import map_suggestion_target
from app.resolution.thread_resolution import resolve_thread

router = APIRouter()


class Message(BaseModel):
    message: str


class ReactionPayload(BaseModel):
    reply: str
    selected_thread: Optional[str] = None
    tried_threads: List[str] = Field(default_factory=list)


class ThreadResolutionPayload(BaseModel):
    selected_thread: Optional[str] = None
    reaction: str
    redirected_thread: Optional[str] = None
    user_text: str = ""
    themes: List[str] = Field(default_factory=list)
    candidate_threads: List[str] = Field(default_factory=list)
    tried_threads: List[str] = Field(default_factory=list)
    rejected_threads: List[str] = Field(default_factory=list)
    rejection_count: int = 0


class SubIssueResolutionPayload(BaseModel):
    resolved_thread: str
    user_text: str
    tried_sub_issues: List[str] = Field(default_factory=list)
    candidate_sub_issues: List[str] = Field(default_factory=list)


class SuggestionMapPayload(BaseModel):
    resolved_thread: str
    sub_issue: str


class ActionGenerationPayload(BaseModel):
    resolved_thread: str
    sub_issue: str
    suggestion_target: str
    user_text: str = ""


@router.post("/chat")
def chat(payload: Message, current_user: User = Depends(get_current_user)):
    raw_text = payload.message
    a = analyze_first_message(raw_text)

    reply = generate_iteration2_reply(
        tone=a.tone,
        themes=a.themes,
        intensity=a.intensity,
        selected_thread=a.selected_thread,
        text=a.text,
        negative_points=a.negative_points,
        strain_detected=a.strain,
    )

    db = SessionLocal()
    try:
        create_checkin(
            db,
            user_id=current_user.id,
            checkin_date=date.today(),
            raw_message=raw_text,
            tone=a.tone,
            intensity=a.intensity,
            selected_thread=a.selected_thread,
            day_score=a.day_score,
            strain_detected=a.strain,
            strong_distress_detected=a.strong_distress,
            themes=a.themes,
            positive_points=a.positive_points,
            negative_points=a.negative_points,
            is_sample=False,
            seed_batch_id=None,
        )
    finally:
        db.close()

    return {
        "reply": reply,
        "emotion": a.tone,
        "tone": a.tone,
        "intensity": a.intensity,
        "themes": a.themes,
        "positive_points": a.positive_points,
        "negative_points": a.negative_points,
        "selected_thread": a.selected_thread,
        "future_lane": a.future_lane,
        "thread_scores": a.thread_scores,
        "thread_evidence": a.thread_evidence,
        "day_score": a.day_score,
        "conversation_type": "positive_reflection"
        if a.positive_reflection_mode
        else "problem_resolution",
        "expects_reaction_classification": not a.positive_reflection_mode,
        "avatar": {
            "tone": a.tone,
            "intensity": a.intensity,
        },
        "debug": {
            "pos_score": a.pos,
            "neg_score": a.neg,
            "word_count": a.word_count,
            "strain_detected": a.strain,
            "strong_distress_detected": a.strong_distress,
            "contrast_detected": a.contrast,
            "internal_discomfort_detected": a.internal_discomfort,
            "positive_reflection_mode": a.positive_reflection_mode,
        },
    }


@router.post("/classify-reaction")
def classify_reaction_endpoint(
    payload: ReactionPayload,
    current_user: User = Depends(get_current_user),
):
    return classify_hypothesis_reaction(
        reply_text=payload.reply,
        selected_thread=payload.selected_thread,
        tried_threads=payload.tried_threads,
    )


@router.post("/resolve-thread")
def resolve_thread_endpoint(
    payload: ThreadResolutionPayload,
    current_user: User = Depends(get_current_user),
):
    return resolve_thread(
        selected_thread=payload.selected_thread,
        reaction=payload.reaction,
        redirected_thread=payload.redirected_thread,
        user_text=payload.user_text,
        themes=payload.themes,
        candidate_threads=payload.candidate_threads,
        tried_threads=payload.tried_threads,
        rejected_threads=payload.rejected_threads,
        rejection_count=payload.rejection_count,
    )


@router.post("/resolve-sub-issue")
def resolve_sub_issue_endpoint(
    payload: SubIssueResolutionPayload,
    current_user: User = Depends(get_current_user),
):
    return resolve_sub_issue(
        resolved_thread=payload.resolved_thread,
        user_text=payload.user_text,
        tried_sub_issues=payload.tried_sub_issues,
        candidate_sub_issues=payload.candidate_sub_issues,
    )


@router.post("/map-suggestion")
def map_suggestion_endpoint(
    payload: SuggestionMapPayload,
    current_user: User = Depends(get_current_user),
):
    return map_suggestion_target(
        resolved_thread=payload.resolved_thread,
        sub_issue=payload.sub_issue,
    )


@router.post("/generate-action")
def generate_action_endpoint(
    payload: ActionGenerationPayload,
    current_user: User = Depends(get_current_user),
):
    return generate_action(
        resolved_thread=payload.resolved_thread,
        sub_issue=payload.sub_issue,
        suggestion_target=payload.suggestion_target,
        user_text=payload.user_text,
    )