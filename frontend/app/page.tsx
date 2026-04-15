"use client";

import { useState } from "react";

type ChatResponse = {
  reply: string;
  emotion: string;
  intensity: number;
  themes: string[];
  positive_points: string[];
  negative_points: string[];
  selected_thread: string | null;
  future_lane: string | null;
  thread_scores?: Record<string, number>;
  debug: {
    pos_score: number;
    neg_score: number;
    word_count: number;
    classification?: {
      label?: string;
      confidence?: number | string;
      reason?: string;
    };
  };
};

type ReactionResponse = {
  selected_thread?: string | null;
  user_reply?: string;
  reaction: string;
  confidence: number;
  redirected_thread: string | null;
  redirected_text: string | null;
  redirect_supported: boolean;
  matched_signals: {
    agree: string[];
    reject: string[];
    redirect: string[];
    unsure: string[];
  };
  notes?: string[];
  debug?: {
    agree_score?: number;
    reject_score?: number;
    redirect_score?: number;
    unsure_score?: number;
    found_known_thread_terms?: string[];
    found_unknown_redirect_cue?: boolean;
    notes?: string[];
    normalized_text?: string;
    selected_thread?: string;
  };
};

type ThreadResolutionResponse = {
  resolved_thread: string | null;
  next_thread: string | null;
  resolved: boolean;
  resolution_status: string;
  next_question: string | null;
  tried_threads: string[];
  notes: string[];
};

type SubIssueResolutionResponse = {
  sub_issue: string | null;
  resolved: boolean;
  sub_issue_status: string;
  next_question: string | null;
  candidate_sub_issues: string[];
  tried_sub_issues: string[];
  notes: string[];
};

type SuggestionMapResponse = {
  suggestion_target: string;
  change_area: string;
  suggestion_type: string;
  confidence: number;
  notes: string[];
};

type ActionGenerationResponse = {
  action_label: string;
  action_text: string;
  follow_up_question: string;
  confidence: number;
  notes: string[];
};

type Message = {
  sender: "user" | "assistant";
  text: string;
  meta?: string;
};

