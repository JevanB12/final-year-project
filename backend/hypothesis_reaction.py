import re
from typing import Dict, List, Optional


SUPPORTED_THREADS = {
    "sleep_rest",
    "work_study_routine",
    "physical_activity",
    "meals_regularity",
    "daily_structure",
}

AGREE_CUES = {
    "yes",
    "yeah",
    "yep",
    "definitely",
    "for sure",
    "that fits",
    "that sounds right",
    "exactly",
    "spot on",
    "i think so",
    "it fits",
    "true",
}

REJECT_CUES = {
    "no",
    "nah",
    "not really",
    "dont think so",
    "don't think so",
    "not at all",
    "thats not it",
    "that's not it",
    "not the issue",
    "has been fine",
    "been fine",
}

UNSURE_CUES = {
    "maybe",
    "maybe a bit",
    "not sure",
    "unsure",
    "kind of",
    "kinda",
    "a little",
    "a bit",
    "possibly",
    "i guess",
    "hard to tell",
}

REDIRECT_CUES = {
    "more",
    "more like",
    "more so",
    "instead",
    "rather",
    "actually",
    "its more",
    "it's more",
    "its mostly",
    "it's mostly",
    "its mainly",
    "it's mainly",
}

THREAD_KEYWORDS = {
    "sleep_rest": {
        "sleep",
        "rest",
        "tired",
        "tiredness",
        "energy",
        "exhausted",
        "drained",
        "fatigue",
    },
    "work_study_routine": {
        "work",
        "workload",
        "study",
        "studying",
        "uni",
        "school",
        "college",
        "deadline",
        "assignment",
        "coursework",
        "exam",
        "pressure",
    },
    "physical_activity": {
        "activity",
        "active",
        "exercise",
        "training",
        "workout",
        "gym",
        "sport",
        "sports",
        "running",
        "recovery",
    },
    "meals_regularity": {
        "meal",
        "meals",
        "eat",
        "eating",
        "food",
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "diet",
        "hungry",
    },
    "daily_structure": {
        "routine",
        "schedule",
        "structure",
        "nonstop",
        "packed",
        "busy",
        "breathing room",
        "downtime",
        "one thing after another",
    },
}

UNKNOWN_REDIRECT_CUES = {
    "family",
    "relationship",
    "relationships",
    "partner",
    "money",
    "finance",
    "financial",
    "rent",
    "housing",
    "home",
    "grief",
    "loss",
    "lonely",
    "loneliness",
}


def normalize_reaction_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _count_cue_hits(text: str, cues: set[str]) -> tuple[int, List[str]]:
    matched = [cue for cue in cues if cue in text]
    return len(matched), matched


def _find_terms_for_thread(text: str, thread: str) -> List[str]:
    found = []
    for term in THREAD_KEYWORDS.get(thread, set()):
        if term in text:
            found.append(term)
    return sorted(found)


def _selected_downplay_score(text: str, selected_thread: str) -> tuple[int, List[str]]:
    score = 0
    matched = []
    selected_terms = THREAD_KEYWORDS.get(selected_thread, set())

    for term in selected_terms:
        if f"not {term}" in text:
            score += 1
            matched.append(f"not {term}")
        if f"{term} has been fine" in text or f"{term} been fine" in text:
            score += 2
            matched.append(f"{term} has been fine")

    downplay_phrases = {"not really", "dont think", "don't think", "not the issue", "fine"}
    for phrase in downplay_phrases:
        if phrase in text:
            score += 1
            matched.append(phrase)

    return score, sorted(set(matched))


def detect_known_redirect_threads(reply_text: str, selected_thread: str) -> List[str]:
    text = normalize_reaction_text(reply_text)
    found_threads = []

    for thread in SUPPORTED_THREADS:
        if thread == selected_thread:
            continue
        terms = _find_terms_for_thread(text, thread)
        if terms:
            found_threads.append(thread)

    return sorted(found_threads)


def extract_unsupported_redirect_text(reply_text: str, selected_thread: str, found_threads: List[str]) -> str | None:
    text = normalize_reaction_text(reply_text)
    if found_threads:
        return None

    unknown_hits = [cue for cue in UNKNOWN_REDIRECT_CUES if cue in text]
    if unknown_hits:
        return " ".join(sorted(unknown_hits))

    markers = [
        "more like ",
        "more about ",
        "its more ",
        "it's more ",
        "its mostly ",
        "it's mostly ",
        "its mainly ",
        "it's mainly ",
    ]

    for marker in markers:
        if marker not in text:
            continue
        tail = text.split(marker, 1)[1].strip()
        if not tail:
            continue
        # Keep it short and focused for logging unsupported redirect reason.
        candidate = " ".join(tail.split()[:8]).strip()
        generic = {"this", "that", "it", "everything", "nothing"}
        if candidate and candidate not in generic:
            return candidate

    return None


