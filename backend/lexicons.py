positive_words = {
    "good": 2,
    "great": 3,
    "happy": 3,
    "nice": 1,
    "productive": 2,
    "calm": 2,
    "better": 2,
    "fun": 2,
    "relaxed": 2,
    "enjoyed": 2,
    "glad": 2,
}

negative_words = {
    "stressed": 3,
    "stress": 3,
    "overwhelmed": 4,
    "anxious": 3,
    "tired": 2,
    "exhausted": 4,
    "drained": 3,
    "frustrated": 3,
    "upset": 2,
    "low": 2,
    "rough": 2,
    "difficult": 2,
    "hard": 1,
    "struggling": 3,
    "behind": 2,
    "pressure": 3,
    "worried": 2,
    "worn": 2,
    "burnt": 3,
}

intensifiers = {
    "very": 1.3,
    "really": 1.3,
    "extremely": 1.6,
    "so": 1.2,
    "quite": 1.2,
}

themes_map = {
    "work": [
        "work",
        "study",
        "deadline",
        "deadlines",
        "assignment",
        "exam",
        "revision",
        "job",
        "shift",
        "lecture",
    ],
    "sleep": [
        "sleep",
        "slept",
        "rest",
        "bed",
        "bedtime",
        "nap",
        "morning",
        "tonight",
    ],
    "movement": [
        "gym",
        "walk",
        "run",
        "workout",
        "exercise",
        "training",
    ],
    "social": [
        "friend",
        "friends",
        "family",
        "social",
        "people",
        "met",
    ],
    "recovery": [
        "break",
        "rest",
        "breathe",
        "recover",
        "pause",
        "reset",
        "free time",
        "time to myself",
        "drained",
        "draining",
        "tired",
        "exhausted",
        "low energy",
        "burnt out",
    ],
}

positive_phrases = {
    "felt good": 2,
    "went well": 2,
    "pretty good": 2,
    "had fun": 2,
    "got stuff done": 2,
    "good session": 2,
}

negative_phrases = {
    "too much": 3,
    "so much": 2,
    "a lot": 1,
    "no time": 3,
    "no free time": 4,
    "time to myself": 2,
    "cant keep up": 4,
    "can't keep up": 4,
    "falling behind": 3,
    "one thing after another": 3,
    "nonstop": 3,
    "havent stopped": 3,
    "haven't stopped": 3,
    "all over the place": 2,
    "too many deadlines": 4,
    "too many things": 3,
    "out of my depth": 4,
    "hard to manage": 3,
    "hard to handle": 3,
    "idk how": 2,
    "dont know how": 2,
    "don't know how": 2,
    "need to breathe": 3,
    "need a break": 3,
    "out of it": 2,
}

support_cues = {
    "idk": 1,
    "not sure": 1,
    "honestly": 1,
    "just": 0.5,
    "i guess": 0.5,
    "maybe": 0.5,
}

NEGATION_WORDS = {"not", "no", "never", "havent", "haven't", "isnt", "isn't"}

negated_wellbeing_phrases = {
    "not feeling good": 2,
    "not doing well": 2,
    "not feeling great": 2,
}

lack_phrases = {
    "not enough sleep": 3,
    "not enough rest": 3,
    "not enough time": 3,
}

ongoing_cues = {
    "still",
    "lately",
    "recently",
    "keep",
    "kept",
    "again",
    "ongoing",
    "building",
    "been",
    "every",
}

urgent_phrases = {
    "need to fix": 2.5,
    "need to sort this out": 3.0,
    "cant keep doing this": 3.0,
    "can't keep doing this": 3.0,
    "need this sorted": 2.5,
    "need better sleep tonight": 3.0,
    "need to get this done": 2.0,
    "need to handle this": 2.0,
    "really need": 1.5,
}

present_cues = {
    "today",
    "tonight",
    "now",
    "right now",
    "currently",
    "at the moment",
}

thread_questions = {
    "sleep": [
        "Was that mostly just tonight, or had the tiredness been building through the day too?",
        "Do you think this is more about today being long, or sleep being a bit off lately?",
    ],
    "work": [
        "Was it mainly the amount you had on, or more that it was hard to get going?",
        "Did the work feel heavy all day, or was it more frustrating not getting through as much as you wanted?",
    ],
    "recovery": [
        "Did you get much chance to slow down between things today?",
        "Was it one of those days where everything just rolled into the next thing?",
    ],
    "movement": [
        "Did being active help your energy today, or did it take a lot out of you?",
        "Has movement been helping lately, or was today a bit different?",
    ],
    "social": [
        "Did seeing people feel like a boost today, or were you still feeling pretty drained underneath it?",
        "Did that social time help reset things at all?",
    ],
}