function threadPrompt(thread: string | null): string {
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

function safeJoin(values?: string[]) {
  return values?.join(", ") || "none";
}

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { sender: "assistant", text: "Hey — how's your day been?" },
  ]);
  const [loading, setLoading] = useState(false);

  const [awaitingReaction, setAwaitingReaction] = useState(false);
  const [pendingSelectedThread, setPendingSelectedThread] = useState<string | null>(null);

  const [themes, setThemes] = useState<string[]>([]);
  const [triedThreads, setTriedThreads] = useState<string[]>([]);

  const [resolvedThread, setResolvedThread] = useState<string | null>(null);
  const [awaitingSubIssue, setAwaitingSubIssue] = useState(false);
  const [triedSubIssues, setTriedSubIssues] = useState<string[]>([]);
  const [candidateSubIssues, setCandidateSubIssues] = useState<string[]>([]);
  const [subIssue, setSubIssue] = useState<string | null>(null);

  const [suggestionTarget, setSuggestionTarget] = useState<string | null>(null);

  const runSubIssueSuggestionAndAction = async (
    userMessage: string,
    activeResolvedThread: string
  ) => {
    const subIssueResponse = await fetch("http://localhost:8000/resolve-sub-issue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resolved_thread: activeResolvedThread,
        user_text: userMessage,
        tried_sub_issues: triedSubIssues,
        candidate_sub_issues: candidateSubIssues,
      }),
    });

    const subIssueData: SubIssueResolutionResponse = await subIssueResponse.json();

    const subIssueMeta = `resolved: ${String(subIssueData.resolved)}
sub_issue: ${subIssueData.sub_issue || "none"}
sub_issue_status: ${subIssueData.sub_issue_status || "none"}
next_question: ${subIssueData.next_question || "none"}
candidate_sub_issues: ${safeJoin(subIssueData.candidate_sub_issues)}
tried_sub_issues: ${safeJoin(subIssueData.tried_sub_issues)}
notes: ${subIssueData.notes?.join(" | ") || "none"}`;

    setMessages((prev) => [
      ...prev,
      {
        sender: "assistant",
        text: "Iteration 6: sub-issue resolution",
        meta: subIssueMeta,
      },
    ]);

    setTriedSubIssues(subIssueData.tried_sub_issues || triedSubIssues);
    setCandidateSubIssues(subIssueData.candidate_sub_issues || []);

    if (!subIssueData.resolved || !subIssueData.sub_issue) {
      if (subIssueData.next_question) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: subIssueData.next_question,
          },
        ]);
      }
      setAwaitingSubIssue(true);
      return;
    }

    setSubIssue(subIssueData.sub_issue);
    setAwaitingSubIssue(false);

    const suggestionResponse = await fetch("http://localhost:8000/map-suggestion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resolved_thread: activeResolvedThread,
        sub_issue: subIssueData.sub_issue,
      }),
    });

    const suggestionData: SuggestionMapResponse = await suggestionResponse.json();

    const suggestionMeta = `suggestion_target: ${suggestionData.suggestion_target || "none"}
change_area: ${suggestionData.change_area || "none"}
suggestion_type: ${suggestionData.suggestion_type || "none"}
confidence: ${typeof suggestionData.confidence === "number" ? suggestionData.confidence.toFixed(2) : "none"}
notes: ${suggestionData.notes?.join(" | ") || "none"}`;

    setMessages((prev) => [
      ...prev,
      {
        sender: "assistant",
        text: "Iteration 7: suggestion mapping",
        meta: suggestionMeta,
      },
    ]);

    setSuggestionTarget(suggestionData.suggestion_target);

    const actionResponse = await fetch("http://localhost:8000/generate-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resolved_thread: activeResolvedThread,
        sub_issue: subIssueData.sub_issue,
        suggestion_target: suggestionData.suggestion_target,
        user_text: userMessage,
      }),
    });

    const actionData: ActionGenerationResponse = await actionResponse.json();

    const actionMeta = `action_label: ${actionData.action_label || "none"}
action_text: ${actionData.action_text || "none"}
follow_up_question: ${actionData.follow_up_question || "none"}
confidence: ${typeof actionData.confidence === "number" ? actionData.confidence.toFixed(2) : "none"}
notes: ${actionData.notes?.join(" | ") || "none"}`;

    setMessages((prev) => [
      ...prev,
      {
        sender: "assistant",
        text: "Iteration 8: action generation",
        meta: actionMeta,
      },
      {
        sender: "assistant",
        text: actionData.action_text,
      },
      {
        sender: "assistant",
        text: actionData.follow_up_question,
      },
    ]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      if (awaitingSubIssue && resolvedThread) {
        await runSubIssueSuggestionAndAction(userMessage, resolvedThread);
      } else if (awaitingReaction && pendingSelectedThread) {
        const reactionResponse = await fetch("http://localhost:8000/classify-reaction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reply: userMessage,
            selected_thread: pendingSelectedThread,
          }),
        });

        const reactionData: ReactionResponse = await reactionResponse.json();

        const reactionMeta = `reaction: ${reactionData.reaction}
confidence: ${reactionData.confidence.toFixed(2)}
selected_thread: ${reactionData.selected_thread || pendingSelectedThread || "none"}
redirected_thread: ${reactionData.redirected_thread || "none"}
redirected_text: ${reactionData.redirected_text || "none"}
redirect_supported: ${String(reactionData.redirect_supported)}

matched_signals.agree: ${safeJoin(reactionData.matched_signals?.agree)}
matched_signals.reject: ${safeJoin(reactionData.matched_signals?.reject)}
matched_signals.redirect: ${safeJoin(reactionData.matched_signals?.redirect)}
matched_signals.unsure: ${safeJoin(reactionData.matched_signals?.unsure)}

agree_score: ${reactionData.debug?.agree_score ?? 0}
reject_score: ${reactionData.debug?.reject_score ?? 0}
redirect_score: ${reactionData.debug?.redirect_score ?? 0}
unsure_score: ${reactionData.debug?.unsure_score ?? 0}
found_known_thread_terms: ${safeJoin(reactionData.debug?.found_known_thread_terms)}
found_unknown_redirect_cue: ${String(reactionData.debug?.found_unknown_redirect_cue ?? false)}
notes: ${reactionData.debug?.notes?.join(" | ") || reactionData.notes?.join(" | ") || "none"}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: `Iteration 4 classification: ${reactionData.reaction}`,
            meta: reactionMeta,
          },
        ]);

        const resolutionResponse = await fetch("http://localhost:8000/resolve-thread", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selected_thread: pendingSelectedThread,
            reaction: reactionData.reaction,
            redirected_thread: reactionData.redirected_thread,
            themes,
            tried_threads: triedThreads,
          }),
        });

        const threadData: ThreadResolutionResponse = await resolutionResponse.json();

        const threadMeta = `resolved: ${String(threadData.resolved)}
