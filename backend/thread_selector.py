from typing import Dict, List

from lexicons import (
    negative_phrases,
    negative_words,
    ongoing_cues,
    present_cues,
    positive_phrases,
    positive_words,
    themes_map,
    urgent_phrases,
)


def _theme_hits(text: str, theme: str) -> List[str]:
    hits = []
    for keyword in themes_map.get(theme, []):
        if " " in keyword:
            if keyword in text:
                hits.append(keyword)
        else:
            if keyword in text.split():
                hits.append(keyword)
    return hits


def _theme_negative_hits(text: str) -> List[str]:
    hits = []
    words = text.split()

    for word in words:
        if word in negative_words and word not in hits:
            hits.append(word)

    for phrase in negative_phrases:
        if phrase in text and phrase not in hits:
            hits.append(phrase)

    return hits


def _theme_positive_hits(text: str) -> List[str]:
    hits = []
    words = text.split()

    for word in words:
        if word in positive_words and word not in hits:
            hits.append(word)

    for phrase in positive_phrases:
        if phrase in text and phrase not in hits:
            hits.append(phrase)

    return hits


def build_thread_evidence(text: str, themes: List[str]) -> Dict[str, dict]:
    evidence = {}

    global_negative_hits = _theme_negative_hits(text)
    global_positive_hits = _theme_positive_hits(text)

    for theme in themes:
        theme_hits = _theme_hits(text, theme)

        ongoing_score = 0.0
        present_score = 0.0
        urgency_score = 0.0
        burden_score = 0.0
        resolved_penalty = 0.0

        for cue in ongoing_cues:
            if cue in text:
                ongoing_score += 0.5

        for cue in present_cues:
            if cue in text:
                present_score += 0.5

        for phrase, weight in urgent_phrases.items():
            if phrase in text:
                urgency_score += weight

        if theme in {"sleep", "recovery"}:
            for hit in global_negative_hits:
                if hit in {"tired", "exhausted", "drained", "worn", "rough", "out of it"}:
                    burden_score += 1.0

        if theme == "work":
            for hit in global_negative_hits:
                if hit in {
                    "stressed",
                    "stress",
                    "overwhelmed",
                    "frustrated",
                    "behind",
                    "pressure",
                    "too many deadlines",
                    "cant keep up",
                    "can't keep up",
                    "falling behind",
                    "hard to manage",
                    "hard to handle",
                }:
                    burden_score += 1.0

        if theme == "movement":
            for hit in global_positive_hits:
                if hit in {"good", "great", "good session", "felt good"}:
                    resolved_penalty += 1.0

        if theme == "social":
            for hit in global_positive_hits:
                if hit in {"good", "nice", "fun", "enjoyed", "had fun"}:
                    resolved_penalty += 1.0

        base_score = 1.0 if theme_hits else 0.0

        if theme in {"movement", "social"} and burden_score == 0 and resolved_penalty > 0:
            resolved_penalty += 1.0

        evidence[theme] = {
            "hits": theme_hits,
            "negative_hits": global_negative_hits,
            "positive_hits": global_positive_hits,
            "ongoing_score": round(ongoing_score, 2),
            "present_score": round(present_score, 2),
            "urgency_score": round(urgency_score, 2),
            "burden_score": round(burden_score, 2),
            "resolved_penalty": round(resolved_penalty, 2),
            "base_score": round(base_score, 2),
        }

    return evidence


def score_threads(text: str, themes: List[str]) -> Dict[str, float]:
    evidence = build_thread_evidence(text, themes)
    scores = {}

    for theme, info in evidence.items():
        score = (
            info["base_score"]
            + info["ongoing_score"]
            + info["present_score"]
            + info["urgency_score"]
            + info["burden_score"]
            - info["resolved_penalty"]
        )
        scores[theme] = round(score, 2)

    return scores


def select_thread(scores: Dict[str, float], themes: List[str]) -> str | None:
    if not scores:
        return themes[0] if themes else None

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    best_theme, best_score = ranked[0]

    if best_score <= 0 and themes:
        return themes[0]

    return best_theme
