export function threadPrompt(thread: string | null): string {
    switch (thread) {
      case "sleep_rest":
        return "Got you — then it might be more to do with tiredness or rest. Do you think low energy or rest has been a main part of how the day’s felt?";
      case "work_study_routine":
        return "Got you — then it might be more to do with work or study pressure. Does that feel closer to the main issue?";
      case "daily_structure":
        return "Got you — then it might be more about how the day is structured. Does it feel like routine or day structure has been the bigger issue?";
      case "meals_regularity":
        return "Got you — then it might be more connected to eating regularly or meal timing. Does that feel closer?";
      case "physical_activity":
        return "Got you — then it might be more connected to movement or activity levels. Does that feel like a better fit?";
      default:
        return "Which area feels closest to the main issue right now?";
    }
  }
  
  export function subIssuePrompt(thread: string | null): string {
    switch (thread) {
      case "sleep_rest":
        return "When you think about sleep lately, is it more about how long you sleep, how well you sleep, when you go to bed, how regular the pattern is, or how tired you feel in the day?";
      case "work_study_routine":
        return "When you picture work or study pressure, does it feel more like overload, focus problems, putting things off, deadlines, or not getting breaks?";
      case "daily_structure":
        return "Does the day feel more like there's no routine, it's overpacked, time is poorly spread, or there's no real downtime?";
      case "meals_regularity":
        return "Is eating more of a problem around skipping meals, eating late, irregular patterns, or not eating enough?";
      case "physical_activity":
        return "Does movement feel more very low right now, inconsistent, too intense, or like there's not enough of it?";
      default:
        return "Which part of that feels strongest for you right now?";
    }
  }
  
  export function safeJoin(values?: string[]) {
    return values?.join(", ") || "none";
  }
  
  export function closingReply(userText: string): string {
    const text = userText.toLowerCase();
  
    if (
      text.includes("yeah") ||
      text.includes("yes") ||
      text.includes("could do") ||
      text.includes("i'll try") ||
      text.includes("ill try") ||
      text.includes("i will try") ||
      text.includes("sounds good") ||
      text.includes("that works")
    ) {
      return "Nice — even giving that a proper try is a good step. We can leave it there for now, and you can always come back to this later.";
    }
  
    if (
      text.includes("probably won't") ||
      text.includes("probably wont") ||
      text.includes("not sure") ||
      text.includes("maybe") ||
      text.includes("hard") ||
      text.includes("difficult")
    ) {
      return "That’s fair — even noticing what might be hard to stick to is useful. We can leave it there for now, and you can always come back to it later.";
    }
  
    if (
      text.includes("no") ||
      text.includes("don't think") ||
      text.includes("dont think") ||
      text.includes("won't") ||
      text.includes("wont")
    ) {
      return "That’s okay — at least you’ve narrowed down what the issue seems to be. We can leave it there for now, and you can always revisit it later.";
    }
  
    return "That makes sense — we can leave it there for now. Feel free to come back to this anytime.";
  }
  
  export function positiveFollowUpReply(userText: string): string {
    const text = userText.toLowerCase();
  
    if (
      text.includes("routine") ||
      text.includes("momentum") ||
      text.includes("consistent") ||
      text.includes("structure")
    ) {
      return "That’s great to hear — it sounds like your routine and momentum are really working for you right now. Keeping that going seems to be helping a lot. Hope the rest of your day goes well.";
    }
  
    if (
      text.includes("workout") ||
      text.includes("gym") ||
      text.includes("exercise") ||
      text.includes("training")
    ) {
      return "That’s great to hear — it sounds like staying active has been giving you a really solid start to the day. If that’s helping, it’s definitely worth keeping up. Hope the rest of your day goes well.";
    }
  
    if (
      text.includes("work") ||
      text.includes("tasks") ||
      text.includes("productive") ||
      text.includes("focus")
    ) {
      return "That’s great to hear — it sounds like things are clicking into place for you right now. If that rhythm is working, it makes sense to keep leaning into it. Hope the rest of your day goes well.";
    }
  
    return "That’s really good to hear — it sounds like things have been working well for you lately. If what you’re doing is helping, it’s worth keeping that going. Hope the rest of your day goes well.";
  }