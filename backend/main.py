from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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

# --- LEXICONS ---


# --- UPDATED LEXICONS & PHRASES ---
positive_words = {
    "good": 2, "great": 3, "happy": 3, "nice": 1, "productive": 2, "calm": 2, "better": 2, "fun": 2, "relaxed": 2, "enjoyed": 2, "glad": 2
}
negative_words = {
    "stressed": 3, "stress": 3, "overwhelmed": 4, "anxious": 3, "tired": 2, "exhausted": 4, "drained": 3, "frustrated": 3, "upset": 2, "low": 2, "rough": 2, "difficult": 2, "hard": 1, "struggling": 3, "behind": 2, "pressure": 3, "worried": 2, "worn": 2, "burnt": 3
}
intensifiers = {
    "very": 1.3, "really": 1.3, "extremely": 1.6, "so": 1.2, "quite": 1.2
}
themes_map = {
    "work": ["work", "study", "deadline", "deadlines", "assignment", "exam", "revision", "job", "shift", "lecture"],
    "sleep": ["sleep", "slept", "rest", "bed", "bedtime", "nap", "morning"],
    "movement": ["gym", "walk", "run", "workout", "exercise", "training"],
    "social": ["friend", "friends", "family", "social", "people", "met"],
    "recovery": ["break", "rest", "breathe", "recover", "pause", "reset", "free time", "time to myself", "drained", "draining", "tired", "exhausted", "low energy", "burnt out"]
}
positive_phrases = {
    "felt good": 2, "went well": 2, "pretty good": 2, "had fun": 2, "got stuff done": 2, "good session": 2
}
negative_phrases = {
    "too much": 3, "so much": 2, "a lot": 1, "no time": 3, "no free time": 4, "time to myself": 2, "cant keep up": 4, "can't keep up": 4, "falling behind": 3, "one thing after another": 3, "nonstop": 3, "havent stopped": 3, "haven't stopped": 3, "all over the place": 2, "too many deadlines": 4, "too many things": 3, "out of my depth": 4, "hard to manage": 3, "hard to handle": 3, "idk how": 2, "dont know how": 2, "don't know how": 2, "need to breathe": 3, "need a break": 3, "out of it": 2
}
support_cues = {
    "idk": 1, "not sure": 1, "honestly": 1, "just": 0.5, "i guess": 0.5, "maybe": 0.5
}

# --- HELPERS ---


import re
def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def tokenize(text: str) -> list:
    return text.split()


def extract_sentiment(text: str):
    words = tokenize(text)
    pos_score = 0
    neg_score = 0

    # single-word scoring with intensifiers
    for i, word in enumerate(words):
        multiplier = 1.0
        if i > 0 and words[i - 1] in intensifiers:
            multiplier = intensifiers[words[i - 1]]
        if word in positive_words:
            pos_score += positive_words[word] * multiplier
        if word in negative_words:
            neg_score += negative_words[word] * multiplier

    # phrase scoring
    for phrase, weight in positive_phrases.items():
        if phrase in text:
            pos_score += weight
    for phrase, weight in negative_phrases.items():
        if phrase in text:
            neg_score += weight

    # support cues only matter if some negative signal already exists
    if neg_score > 0:
        for cue, weight in support_cues.items():
            if cue in text:
                neg_score += weight

    return pos_score, neg_score


def extract_tone(pos, neg):
    # 1. Neutral if both zero
    if pos == 0 and neg == 0:
        return "neutral"
    # 2. Mixed if both present and close in strength
    if pos > 0 and neg > 0 and abs(pos - neg) <= 1.5:
        return "mixed"
    # 3. Otherwise, whichever is stronger
    if pos > neg:
        return "positive"
    return "negative"

def detect_intensity_modifiers(raw_text):
    score = 0
    words = raw_text.split()
    # ALL CAPS words
    if any(word.isupper() and len(word) > 2 for word in words):
        score += 1.5
    # Repeated letters (e.g. sooo, noooo)
    if any(len(set(word)) < len(word) / 2 for word in words if len(word) > 2):
        score += 1.0
    # Strong punctuation
    if "!" in raw_text:
        score += 0.5
    return score


def extract_intensity(pos, neg, raw_text="", word_count=1):
    base_intensity = (pos + neg) / max(1, word_count)
    modifier = detect_intensity_modifiers(raw_text)
    return min(1.0, base_intensity + modifier)



def extract_themes(text: str):
    found = []
    tokens = set(tokenize(text))
    for theme, keywords in themes_map.items():
        for keyword in keywords:
            if " " in keyword:
                # multi-word phrase: substring match
                if keyword in text:
                    found.append(theme)
                    break
            else:
                # single word: token match
                if keyword in tokens:
                    found.append(theme)
                    break
    return found


def extract_points(text):
    words = tokenize(text)
    positives = []
    negatives = []
    # single words
    for word in words:
        if word in positive_words and word not in positives:
            positives.append(word)
        if word in negative_words and word not in negatives:
            negatives.append(word)
    # phrases
    for phrase in positive_phrases:
        if phrase in text and phrase not in positives:
            positives.append(phrase)
    for phrase in negative_phrases:
        if phrase in text and phrase not in negatives:
            negatives.append(phrase)
    return positives, negatives


def generate_reply(tone, themes, intensity):
    base_response = ""
    if tone == "positive":
        base_response = "Sounds like a good day overall."
    elif tone == "negative":
        base_response = "That sounds like a tough day."
    elif tone == "mixed":
        base_response = "Seems like there were both good and challenging parts."
    else:
        base_response = "Got it — tell me more."
    # Theme-specific tweaks
    theme_addition = ""
    if "work" in themes:
        theme_addition = " Especially with work stuff going on."
    elif "sleep" in themes:
        theme_addition = " Getting rest is important."
    elif "movement" in themes:
        theme_addition = " Nice that you're staying active."
    elif "social" in themes:
        theme_addition = " Connection with people matters."
    elif "recovery" in themes:
        theme_addition = " It also sounds like you haven't had much room to reset."
    # Intensity-aware coda
    intensity_coda = ""
    if intensity > 0.7:
        intensity_coda = " Sounds pretty intense."
    return base_response + theme_addition + intensity_coda

# --- ROUTE ---

@app.post("/chat")
def chat(payload: Message):
    raw_text = payload.message
    text = normalize_text(raw_text)
    pos, neg = extract_sentiment(text)
    tone = extract_tone(pos, neg)
    intensity = extract_intensity(pos, neg, raw_text, len(tokenize(text)))
    themes = extract_themes(text)
    pos_points, neg_points = extract_points(text)
    reply = generate_reply(tone, themes, intensity)
    return {
        "reply": reply,
        "emotion": tone,
        "intensity": intensity,
        "themes": themes,
        "positive_points": pos_points,
        "negative_points": neg_points,
        "debug": {
            "pos_score": pos,
            "neg_score": neg,
            "word_count": len(tokenize(text))
        }
    }