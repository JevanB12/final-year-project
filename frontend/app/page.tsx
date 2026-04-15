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

function subIssuePrompt(thread: string | null): string {
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

function safeJoin(values?: string[]) {
  return values?.join(", ") || "none";
}

function closingReply(userText: string) {
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

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { sender: "assistant", text: "Hey — how's your day been?" },
  ]);
  const [loading, setLoading] = useState(false);

  const [awaitingReaction, setAwaitingReaction] = useState(false);
  const [awaitingOpenClarification, setAwaitingOpenClarification] = useState(false);
  const [pendingSelectedThread, setPendingSelectedThread] = useState<string | null>(null);

  const [themes, setThemes] = useState<string[]>([]);
  const [triedThreads, setTriedThreads] = useState<string[]>([]);

  const [resolvedThread, setResolvedThread] = useState<string | null>(null);
  const [awaitingSubIssue, setAwaitingSubIssue] = useState(false);
  const [triedSubIssues, setTriedSubIssues] = useState<string[]>([]);
  const [candidateSubIssues, setCandidateSubIssues] = useState<string[]>([]);
  const [subIssue, setSubIssue] = useState<string | null>(null);

  const [suggestionTarget, setSuggestionTarget] = useState<string | null>(null);
  const [conversationComplete, setConversationComplete] = useState(false);

  const postJson = async <T,>(url: string, payload: unknown): Promise<T> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(
        `Backend error ${response.status} at ${url}: ${raw || response.statusText}`
      );
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(
        `Backend returned invalid JSON at ${url}: ${raw.slice(0, 200) || "<empty>"}`
      );
    }
  };

  const resetFlowState = () => {
    setAwaitingReaction(false);
    setAwaitingOpenClarification(false);
    setPendingSelectedThread(null);
    setThemes([]);
    setTriedThreads([]);
    setResolvedThread(null);
    setAwaitingSubIssue(false);
    setTriedSubIssues([]);
    setCandidateSubIssues([]);
    setSubIssue(null);
    setSuggestionTarget(null);
  };

  const runSubIssueSuggestionAndAction = async (
    userMessage: string,
    activeResolvedThread: string
  ) => {
    const subIssueData = await postJson<SubIssueResolutionResponse>(
      "http://localhost:8000/resolve-sub-issue",
      {
        resolved_thread: activeResolvedThread,
        user_text: userMessage,
        tried_sub_issues: triedSubIssues,
        candidate_sub_issues: candidateSubIssues,
      }
    );

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

    const suggestionData = await postJson<SuggestionMapResponse>(
      "http://localhost:8000/map-suggestion",
      {
        resolved_thread: activeResolvedThread,
        sub_issue: subIssueData.sub_issue,
      }
    );

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

    const actionData = await postJson<ActionGenerationResponse>(
      "http://localhost:8000/generate-action",
      {
        resolved_thread: activeResolvedThread,
        sub_issue: subIssueData.sub_issue,
        suggestion_target: suggestionData.suggestion_target,
        user_text: userMessage,
      }
    );

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

    setConversationComplete(true);
    setAwaitingReaction(false);
    setAwaitingOpenClarification(false);
    setPendingSelectedThread(null);
    setAwaitingSubIssue(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();

    if (conversationComplete) {
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: userMessage },
        {
          sender: "assistant",
          text: closingReply(userMessage),
        },
      ]);
      setInput("");
      setConversationComplete(false);
      resetFlowState();
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      if (awaitingSubIssue && resolvedThread) {
        await runSubIssueSuggestionAndAction(userMessage, resolvedThread);
      } else if (awaitingReaction && pendingSelectedThread) {
        const reactionData = await postJson<ReactionResponse>(
          "http://localhost:8000/classify-reaction",
          {
            reply: userMessage,
            selected_thread: pendingSelectedThread,
            tried_threads: triedThreads,
          }
        );

        const reactionMeta = `reaction: ${reactionData.reaction}
confidence: ${reactionData.confidence.toFixed(2)}
mode: awaiting_reaction_to_hypothesis
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

        const threadData = await postJson<ThreadResolutionResponse>(
          "http://localhost:8000/resolve-thread",
          {
            selected_thread: pendingSelectedThread,
            reaction: reactionData.reaction,
            redirected_thread: reactionData.redirected_thread,
            themes,
            tried_threads: triedThreads,
          }
        );

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
          setAwaitingOpenClarification(false);
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
              text: subIssuePrompt(threadData.resolved_thread),
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
          setAwaitingOpenClarification(false);
        } else if (
          threadData.resolution_status === "needs_clarification" &&
          !threadData.next_thread &&
          !threadData.resolved_thread
        ) {
          if (threadData.next_question) {
            setMessages((prev) => [
              ...prev,
              {
                sender: "assistant",
                text: threadData.next_question,
              },
            ]);
          }
          setPendingSelectedThread(null);
          setAwaitingReaction(false);
          setAwaitingOpenClarification(true);
        } else if (threadData.next_question) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              text: threadData.next_question,
            },
          ]);
          if (threadData.next_thread) {
            setPendingSelectedThread(threadData.next_thread);
            setAwaitingReaction(true);
            setAwaitingOpenClarification(false);
          } else {
            setPendingSelectedThread(null);
            setAwaitingReaction(false);
            setAwaitingOpenClarification(true);
          }
        } else {
          setAwaitingReaction(false);
          setAwaitingOpenClarification(false);
          setPendingSelectedThread(null);
        }
      } else if (awaitingOpenClarification) {
        const reactionData = await postJson<ReactionResponse>(
          "http://localhost:8000/classify-reaction",
          {
            reply: userMessage,
            selected_thread: null,
            tried_threads: triedThreads,
          }
        );

        const reactionMeta = `reaction: ${reactionData.reaction}
confidence: ${reactionData.confidence.toFixed(2)}
mode: awaiting_open_clarification
selected_thread: none
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
notes: ${reactionData.debug?.notes?.join(" | ") || reactionData.notes?.join(" | ") || "none"}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: `Iteration 4 classification: ${reactionData.reaction}`,
            meta: reactionMeta,
          },
        ]);

        const threadData = await postJson<ThreadResolutionResponse>(
          "http://localhost:8000/resolve-thread",
          {
            selected_thread: null,
            reaction: reactionData.reaction,
            redirected_thread: reactionData.redirected_thread,
            themes,
            tried_threads: triedThreads,
          }
        );

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
          setAwaitingOpenClarification(false);
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
              text: subIssuePrompt(threadData.resolved_thread),
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
          setAwaitingOpenClarification(false);
        } else {
          if (threadData.next_question) {
            setMessages((prev) => [
              ...prev,
              {
                sender: "assistant",
                text: threadData.next_question,
              },
            ]);
          }
          setPendingSelectedThread(null);
          setAwaitingReaction(false);
          setAwaitingOpenClarification(true);
        }
      } else {
        const data = await postJson<ChatResponse>("http://localhost:8000/chat", {
          message: userMessage,
        });

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

        setConversationComplete(false);
        setThemes(data.themes || []);
        setTriedThreads([]);
        setResolvedThread(null);
        setAwaitingSubIssue(false);
        setAwaitingOpenClarification(false);
        setTriedSubIssues([]);
        setCandidateSubIssues([]);
        setSubIssue(null);
        setSuggestionTarget(null);

        if (data.selected_thread) {
          setPendingSelectedThread(data.selected_thread);
          setAwaitingReaction(true);
          setAwaitingOpenClarification(false);
        } else {
          setPendingSelectedThread(null);
          setAwaitingReaction(false);
          setAwaitingOpenClarification(false);
        }
      }
    } catch (error) {
      console.error("Chat flow failed:", error);
      const message = error instanceof Error ? error.message : String(error);
      const userFacingError = message.includes("Failed to fetch")
        ? "Error: could not connect to backend (network/CORS)."
        : message.startsWith("Backend error")
        ? `Error: ${message}`
        : message.startsWith("Backend returned invalid JSON")
        ? `Error: ${message}`
        : "Error: frontend failed while processing backend response.";

      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: userFacingError,
        },
      ]);
      setAwaitingReaction(false);
      setAwaitingOpenClarification(false);
      setPendingSelectedThread(null);
      setAwaitingSubIssue(false);
      setConversationComplete(false);
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
          mode: {conversationComplete
            ? "awaiting final acknowledgement"
            : awaitingSubIssue && resolvedThread
            ? `awaiting sub-issue response for ${resolvedThread}`
            : awaitingReaction && pendingSelectedThread
            ? `awaiting_reaction_to_hypothesis: ${pendingSelectedThread}`
            : awaitingOpenClarification
            ? "awaiting_open_clarification"
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
              conversationComplete
                ? "Reply to wrap things up..."
                : awaitingSubIssue
                ? "Reply to the assistant's narrowing question..."
                : awaitingReaction
                ? "Reply to the assistant's hypothesis..."
                : awaitingOpenClarification
                ? "Reply openly; no hypothesis is active..."
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