"""Shared NLP + scoring pipeline for the first user message of a check-in (same logic as /chat)."""

from dataclasses import dataclass
from typing import Any

from app.chat.scoring import compute_day_score
from app.nlp.extractors import (
    detect_contrast,
    detect_internal_discomfort,
    detect_strain,
    detect_strong_distress,
    extract_intensity,
    extract_points,
    extract_sentiment,
    extract_themes,
    extract_tone,
    normalize_text,
    tokenize,
)
from app.resolution.thread_selector import (
    build_thread_evidence,
    get_future_lane,
    score_threads,
    select_thread,
)


@dataclass(frozen=True)
class FirstMessageAnalysis:
    raw_text: str
    text: str
    pos: float
    neg: float
    strain: bool
    strong_distress: bool
    contrast: bool
    internal_discomfort: bool
    tone: str
    intensity: float
    themes: list[str]
    positive_points: list[str]
    negative_points: list[str]
    thread_scores: dict[str, Any]
    selected_thread: str | None
    future_lane: str | None
    thread_evidence: dict[str, Any]
    positive_reflection_mode: bool
    day_score: int
    word_count: int


def analyze_first_message(raw_text: str) -> FirstMessageAnalysis:
    """Run the same feature extraction as POST /chat for storing a daily check-in."""
    text = normalize_text(raw_text)

    pos, neg = extract_sentiment(text)
    strain = detect_strain(text)
    strong_distress = detect_strong_distress(text)
    contrast = detect_contrast(text)
    internal_discomfort = detect_internal_discomfort(text)

    tone = extract_tone(
        pos,
        neg,
        strain_detected=strain,
        strong_distress=strong_distress,
        contrast_detected=contrast,
        internal_discomfort=internal_discomfort,
    )

    word_count = len(tokenize(text))
    intensity = extract_intensity(pos, neg, raw_text, word_count)

    if strong_distress:
        intensity = max(intensity, 0.45)
    elif strain or internal_discomfort:
        intensity = max(intensity, 0.25)

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

    positive_reflection_mode = tone == "positive" and not negative_points

    day_score = compute_day_score(
        tone=tone,
        pos=pos,
        neg=neg,
        strain_detected=strain,
        strong_distress_detected=strong_distress,
        intensity=intensity,
    )

    return FirstMessageAnalysis(
        raw_text=raw_text,
        text=text,
        pos=pos,
        neg=neg,
        strain=strain,
        strong_distress=strong_distress,
        contrast=contrast,
        internal_discomfort=internal_discomfort,
        tone=tone,
        intensity=intensity,
        themes=themes,
        positive_points=positive_points,
        negative_points=negative_points,
        thread_scores=thread_scores,
        selected_thread=selected_thread,
        future_lane=future_lane,
        thread_evidence=thread_evidence,
        positive_reflection_mode=positive_reflection_mode,
        day_score=day_score,
        word_count=word_count,
    )