resolved_thread: ${threadData.resolved_thread || "none"}
next_thread: ${threadData.next_thread || "none"}
resolution_status: ${threadData.resolution_status || "none"}
next_question: ${threadData.next_question || "none"}
tried_threads: ${safeJoin(threadData.tried_threads)}
notes: ${threadData.notes?.join(" | ") || "none"}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: "Iteration 5: thread resolution",
            meta: threadMeta,
          },
        ]);

        setTriedThreads(threadData.tried_threads || []);

        if (threadData.resolved && threadData.resolved_thread) {
          setResolvedThread(threadData.resolved_thread);
          setAwaitingReaction(false);
          setPendingSelectedThread(null);
          setTriedSubIssues([]);
          setCandidateSubIssues([]);
          setSubIssue(null);
          setSuggestionTarget(null);

          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              text: `Resolved thread: ${threadData.resolved_thread}`,
            },
            {
              sender: "assistant",
              text:
                threadData.resolved_thread === "sleep_rest"
                  ? "When you think about sleep lately, is it more about how long you sleep, how well you sleep, when you go to bed, how regular the pattern is, or how tired you feel in the day?"
                  : threadData.resolved_thread === "work_study_routine"
                  ? "When you picture work or study pressure, does it feel more like overload, focus problems, putting things off, deadlines, or not getting breaks?"
                  : threadData.resolved_thread === "daily_structure"
                  ? "Does the day feel more like there's no routine, it's overpacked, time is poorly spread, or there's no real downtime?"
                  : threadData.resolved_thread === "meals_regularity"
                  ? "Is eating more of a problem around skipping meals, eating late, irregular patterns, or not eating enough?"
                  : threadData.resolved_thread === "physical_activity"
                  ? "Does movement feel more very low right now, inconsistent, too intense, or like there's not enough of it?"
                  : "Which part of that feels strongest for you right now?",
            },
          ]);

          setAwaitingSubIssue(true);
        } else if (
          threadData.resolution_status === "retry_with_new_thread" &&
          threadData.next_thread
        ) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              text: threadPrompt(threadData.next_thread),
            },
          ]);
          setPendingSelectedThread(threadData.next_thread);
          setAwaitingReaction(true);
        } else if (threadData.next_question) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              text: threadData.next_question,
            },
          ]);
          setPendingSelectedThread(threadData.next_thread || pendingSelectedThread);
          setAwaitingReaction(true);
        } else {
          setAwaitingReaction(false);
          setPendingSelectedThread(null);
        }
      } else {
        const response = await fetch("http://localhost:8000/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userMessage }),
        });

        const data: ChatResponse = await response.json();

        const classification = data.debug?.classification;
        const classificationConfidence =
          typeof classification?.confidence === "number"
            ? classification.confidence.toFixed(2)
            : classification?.confidence;

        const meta = `emotion: ${data.emotion}
intensity: ${data.intensity.toFixed(2)}
themes: ${safeJoin(data.themes)}
selected_thread: ${data.selected_thread || "none"}
future_lane: ${data.future_lane || "none"}
positive_points: ${safeJoin(data.positive_points)}
negative_points: ${safeJoin(data.negative_points)}
thread_scores: ${data.thread_scores ? JSON.stringify(data.thread_scores) : "{}"}

${classification
  ? `classification.label: ${classification.label || "none"}
