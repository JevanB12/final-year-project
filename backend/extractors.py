import re
from typing import List, Tuple

from lexicons import (
    NEGATION_WORDS,
    intensifiers,
    lack_phrases,
    negative_phrases,
    negative_words,
    negated_wellbeing_phrases,
    positive_phrases,
    positive_words,
    support_cues,
    themes_map,
)


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> List[str]:
    return text.split()


def extract_sentiment(text: str) -> Tuple[float, float]:
    words = tokenize(text)
    pos_score = 0.0
    neg_score = 0.0

    for i, word in enumerate(words):
        multiplier = 1.0
        prev_word = words[i - 1] if i > 0 else None

        if prev_word in intensifiers:
            multiplier = intensifiers[prev_word]

        negated = prev_word in NEGATION_WORDS

        if word in positive_words:
            if negated:
                neg_score += positive_words[word] * multiplier
            else:
                pos_score += positive_words[word] * multiplier

        if word in negative_words:
            neg_score += negative_words[word] * multiplier

    for phrase, weight in positive_phrases.items():
        if phrase in text:
            pos_score += weight

    for phrase, weight in negative_phrases.items():
        if phrase in text:
            neg_score += weight

    for phrase, weight in negated_wellbeing_phrases.items():
        if phrase in text:
            neg_score += weight

    for phrase, weight in lack_phrases.items():
        if phrase in text:
            neg_score += weight

    if neg_score > 0:
        for cue, weight in support_cues.items():
            if cue in text:
                neg_score += weight

    return pos_score, neg_score


def extract_tone(pos: float, neg: float) -> str:
    if pos == 0 and neg == 0:
        return "neutral"
    if pos > 0 and neg > 0 and abs(pos - neg) <= 1.5:
        return "mixed"
    if pos > neg:
        return "positive"
    return "negative"


def detect_intensity_modifiers(raw_text: str) -> float:
    score = 0.0
    words = raw_text.split()

    if any(word.isupper() and len(word) > 2 for word in words):
        score += 1.5

    if any(len(set(word)) < len(word) / 2 for word in words if len(word) > 2):
        score += 1.0

    if "!" in raw_text:
        score += 0.5

    return score


def extract_intensity(pos: float, neg: float, raw_text: str = "", word_count: int = 1) -> float:
    base_intensity = (pos + neg) / max(1, word_count)
    modifier = detect_intensity_modifiers(raw_text)
    return min(1.0, base_intensity + modifier)


def extract_themes(text: str) -> List[str]:
    found = []
    tokens = set(tokenize(text))

    for theme, keywords in themes_map.items():
        for keyword in keywords:
            if " " in keyword:
                if keyword in text:
                    found.append(theme)
                    break
            else:
                if keyword in tokens:
                    found.append(theme)
                    break

    return found


def extract_points(text: str):
    words = tokenize(text)
    positives = []
    negatives = []

    for word in words:
        if word in positive_words and word not in positives:
            positives.append(word)
        if word in negative_words and word not in negatives:
            negatives.append(word)

    for phrase in positive_phrases:
        if phrase in text and phrase not in positives:
            positives.append(phrase)

    for phrase in negative_phrases:
        if phrase in text and phrase not in negatives:
            negatives.append(phrase)

    return positives, negatives
