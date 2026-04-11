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
    "well": 1,
    "alright": 1,
}

negative_words = {
    "stressed": 3,
    "stress": 3,
    "overwhelmed": 4,
    "anxious": 3,
    "tired": 3,
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
    "busy": 1,
}

intensifiers = {
    "very": 1.3,
    "really": 1.3,
    "extremely": 1.6,
    "so": 1.2,
    "quite": 1.2,
}

# These are detection themes, not all of them have to become suggestion lanes directly.
themes_map = {
    "work_study_routine": [
        "work",
        "study",
        "deadline",
        "deadlines",
        "assignment",
        "assignments",
        "exam",
        "revision",
        "job",
        "shift",
        "lecture",
        "lectures",
        "coursework",
        "uni",
        "university",
        "school",
        "college",
        "focus",
        "productive",
        "productivity",
    ],
    "sleep_rest": [
        "sleep",
        "slept",
        "rest",
        "bed",
        "bedtime",
        "nap",
        "naps",
        "morning",
        "tired",
        "exhausted",
        "drained",
        "worn",
        "fatigue",
        "rested",
    ],
    "physical_activity": [
        "gym",
        "walk",
        "walked",
        "run",
        "ran",
        "workout",
        "exercise",
        "training",
        "sport",
        "sports",
        "football",
        "basketball",
    ],
    "meals_regularity": [
        "meal",
        "meals",
        "eat",
        "eating",
        "ate",
        "breakfast",
        "lunch",
        "dinner",
        "food",
        "snack",
        "snacks",
        "hungry",
    ],
    "daily_structure": [
        "routine",
        "schedule",
        "consistent",
        "consistency",
        "packed",
        "nonstop",
        "busy",
        "break",
        "breaks",
        "pause",
        "space",
        "time",
        "rushed",
        "all over the place",
        "one thing after another",
    ],
    "social": [
        "friend",
        "friends",
        "family",
        "social",
        "people",
        "met",
        "going out",
        "out",
    ],
}

positive_phrases = {
    "felt good": 2,
    "went well": 2,
    "pretty good": 2,
    "had fun": 2,
    "good session": 2,
    "going well": 2,
}

negative_phrases = {
    "too much": 3,
    "so much": 2,
    "a lot": 1,
    "no time": 3,
    "no free time": 4,
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
    "need a break": 3,
    "out of it": 2,
    "don't feel right": 2,
    "dont feel right": 2,
    "don't feel right inside": 2,
    "dont feel right inside": 2,
    "feel off": 2,
    "feels off": 2,
    "something feels off": 2,
    "not myself": 2,
    "feel weird": 2,
    "off inside": 2,
    "hard to focus": 3,
    "hard to study": 3,
    "hard to get things done": 3,
    "finding it hard to study": 3,
    "finding it hard to focus": 3,
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
    "not enough food": 2,
    "not eating enough": 2,
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
    "consistently",
}

present_cues = {
    "today",
    "tonight",
    "now",
    "right now",
    "currently",
    "at the moment",
}

# We are NOT using these as full suggestions yet.
# They simply show the future lane the conversation would head toward.
thread_to_future_lane = {
    "sleep_rest": "sleep_rest",
    "work_study_routine": "work_study_routine",
    "physical_activity": "physical_activity",
    "meals_regularity": "meals_regularity",
    "daily_structure": "daily_structure",
}

thread_questions = {
    "sleep_rest": [
        "What's the rest side of things been like lately?",
        "How has your energy been feeling in general?",
    ],
    "work_study_routine": [
        "Tell me a bit more about what you've had on.",
        "What about the workload has been feeling most difficult?",
    ],
    "physical_activity": [
        "How has movement been fitting into your days lately?",
        "Has staying active felt easy or more like an effort recently?",
    ],
    "meals_regularity": [
        "How have meals been going lately?",
        "Has eating regularly been easy to keep up, or has that slipped a bit?",
    ],
    "daily_structure": [
        "What's your day-to-day been feeling like recently?",
        "Has there been much breathing room in your days, or has it felt pretty packed?",
    ],
}