classification.confidence: ${classificationConfidence ?? "none"}
classification.reason: ${classification.reason || "none"}`
  : "classification: none"}

pos: ${data.debug?.pos_score ?? 0}
neg: ${data.debug?.neg_score ?? 0}
words: ${data.debug?.word_count ?? 0}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: data.reply,
            meta,
          },
        ]);

        setThemes(data.themes || []);
        setTriedThreads([]);
        setResolvedThread(null);
        setAwaitingSubIssue(false);
        setTriedSubIssues([]);
        setCandidateSubIssues([]);
        setSubIssue(null);
        setSuggestionTarget(null);

        if (data.selected_thread) {
          setPendingSelectedThread(data.selected_thread);
          setAwaitingReaction(true);
        } else {
          setPendingSelectedThread(null);
          setAwaitingReaction(false);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "Error: could not connect to backend.",
        },
      ]);
      setAwaitingReaction(false);
      setPendingSelectedThread(null);
      setAwaitingSubIssue(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 flex flex-col h-[80vh]">
        <h1 className="text-2xl font-semibold mb-1">Your wellbeing assistant</h1>
        <p className="text-gray-500 mb-4 text-sm">
          Talk about your day, your energy, or anything on your mind.
        </p>

        <div className="mb-3 text-xs text-gray-500">
          mode: {awaitingSubIssue && resolvedThread
            ? `awaiting sub-issue response for ${resolvedThread}`
            : awaitingReaction && pendingSelectedThread
            ? `awaiting reaction to ${pendingSelectedThread}`
            : "awaiting initial day message"}
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <div key={index} className="space-y-1">
                <div
                  className={`p-3 rounded-xl max-w-[75%] ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white ml-auto"
                      : "bg-gray-200 text-black mr-auto whitespace-pre-line"
                  }`}
                >
                  {msg.text}
                </div>

                {msg.sender === "assistant" && msg.meta && (
                  <div className="mr-auto max-w-[75%] rounded-lg bg-black text-green-400 text-xs p-3 whitespace-pre-wrap">
                    {msg.meta}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              awaitingSubIssue
                ? "Reply to the assistant's narrowing question..."
                : awaitingReaction
                ? "Reply to the assistant's hypothesis..."
                : "Type a message..."
            }
            className="flex-1 border rounded-lg px-4 py-2 placeholder-gray-500 text-gray-700"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}
 
now that i pasted that in, what do you think here, do you see any glaring problems , anyhting i need to tweak before i tesxt it  申博analysis to=container.exec ＿天天лиридescription code={"cmd":["bash","-lc","cat <<'EOF' > /tmp/page.tsx\n\"use client\";\n\nimport { useState } from \"react\";\n\ntype ChatResponse = {\n  reply: string;\n  emotion: string;\n  intensity: number;\n  themes: string[];\n  positive_points: string[];\n  negative_points: string[];\n  selected_thread: string | null;\n  future_lane: string | null;\n  thread_scores?: Record<string, number>;\n  debug: {\n    pos_score: number;\n    neg_score: number;\n    word_count: number;\n    classification?: {\n      label?: string;\n      confidence?: number | string;\n      reason?: string;\n    };\n  };\n};\n\ntype ReactionResponse = {\n  selected_thread?: string | null;\n  user_reply?: string;\n  reaction: string;\n  confidence: number;\n  redirected_thread: string | null;\n  redirected_text: string | null;\n  redirect_supported: boolean;\n  matched_signals: {\n    agree: string[];\n    reject: string[];\n    redirect: string[];\n    unsure: string[];\n  };\n  notes?: string[];\n  debug?: {\n    agree_score?: number;\n    reject_score?: number;\n    redirect_score?: number;\n    unsure_score?: number;\n    found_known_thread_terms?: string[];\n    found_unknown_redirect_cue?: boolean;\n    notes?: string[];\n    normalized_text?: string;\n    selected_thread?: string;\n  };\n};\n\ntype ThreadResolutionResponse = {\n  resolved_thread: string | null;\n  next_thread: string | null;\n  resolved: boolean;\n  resolution_status: string;\n  next_question: string | null;\n  tried_threads: string[];\n  notes: string[];\n};\n\ntype SubIssueResolutionResponse = {\n  sub_issue: string | null;\n  resolved: boolean;\n  sub_issue_status: string;\n  next_question: string | null;\n  candidate_sub_issues: string[];\n  tried_sub_issues: string[];\n  notes: string[];\n};\n\ntype SuggestionMapResponse = {\n  suggestion_target: string;\n  change_area: string;\n  suggestion_type: string;\n  confidence: number;\n  notes: string[];\n};\n\ntype ActionGenerationResponse = {\n  action_label: string;\n  action_text: string;\n  follow_up_question: string;\n  confidence: number;\n  notes: string[];\n};\n\ntype Message = {\n  sender: \"user\" | \"assistant\";\n  text: string;\n  meta?: string;\n};\n\nfunction threadPrompt(thread: string | null): string {\n  switch (thread) {\n    case \"sleep_rest\":\n      return \"Got you — then it might be more to do with tiredness or rest. Do you think low energy or rest has been a main part of how the day’s felt?\";\n    case \"work_study_routine\":\n      return \"Got you — then it might be more to do with work or study pressure. Does that feel closer to the main issue?\";\n    case \"daily_structure\":\n      return \"Got you — then it might be more about how the day is structured. Does it feel like routine or day structure has been the bigger issue?\";\n    case \"meals_regularity\":\n      return \"Got you — then it might be more connected to eating regularly or meal timing. Does that feel closer?\";\n    case \"physical_activity\":\n      return \"Got you — then it might be more connected to movement or activity levels. Does that feel like a better fit?\";\n    default:\n      return \"Which area feels closest to the main issue right now?\";\n  }\n}\n\nfunction safeJoin(values?: string[]) {\n  return values?.join(\", \") || \"none\";\n}\n\nexport default function Home() {\n  const [input, setInput] = useState(\"\");\n  const [messages, setMessages] = useState<Message[]>([\n    { sender: \"assistant\", text: \"Hey — how's your day been?\" },\n  ]);\n  const [loading, setLoading] = useState(false);\n\n  const [awaitingReaction, setAwaitingReaction] = useState(false);\n  const [pendingSelectedThread, setPendingSelectedThread] = useState<string | null>(null);\n\n  const [themes, setThemes] = useState<string[]>([]);\n  const [triedThreads, setTriedThreads] = useState<string[]>([]);\n\n  const [resolvedThread, setResolvedThread] = useState<string | null>(null);\n  const [awaitingSubIssue, setAwaitingSubIssue] = useState(false);\n  const [triedSubIssues, setTriedSubIssues] = useState<string[]>([]);\n  const [candidateSubIssues, setCandidateSubIssues] = useState<string[]>([]);\n  const [subIssue, setSubIssue] = useState<string | null>(null);\n\n  const [suggestionTarget, setSuggestionTarget] = useState<string | null>(null);\n\n  const runSubIssueSuggestionAndAction = async (\n    userMessage: string,\n    activeResolvedThread: string\n  ) => {\n    const subIssueResponse = await fetch(\"http://localhost:8000/resolve-sub-issue\", {\n      method: \"POST\",\n      headers: {\n        \"Content-Type\": \"application/json\",\n      },\n      body: JSON.stringify({\n        resolved_thread: activeResolvedThread,\n        user_text: userMessage,\n        tried_sub_issues: triedSubIssues,\n        candidate_sub_issues: candidateSubIssues,\n      }),\n    });\n\n    const subIssueData: SubIssueResolutionResponse = await subIssueResponse.json();\n\n    const subIssueMeta = `resolved: ${String(subIssueData.resolved)}\nsub_issue: ${subIssueData.sub_issue || \"none\"}\nsub_issue_status: ${subIssueData.sub_issue_status || \"none\"}\nnext_question: ${subIssueData.next_question || \"none\"}\ncandidate_sub_issues: ${safeJoin(subIssueData.candidate_sub_issues)}\ntried_sub_issues: ${safeJoin(subIssueData.tried_sub_issues)}\nnotes: ${subIssueData.notes?.join(\" | \") || \"none\"}`;\n\n    setMessages((prev) => [\n      ...prev,\n      {\n        sender: \"assistant\",\n        text: \"Iteration 6: sub-issue resolution\",\n        meta: subIssueMeta,\n      },\n    ]);\n\n    setTriedSubIssues(subIssueData.tried_sub_issues || triedSubIssues);\n    setCandidateSubIssues(subIssueData.candidate_sub_issues || []);\n\n    if (!subIssueData.resolved || !subIssueData.sub_issue) {\n      if (subIssueData.next_question) {\n        setMessages((prev) => [\n          ...prev,\n          {\n            sender: \"assistant\",\n            text: subIssueData.next_question,\n          },\n        ]);\n      }\n      setAwaitingSubIssue(true);\n      return;\n    }\n\n    setSubIssue(subIssueData.sub_issue);\n    setAwaitingSubIssue(false);\n\n    const suggestionResponse = await fetch(\"http://localhost:8000/map-suggestion\", {\n      method: \"POST\",\n      headers: {\n        \"Content-Type\": \"application/json\",\n      },\n      body: JSON.stringify({\n        resolved_thread: activeResolvedThread,\n        sub_issue: subIssueData.sub_issue,\n      }),\n    });\n\n    const suggestionData: SuggestionMapResponse = await suggestionResponse.json();\n\n    const suggestionMeta = `suggestion_target: ${suggestionData.suggestion_target || \"none\"}\nchange_area: ${suggestionData.change_area || \"none\"}\nsuggestion_type: ${suggestionData.suggestion_type || \"none\"}\nconfidence: ${typeof suggestionData.confidence === \"number\" ? suggestionData.confidence.toFixed(2) : \"none\"}\nnotes: ${suggestionData.notes?.join(\" | \") || \"none\"}`;\n\n    setMessages((prev) => [\n      ...prev,\n      {\n        sender: \"assistant\",\n        text: \"Iteration 7: suggestion mapping\",\n        meta: suggestionMeta,\n      },\n    ]);\n\n    setSuggestionTarget(suggestionData.suggestion_target);\n\n    const actionResponse = await fetch(\"http://localhost:8000/generate-action\", {\n      method: \"POST\",\n      headers: {\n        \"Content-Type\": \"application/json\",\n      },\n      body: JSON.stringify({\n        resolved_thread: activeResolvedThread,\n        sub_issue: subIssueData.sub_issue,\n        suggestion_target: suggestionData.suggestion_target,\n        user_text: userMessage,\n      }),\n    });\n\n    const actionData: ActionGenerationResponse = await actionResponse.json();\n\n    const actionMeta = `action_label: ${actionData.action_label || \"none\"}\naction_text: ${actionData.action_text || \"none\"}\nfollow_up_question: ${actionData.follow_up_question || \"none\"}\nconfidence: ${typeof actionData.confidence === \"number\" ? actionData.confidence.toFixed(2) : \"none\"}\nnotes: ${actionData.notes?.join(\" | \") || \"none\"}`;\n\n    setMessages((prev) => [\n      ...prev,\n      {\n        sender: \"assistant\",\n        text: \"Iteration 8: action generation\",\n        meta: actionMeta,\n      },\n      {\n        sender: \"assistant\",\n        text: actionData.action_text,\n      },\n      {\n        sender: \"assistant\",\n        text: actionData.follow_up_question,\n      },\n    ]);\n  };\n\n  const sendMessage = async () => {\n    if (!input.trim() || loading) return;\n\n    const userMessage = input.trim();\n    setMessages((prev) => [...prev, { sender: \"user\", text: userMessage }]);\n    setInput(\"\");\n    setLoading(true);\n\n    try {\n      if (awaitingSubIssue && resolvedThread) {\n        await runSubIssueSuggestionAndAction(userMessage, resolvedThread);\n      } else if (awaitingReaction && pendingSelectedThread) {\n        const reactionResponse = await fetch(\"http://localhost:8000/classify-reaction\", {\n          method: \"POST\",\n          headers: {\n            \"Content-Type\": \"application/json\",\n          },\n          body: JSON.stringify({\n            reply: userMessage,\n            selected_thread: pendingSelectedThread,\n          }),\n        });\n\n        const reactionData: ReactionResponse = await reactionResponse.json();\n\n        const reactionMeta = `reaction: ${reactionData.reaction}\nconfidence: ${reactionData.confidence.toFixed(2)}\nselected_thread: ${reactionData.selected_thread || pendingSelectedThread || \"none\"}\nredirected_thread: ${reactionData.redirected_thread || \"none\"}\nredirected_text: ${reactionData.redirected_text || \"none\"}\nredirect_supported: ${String(reactionData.redirect_supported)}\n\nmatched_signals.agree: ${safeJoin(reactionData.matched_signals?.agree)}\nmatched_signals.reject: ${safeJoin(reactionData.matched_signals?.reject)}\nmatched_signals.redirect: ${safeJoin(reactionData.matched_signals?.redirect)}\nmatched_signals.unsure: ${safeJoin(reactionData.matched_signals?.unsure)}\n\nagree_score: ${reactionData.debug?.agree_score ?? 0}\nreject_score: ${reactionData.debug?.reject_score ?? 0}\nredirect_score: ${reactionData.debug?.redirect_score ?? 0}\nunsure_score: ${reactionData.debug?.unsure_score ?? 0}\nfound_known_thread_terms: ${safeJoin(reactionData.debug?.found_known_thread_terms)}\nfound_unknown_redirect_cue: ${String(reactionData.debug?.found_unknown_redirect_cue ?? false)}\nnotes: ${reactionData.debug?.notes?.join(\" | \") || reactionData.notes?.join(\" | \") || \"none\"}`;\n\n        setMessages((prev) => [\n          ...prev,\n          {\n            sender: \"assistant\",\n            text: `Iteration 4 classification: ${reactionData.reaction}`,\n            meta: reactionMeta,\n          },\n        ]);\n\n        const resolutionResponse = await fetch(\"http://localhost:8000/resolve-thread\", {\n          method: \"POST\",\n          headers: {\n            \"Content-Type\": \"application/json\",\n          },\n          body: JSON.stringify({\n            selected_thread: pendingSelectedThread,\n            reaction: reactionData.reaction,\n            redirected_thread: reactionData.redirected_thread,\n            themes,\n            tried_threads: triedThreads,\n          }),\n        });\n\n        const threadData: ThreadResolutionResponse = await resolutionResponse.json();\n\n        const threadMeta = `resolved: ${String(threadData.resolved)}\nresolved_thread: ${threadData.resolved_thread || \"none\"}\nnext_thread: ${threadData.next_thread || \"none\"}\nresolution_status: ${threadData.resolution_status || \"none\"}\nnext_question: ${threadData.next_question || \"none\"}\ntried_threads: ${safeJoin(threadData.tried_threads)}\nnotes: ${threadData.notes?.join(\" | \") || \"none\"}`;\n\n        setMessages((prev) => [\n          ...prev,\n          {\n            sender: \"assistant\",\n            text: \"Iteration 5: thread resolution\",\n            meta: threadMeta,\n          },\n        ]);\n\n        setTriedThreads(threadData.tried_threads || []);\n\n        if (threadData.resolved && threadData.resolved_thread) {\n          setResolvedThread(threadData.resolved_thread);\n          setAwaitingReaction(false);\n          setPendingSelectedThread(null);\n          setTriedSubIssues([]);\n          setCandidateSubIssues([]);\n          setSubIssue(null);\n          setSuggestionTarget(null);\n\n          setMessages((prev) => [\n            ...prev,\n            {\n              sender: \"assistant\",\n              text: `Resolved thread: ${threadData.resolved_thread}`,\n            },\n            {\n              sender: \"assistant\",\n              text:\n                threadData.resolved_thread === \"sleep_rest\"\n                  ? \"When you think about sleep lately, is it more about how long you sleep, how well you sleep, when you go to bed, how regular the pattern is, or how tired you feel in the day?\"\n                  : threadData.resolved_thread === \"work_study_routine\"\n                  ? \"When you picture work or study pressure, does it feel more like overload, focus problems, putting things off, deadlines, or not getting breaks?\"\n                  : threadData.resolved_thread === \"daily_structure\"\n                  ? \"Does the day feel more like there's no routine, it's overpacked, time is poorly spread, or there's no real downtime?\"\n                  : threadData.resolved_thread === \"meals_regularity\"\n                  ? \"Is eating more of a problem around skipping meals, eating late, irregular patterns, or not eating enough?\"\n                  : threadData.resolved_thread === \"physical_activity\"\n                  ? \"Does movement feel more very low right now, inconsistent, too intense, or like there's not enough of it?\"\n                  : \"Which part of that feels strongest for you right now?\",\n            },\n          ]);\n\n          setAwaitingSubIssue(true);\n        } else if (\n          threadData.resolution_status === \"retry_with_new_thread\" &&\n          threadData.next_thread\n        ) {\n          setMessages((prev) => [\n            ...prev,\n            {\n              sender: \"assistant\",\n              text: threadPrompt(threadData.next_thread),\n            },\n          ]);\n          setPendingSelectedThread(threadData.next_thread);\n          setAwaitingReaction(true);\n        } else if (threadData.next_question) {\n          setMessages((prev) => [\n            ...prev,\n            {\n              sender: \"assistant\",\n              text: threadData.next_question,\n            },\n          ]);\n          setPendingSelectedThread(threadData.next_thread || pendingSelectedThread);\n          setAwaitingReaction(true);\n        } else {\n          setAwaitingReaction(false);\n          setPendingSelectedThread(null);\n        }\n      } else {\n        const response = await fetch(\"http://localhost:8000/chat\", {\n          method: \"POST\",\n          headers: {\n            \"Content-Type\": \"application/json\",\n          },\n          body: JSON.stringify({ message: userMessage }),\n        });\n\n        const data: ChatResponse = await response.json();\n\n        const classification = data.debug?.classification;\n        const classificationConfidence =\n          typeof classification?.confidence === \"number\"\n            ? classification.confidence.toFixed(2)\n            : classification?.confidence;\n\n        const meta = `emotion: ${data.emotion}\nintensity: ${data.intensity.toFixed(2)}\nthemes: ${safeJoin(data.themes)}\nselected_thread: ${data.selected_thread || \"none\"}\nfuture_lane: ${data.future_lane || \"none\"}\npositive_points: ${safeJoin(data.positive_points)}\nnegative_points: ${safeJoin(data.negative_points)}\nthread_scores: ${data.thread_scores ? JSON.stringify(data.thread_scores) : \"{}\"}\n\n${classification\n  ? `classification.label: ${classification.label || \"none\"}\nclassification.confidence: ${classificationConfidence ?? \"none\"}\nclassification.reason: ${classification.reason || \"none\"}`\n  : \"classification: none\"}\n\npos: ${data.debug?.pos_score ?? 0}\nneg: ${data.debug?.neg_score ?? 0}\nwords: ${data.debug?.word_count ?? 0}`;\n\n        setMessages((prev) => [\n          ...prev,\n          {\n            sender: \"assistant\",\n            text: data.reply,\n            meta,\n          },\n        ]);\n\n        setThemes(data.themes || []);\n        setTriedThreads([]);\n        setResolvedThread(null);\n        setAwaitingSubIssue(false);\n        setTriedSubIssues([]);\n        setCandidateSubIssues([]);\n        setSubIssue(null);\n        setSuggestionTarget(null);\n\n        if (data.selected_thread) {\n          setPendingSelectedThread(data.selected_thread);\n          setAwaitingReaction(true);\n        } else {\n          setPendingSelectedThread(null);\n          setAwaitingReaction(false);\n        }\n      }\n    } catch (error) {\n      setMessages((prev) => [\n        ...prev,\n        {\n          sender: \"assistant\",\n          text: \"Error: could not connect to backend.\",\n        },\n      ]);\n      setAwaitingReaction(false);\n      setPendingSelectedThread(null);\n      setAwaitingSubIssue(false);\n    } finally {\n      setLoading(false);\n    }\n  };\n\n  return (\n    <main className=\"min-h-screen bg-gray-100 flex justify-center items-center p-6\">\n      <div className=\"w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 flex flex-col h-[80vh]\">\n        <h1 className=\"text-2xl font-semibold mb-1\">Your wellbeing assistant</h1>\n        <p className=\"text-gray-500 mb-4 text-sm\">\n          Talk about your day, your energy, or anything on your mind.\n        </p>\n\n        <div className=\"mb-3 text-xs text-gray-500\">\n          mode: {awaitingSubIssue && resolvedThread\n            ? `awaiting sub-issue response for ${resolvedThread}`\n            : awaitingReaction && pendingSelectedThread\n            ? `awaiting reaction to ${pendingSelectedThread}`\n            : \"awaiting initial day message\"}\n        </div>\n\n        <div className=\"flex-1 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50\">\n          <div className=\"space-y-3\">\n            {messages.map((msg, index) => (\n              <div key={index} className=\"space-y-1\">\n                <div\n                  className={`p-3 rounded-xl max-w-[75%] ${\n                    msg.sender === \"user\"\n                      ? \"bg-blue-500 text-white ml-auto\"\n                      : \"bg-gray-200 text-black mr-auto whitespace-pre-line\"\n                  }`}\n                >\n                  {msg.text}\n                </div>\n\n                {msg.sender === \"assistant\" && msg.meta && (\n                  <div className=\"mr-auto max-w-[75%] rounded-lg bg-black text-green-400 text-xs p-3 whitespace-pre-wrap\">\n                    {msg.meta}\n                  </div>\n                )}\n              </div>\n            ))}\n          </div>\n        </div>\n\n        <div className=\"flex gap-2\">\n          <input\n            type=\"text\"\n            value={input}\n            onChange={(e) => setInput(e.target.value)}\n            placeholder={\n              awaitingSubIssue\n                ? \"Reply to the assistant's narrowing question...\"\n                : awaitingReaction\n                ? \"Reply to the assistant's hypothesis...\"\n                : \"Type a message...\"\n            }\n            className=\"flex-1 border rounded-lg px-4 py-2 placeholder-gray-500 text-gray-700\"\n            onKeyDown={(e) => {\n              if (e.key === \"Enter\") sendMessage();\n            }}\n          />\n          <button\n            onClick={sendMessage}\n            disabled={loading}\n            className=\"bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50\"\n          >\n            {loading ? \"Sending...\" : \"Send\"}\n          </button>\n        </div>\n      </div>\n    </main>\n  );\n}\nEOF\nnpx tsc --noEmit /tmp/page.tsx"],"timeout":300000}