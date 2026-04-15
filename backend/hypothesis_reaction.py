import re
from typing import Dict, List, Optional


SUPPORTED_THREADS = {
    "sleep_rest",
    "work_study_routine",
    "physical_activity",
    "meals_regularity",
    "daily_structure",
}

POSITIVE_STATE_CUES = {
    "good",
    "fine",
    "okay",
    "ok",
    "alright",
    "great",
    "better",
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

LEANING_ACCEPT_CUES = {
    "i guess",
    "probably",
    "maybe yeah",
    "i think",
    "seems like",
    "might be",
    "could be",
    "tbf",
    "to be fair",
}

OPEN_CLARIFICATION_VAGUE_CUES = {
    "yes",
    "yeah",
    "it does",
    "kind of",
    "a little",
    "a bit",
    "maybe",
    "more mental",
    "more physical",
    "pressure",
    "tiredness",
    "switch off",
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
        "not sleeping properly",
        "sleep hasn't been great",
        "sleep hasnt been great",
        "sleep hasn't been disciplined",
        "sleep hasnt been disciplined",
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


def _contains_phrase(text: str, phrase: str) -> bool:
    pattern = rf"(?<!\w){re.escape(phrase)}(?!\w)"
    return re.search(pattern, text) is not None


def _count_cue_hits(text: str, cues: set[str]) -> tuple[int, List[str]]:
    matched = [cue for cue in cues if _contains_phrase(text, cue)]
    return len(matched), matched


def _find_terms_for_thread(text: str, thread: str) -> List[str]:
    found = []
    for term in THREAD_KEYWORDS.get(thread, set()):
        if _contains_phrase(text, term):
            found.append(term)
    return sorted(found)


def _selected_positive_state_score(text: str, selected_thread: str) -> tuple[int, List[str]]:
    score = 0
    matched = []
    selected_terms = THREAD_KEYWORDS.get(selected_thread, set())

    for term in selected_terms:
        for cue in POSITIVE_STATE_CUES:
            if _contains_phrase(text, term) and _contains_phrase(text, cue):
                score += 2
                matched.append(f"{term} + {cue}")
    return score, sorted(set(matched))


def _selected_downplay_score(text: str, selected_thread: str) -> tuple[int, List[str]]:
    score = 0
    matched = []
    selected_terms = THREAD_KEYWORDS.get(selected_thread, set())

    negators = {
        "not",
        "isnt",
        "isn't",
        "wasnt",
        "wasn't",
        "dont",
        "don't",
        "not really",
        "not the",
    }

    # Direct negation of selected-thread terms
    for term in selected_terms:
        normalized_term = term.strip()

        if not normalized_term:
            continue

        # Exact and near-exact negation patterns
        patterns = [
            f"not {normalized_term}",
            f"not really {normalized_term}",
            f"don't think it's {normalized_term}",
            f"dont think its {normalized_term}",
            f"it's not {normalized_term}",
            f"its not {normalized_term}",
            f"{normalized_term} has been fine",
            f"{normalized_term} been fine",
        ]

        for pattern in patterns:
            if pattern in text:
                score += 2
                matched.append(pattern)

        # Catch phrases like "not low energy", "not tired", "not exhausted"
        words = normalized_term.split()
        if words:
            first_word = words[0]
            if f"not {first_word}" in text and normalized_term in text:
                score += 2
                matched.append(f"not {normalized_term}")

    # More general rejection / downplay cues
    downplay_phrases = {
        "not really",
        "dont think",
        "don't think",
        "not the issue",
        "that's not it",
        "thats not it",
        "fine",
        "been fine",
        "has been fine",
    }

    for phrase in downplay_phrases:
        if phrase in text:
            score += 1
            matched.append(phrase)

    # Strong special-case handling for sleep/energy wording
    if selected_thread == "sleep_rest":
        sleep_downplays = [
            "not low energy",
            "not tired",
            "not exhausted",
            "sleep has been fine",
            "my sleep has been fine",
            "sleep has been good",
            "my sleep has been good",
            "rest has been fine",
            "not really sleep",
            "dont think its sleep",
            "don't think it's sleep",
        ]
        for phrase in sleep_downplays:
            if phrase in text:
                score += 3
                matched.append(phrase)

    return score, sorted(set(matched))

def _soft_agree_with_current_thread(
    text: str,
    selected_thread: str,
    agree_score: int,
    reject_score: int,
    redirect_cue_score: int,
    found_threads: List[str],
) -> tuple[bool, List[str]]:
    if not selected_thread:
        return False, []

    selected_terms = _find_terms_for_thread(text, selected_thread)
    leaning_hits = [cue for cue in LEANING_ACCEPT_CUES if _contains_phrase(text, cue)]

    if reject_score > 0:
        return False, []
    if redirect_cue_score > 0 and found_threads:
        return False, []
    if not selected_terms:
        return False, []
    if agree_score > 0:
        return True, [f"current_thread:{term}" for term in selected_terms]
    if leaning_hits:
        return True, [*sorted(set(leaning_hits)), *[f"current_thread:{term}" for term in selected_terms]]

    return False, []


def _has_vague_open_clarification_agreement(text: str) -> bool:
    return any(_contains_phrase(text, cue) for cue in OPEN_CLARIFICATION_VAGUE_CUES)


def _has_explicit_selected_thread_reference(text: str, selected_thread: str) -> bool:
    if not selected_thread:
        return False
    return len(_find_terms_for_thread(text, selected_thread)) > 0


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
        candidate = " ".join(tail.split()[:8]).strip()
        generic = {"this", "that", "it", "everything", "nothing"}
        if candidate and candidate not in generic:
            return candidate

    return None


def is_agree_with_explanation(reply_text: str, selected_thread: str, found_threads: list, agree_score: int) -> bool:
    if agree_score == 0 or not selected_thread or not found_threads:
        return False
    text = reply_text.lower()

    causal_cues = ["because", "so", "to ", "which is why", "thats why", "that's why", "due to"]
    if not any(cue in text for cue in causal_cues):
        return False

    if selected_thread not in text:
        if selected_thread == "sleep_rest" and "sleep" not in text:
            return False

    if selected_thread == "sleep_rest":
        sleep_phrases = [
            "cut it short",
            "cut sleep short",
            "not getting enough sleep",
            "less sleep",
            "sleep less",
        ]
        if any(phrase in text for phrase in sleep_phrases):
            work_terms = THREAD_KEYWORDS.get("work_study_routine", set())
            if any(term in text for term in work_terms):
                return True

    return True


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


def classify_hypothesis_reaction(
    reply_text: str,
    selected_thread: Optional[str],
    tried_threads: Optional[List[str]] = None,
) -> Dict:
    normalized = normalize_reaction_text(reply_text)
    selected_thread = selected_thread if selected_thread in SUPPORTED_THREADS else ""
    tried_threads = [thread for thread in (tried_threads or []) if thread in SUPPORTED_THREADS]

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
    positive_state_score, positive_state_matches = _selected_positive_state_score(normalized, selected_thread)
    unsupported_text = extract_unsupported_redirect_text(normalized, selected_thread, found_threads)

    redirect_score = redirect_cue_score
    if found_threads:
        redirect_score += 2
    if unsupported_text:
        redirect_score += 2
    if downplay_score > 0:
        redirect_score += 1

    reject_score += positive_state_score

    notes: List[str] = []
    selected_thread_previously_rejected = bool(selected_thread and selected_thread in tried_threads)
    explicit_selected_thread_reference = _has_explicit_selected_thread_reference(normalized, selected_thread)
    no_active_selected_thread = not selected_thread
    vague_open_clarification_agreement = _has_vague_open_clarification_agreement(normalized)

    has_redirect_target = bool(found_threads) or bool(unsupported_text)
    move_away_signal = downplay_score > 0 or reject_score > 0 or redirect_cue_score > 0

    soft_agree, soft_agree_matches = _soft_agree_with_current_thread(
        text=normalized,
        selected_thread=selected_thread,
        agree_score=agree_score,
        reject_score=reject_score,
        redirect_cue_score=redirect_cue_score,
        found_threads=found_threads,
    )

    reaction = "unsure"
    redirected_thread: Optional[str] = None
    redirected_text: Optional[str] = None
    redirect_supported = False

    if no_active_selected_thread and vague_open_clarification_agreement and not has_redirect_target:
        reaction = "unsure"
        notes.append("No active hypothesis thread; vague agreement treated as open clarification signal.")
    elif has_redirect_target and move_away_signal:
        if is_agree_with_explanation(reply_text, selected_thread, found_threads, agree_score):
            reaction = "agree"
            notes.append("User agreed with the selected thread and explained its cause.")
        else:
            reaction = "redirect"
            if found_threads:
                redirected_thread = found_threads[0]
                redirect_supported = True
                notes.append("User moved away from selected thread and pointed to another supported thread.")
            else:
                redirected_text = unsupported_text
                redirect_supported = False
                notes.append("User moved away from selected thread and pointed to an unsupported issue.")
    elif reject_score > unsure_score and not has_redirect_target:
        reaction = "reject"
        notes.append("Rejection stronger than uncertainty.")
    elif soft_agree:
        if selected_thread_previously_rejected and not explicit_selected_thread_reference:
            reaction = "unsure"
            notes.append(
                "Current thread was previously rejected; soft agreement ignored without explicit thread mention."
            )
        else:
            reaction = "agree"
            notes.append("User showed soft agreement with the current thread.")
    elif agree_score > 0 and reject_score == 0 and unsure_score == 0 and selected_thread:
        if selected_thread_previously_rejected and not explicit_selected_thread_reference:
            reaction = "unsure"
            notes.append(
                "Current thread was previously rejected; plain agreement ignored without explicit thread mention."
            )
        else:
            reaction = "agree"
            notes.append("Agreement cues with no rejection or uncertainty cues.")
    elif agree_score > 0 and reject_score == 0 and unsure_score == 0 and not selected_thread:
        reaction = "unsure"
        notes.append("Agreement cues detected with no active hypothesis thread; keeping clarification open.")
    elif unsure_score > 0:
        reaction = "unsure"
        notes.append("Uncertainty cues detected.")
    else:
        reaction = "unsure"
        notes.append("Signals were weak or ambiguous; defaulted to unsure.")

    primary = max(agree_score, reject_score, redirect_score, unsure_score)
    secondary = sorted([agree_score, reject_score, redirect_score, unsure_score], reverse=True)[1]

    return {
        "reaction": reaction,
        "redirected_thread": redirected_thread,
        "redirected_text": redirected_text,
        "redirect_supported": redirect_supported,
        "confidence": _compute_confidence(primary, secondary, reaction),
        "matched_signals": {
            "agree": sorted(set(agree_matches + soft_agree_matches)),
            "reject": sorted(set(reject_matches + downplay_matches + positive_state_matches)),
            "redirect": sorted(set(redirect_cue_matches + found_terms)),
            "unsure": sorted(set(unsure_matches)),
        },
        "notes": notes,
        "debug": {
            "agree_score": agree_score,
            "reject_score": reject_score,
            "redirect_score": redirect_score,
            "unsure_score": unsure_score,
            "selected_thread": selected_thread or None,
            "has_active_selected_thread": not no_active_selected_thread,
            "selected_thread_previously_rejected": selected_thread_previously_rejected,
            "explicit_selected_thread_reference": explicit_selected_thread_reference,
            "vague_open_clarification_agreement": vague_open_clarification_agreement,
            "tried_threads_context": tried_threads,
        },
    }