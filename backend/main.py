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

positive_words = {
    "good": 2, "great": 3, "happy": 2, "amazing": 3, "productive": 2,
    "fun": 2, "relaxed": 2, "nice": 1
}

negative_words = {
    "bad": 2, "tired": 2, "stress": 3, "stressed": 3, "sad": 2,
    "exhausted": 3, "overwhelmed": 3, "angry": 3
}

intensifiers = {
    "very": 1.5,
    "really": 1.5,
    "extremely": 2
}

themes_map = {
    "sleep": ["sleep", "tired", "rest", "nap"],
    "work": ["work", "job", "study", "deadline"],
    "exercise": ["gym", "run", "walk", "exercise"],
    "social": ["friends", "family", "people", "social"],
    "diet": ["eat", "food", "meal"]
}

# --- HELPERS ---

def normalize(text):
    return text.lower().split()

def extract_sentiment(words):
    pos_score = 0
    neg_score = 0

    for i, word in enumerate(words):
        multiplier = 1

        if i > 0 and words[i - 1] in intensifiers:
            multiplier = intensifiers[words[i - 1]]

        if word in positive_words:
            pos_score += positive_words[word] * multiplier

        if word in negative_words:
            neg_score += negative_words[word] * multiplier

    return pos_score, neg_score


def extract_tone(pos, neg):
    if pos > neg:
        return "positive"
    elif neg > pos:
        return "negative"
    elif pos > 0 and neg > 0:
        return "mixed"
    else:
        return "neutral"

def detect_intensity_modifiers(text):
    score = 0

    words = text.split()

    # ALL CAPS words
    if any(word.isupper() and len(word) > 2 for word in words):
        score += 1.5

    # Repeated letters (e.g. sooo, noooo)
    if any(len(set(word)) < len(word) / 2 for word in words if len(word) > 2):
        score += 1.0

    # Strong punctuation
    if "!" in text:
        score += 0.5

    return score


def extract_intensity(pos, neg, text=""):
    total = pos + neg + detect_intensity_modifiers(text)
    return min(total / 5, 1.0)


def extract_themes(words):
    found = []

    for theme, keywords in themes_map.items():
        for word in words:
            if word in keywords:
                found.append(theme)
                break

    return list(set(found))


def extract_points(words):
    positives = []
    negatives = []

    for word in words:
        if word in positive_words:
            positives.append(word)
        if word in negative_words:
            negatives.append(word)

    return positives, negatives


def generate_reply(tone, themes):
    if tone == "positive":
        return "Sounds like a good day overall."
    elif tone == "negative":
        return "That sounds like a tough day."
    elif tone == "mixed":
        return "Seems like there were both good and challenging parts."
    else:
        return "Got it — tell me more."

# --- ROUTE ---

@app.post("/chat")
def chat(payload: Message):
    words = normalize(payload.message)

    pos, neg = extract_sentiment(words)
    tone = extract_tone(pos, neg)
    intensity = extract_intensity(pos, neg, payload.message)
    themes = extract_themes(words)
    pos_points, neg_points = extract_points(words)

    reply = generate_reply(tone, themes)

    return {
        "reply": reply,
        "tone": tone,
        "intensity": intensity,
        "themes": themes,
        "positive_points": pos_points,
        "negative_points": neg_points
    }