def _compute_confidence(primary_score: int, secondary_score: int, reaction: str) -> float:
    if reaction == "redirect":
        base = 0.72
    elif reaction == "agree":
        base = 0.68
    elif reaction == "reject":
        base = 0.66
    else:
        base = 0.52

    margin = max(0, primary_score - secondary_score)
    confidence = base + min(0.23, 0.07 * margin)
    return round(min(0.95, max(0.35, confidence)), 2)


def classify_hypothesis_reaction(reply_text: str, selected_thread: str) -> Dict:
    normalized = normalize_reaction_text(reply_text)
    selected_thread = selected_thread if selected_thread in SUPPORTED_THREADS else ""

    agree_score, agree_matches = _count_cue_hits(normalized, AGREE_CUES)
    reject_score, reject_matches = _count_cue_hits(normalized, REJECT_CUES)
    unsure_score, unsure_matches = _count_cue_hits(normalized, UNSURE_CUES)
    redirect_cue_score, redirect_cue_matches = _count_cue_hits(normalized, REDIRECT_CUES)

    found_threads = detect_known_redirect_threads(normalized, selected_thread)
    found_terms = []
    for thread in found_threads:
        for term in _find_terms_for_thread(normalized, thread):
            found_terms.append(f"{thread}:{term}")

    downplay_score, downplay_matches = _selected_downplay_score(normalized, selected_thread)
    unsupported_text = extract_unsupported_redirect_text(normalized, selected_thread, found_threads)
    found_unknown_redirect_cue = unsupported_text is not None

    redirect_score = redirect_cue_score
    if found_threads:
        redirect_score += 2
    if unsupported_text:
        redirect_score += 2
    if downplay_score > 0:
        redirect_score += 1

    notes: List[str] = []

    has_redirect_target = bool(found_threads) or bool(unsupported_text)
    move_away_signal = downplay_score > 0 or reject_score > 0 or redirect_cue_score > 0

    reaction = "unsure"
    redirected_thread: Optional[str] = None
    redirected_text: Optional[str] = None
    redirect_supported = False

    if has_redirect_target and move_away_signal:
        reaction = "redirect"
        if found_threads:
            redirected_thread = found_threads[0]
            redirect_supported = True
            notes.append("User moved away from selected thread and pointed to another supported thread.")
        else:
            redirected_text = unsupported_text
            redirect_supported = False
            notes.append("User moved away from selected thread and pointed to an unsupported issue.")
    elif agree_score > 0 and reject_score == 0 and unsure_score == 0:
        reaction = "agree"
        notes.append("Agreement cues with no rejection or uncertainty cues.")
    elif reject_score > 0 and agree_score == 0 and not has_redirect_target:
        reaction = "reject"
        notes.append("Rejection cues with no clear redirect target.")
    elif unsure_score > 0 or (agree_score > 0 and reject_score > 0):
        reaction = "unsure"
        notes.append("Uncertainty or mixed cues detected.")
    else:
        reaction = "unsure"
        notes.append("Signals were weak or ambiguous; defaulted to unsure.")

    primary = max(agree_score, reject_score, redirect_score, unsure_score)
    secondary = sorted([agree_score, reject_score, redirect_score, unsure_score], reverse=True)[1]
    confidence = _compute_confidence(primary, secondary, reaction)

    return {
        "reaction": reaction,
        "confidence": confidence,
        "redirected_thread": redirected_thread,
        "redirected_text": redirected_text,
        "redirect_supported": redirect_supported,
        "matched_signals": {
            "agree": sorted(set(agree_matches)),
            "reject": sorted(set(reject_matches + downplay_matches)),
            "redirect": sorted(set(redirect_cue_matches + found_terms)),
            "unsure": sorted(set(unsure_matches)),
        },
        "debug": {
            "agree_score": agree_score,
            "reject_score": reject_score,
            "redirect_score": redirect_score,
            "unsure_score": unsure_score,
            "found_known_thread_terms": found_terms,
            "found_unknown_redirect_cue": found_unknown_redirect_cue,
            "notes": notes,
            "normalized_text": normalized,
            "selected_thread": selected_thread,
        },
    }
