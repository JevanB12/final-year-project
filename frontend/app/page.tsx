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
  debug: {
    agree_score: number;
    reject_score: number;
    redirect_score: number;
    unsure_score: number;
    found_known_thread_terms: string[];
    found_unknown_redirect_cue: boolean;
    notes: string[];
    normalized_text?: string;
    selected_thread?: string;
  };
};

type ThreadResolutionResponse = {
  resolved?: boolean;
  resolved_thread?: string | null;
  next_thread?: string | null;
  resolution_status?: string | null;
  next_question?: string | null;
  tried_threads?: string[];
  notes?: string[];
};

type SubIssueResolutionResponse = {
  resolved?: boolean;
  sub_issue?: string | null;
  sub_issue_status?: string | null;
  next_question?: string | null;
  candidate_sub_issues?: string[];
  tried_sub_issues?: string[];
  notes?: string[];
};

type SuggestionMapResponse = {
  suggestion_target?: string | null;
  change_area?: string | null;
  suggestion_type?: string | null;
  confidence?: number;
  notes?: string[];
};

type ActionGenerationResponse = {
  action_label?: string | null;
  action_text?: string | null;
  follow_up_question?: string | null;
  confidence?: number;
  notes?: string[];
};

type Stage =
  | "initial"
  | "awaiting_reaction"
  | "thread_resolution"
  | "sub_issue_resolution"
  | "suggestion_mapped"
  | "action_generated";

type Message = {
  sender: "user" | "assistant";
  text: string;
  meta?: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "assistant",
      text: "Hey — how's your day been?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [themes, setThemes] = useState<string[]>([]);
  const [triedThreads, setTriedThreads] = useState<string[]>([]);
  const [resolvedThread, setResolvedThread] = useState<string | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string | null>(null);
  const [triedSubIssues, setTriedSubIssues] = useState<string[]>([]);
  const [candidateSubIssues, setCandidateSubIssues] = useState<string[]>([]);
  const [subIssue, setSubIssue] = useState<string | null>(null);
  const [suggestionTarget, setSuggestionTarget] = useState<string | null>(null);
  const [changeArea, setChangeArea] = useState<string | null>(null);
  const [suggestionType, setSuggestionType] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [actionText, setActionText] = useState<string | null>(null);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<Stage>("initial");

  const postJson = async <T,>(url: string, body: Record<string, unknown>): Promise<T> => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return response.json() as Promise<T>;
  };

  const getThreadRetryPrompt = (thread: string) => {
    const prompts: Record<string, string> = {
      sleep_rest:
        "Got you — then it might be more to do with tiredness or rest. Do you think low energy or rest has been a main part of how the day's felt?",
      work_study_routine:
        "Got you — then it might be more to do with work or study pressure. Does that feel closer to the main issue?",
      daily_structure:
        "Got you — then it might be more about how the day is structured. Does it feel like routine or day structure has been the bigger issue?",
      meals_regularity:
        "Got you — then it might be more connected to eating regularly or meal timing. Does that feel closer?",
      physical_activity:
        "Got you — then it might be more connected to movement or activity levels. Does that feel like a better fit?",
    };
    return (
      prompts[thread] ||
      "Got you — let's try a different angle. Does this direction feel closer to the main issue?"
    );
  };

  const runSubIssueAndSuggestion = async (
    latestUserMessage: string,
    threadToUse: string
  ) => {
    const subIssueData = await postJson<SubIssueResolutionResponse>(
      "http://localhost:8000/resolve-sub-issue",
      {
        resolved_thread: threadToUse,
        user_text: latestUserMessage,
        tried_sub_issues: triedSubIssues,
        candidate_sub_issues: candidateSubIssues,
      }
    );

    const subIssueMeta = `resolved: ${String(subIssueData.resolved ?? false)}
sub_issue: ${subIssueData.sub_issue || "none"}
sub_issue_status: ${subIssueData.sub_issue_status || "none"}
next_question: ${subIssueData.next_question || "none"}
candidate_sub_issues: ${subIssueData.candidate_sub_issues?.join(", ") || "none"}
tried_sub_issues: ${subIssueData.tried_sub_issues?.join(", ") || "none"}
notes: ${subIssueData.notes?.join(" | ") || "none"}`;

    setMessages((prev) => [
      ...prev,
      {
        sender: "assistant",
        text: "Iteration 6: sub-issue resolution",
        meta: subIssueMeta,
      },
    ]);

    const nextTriedSubIssues = subIssueData.tried_sub_issues ?? triedSubIssues;
    setTriedSubIssues(nextTriedSubIssues);
    setCandidateSubIssues(subIssueData.candidate_sub_issues ?? []);

    if (!subIssueData.resolved) {
      setCurrentStage("sub_issue_resolution");
      if (subIssueData.next_question) {
        setMessages((prev) => [
          ...prev,
          { sender: "assistant", text: subIssueData.next_question as string },
        ]);
      }
      return;
    }

    const resolvedSubIssue = subIssueData.sub_issue || null;
    setSubIssue(resolvedSubIssue);
    setCandidateSubIssues([]);

    const suggestionData = await postJson<SuggestionMapResponse>(
      "http://localhost:8000/map-suggestion",
      {
        resolved_thread: threadToUse,
        sub_issue: resolvedSubIssue,
      }
    );

    const suggestionMeta = `suggestion_target: ${suggestionData.suggestion_target || "none"}
change_area: ${suggestionData.change_area || "none"}
suggestion_type: ${suggestionData.suggestion_type || "none"}
confidence: ${typeof suggestionData.confidence === "number" ? suggestionData.confidence.toFixed(2) : "none"}
notes: ${suggestionData.notes?.join(" | ") || "none"}`;

    setSuggestionTarget(suggestionData.suggestion_target || null);
    setChangeArea(suggestionData.change_area || null);
    setSuggestionType(suggestionData.suggestion_type || null);
    setCurrentStage("suggestion_mapped");

    setMessages((prev) => [
      ...prev,
      {
        sender: "assistant",
        text: "Iteration 7: suggestion mapping",
        meta: suggestionMeta,
      },
      {
        sender: "assistant",
        text: `Okay, it sounds like the main issue is around ${
          suggestionData.change_area || "the next change area"
        }.`,
      },
    ]);

    const actionData = await postJson<ActionGenerationResponse>(
      "http://localhost:8000/generate-action",
      {
        resolved_thread: threadToUse,
        sub_issue: resolvedSubIssue || "",
        suggestion_target: suggestionData.suggestion_target || "",
        user_text: latestUserMessage,
      }
    );

    const actionMeta = `action_label: ${actionData.action_label || "none"}
action_text: ${actionData.action_text || "none"}
follow_up_question: ${actionData.follow_up_question || "none"}
confidence: ${typeof actionData.confidence === "number" ? actionData.confidence.toFixed(2) : "none"}
notes: ${actionData.notes?.join(" | ") || "none"}`;

    setActionLabel(actionData.action_label || null);
    setActionText(actionData.action_text || null);
    setFollowUpQuestion(actionData.follow_up_question || null);
    setCurrentStage("action_generated");

    const actionMessages: Message[] = [
      {
        sender: "assistant",
        text: "Iteration 8: action generation",
        meta: actionMeta,
      },
    ];

    if (actionData.action_text) {
      actionMessages.push({
        sender: "assistant",
        text: actionData.action_text,
      });
    }

    if (actionData.follow_up_question) {
      actionMessages.push({
        sender: "assistant",
        text: actionData.follow_up_question,
      });
    }

    if (!actionData.action_text && !actionData.follow_up_question) {
      actionMessages.push({
        sender: "assistant",
        text: "It may help to try one small, manageable adjustment in this area.",
      });
    }

    setMessages((prev) => [...prev, ...actionMessages]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      if ((currentStage === "awaiting_reaction" || currentStage === "thread_resolution") && selectedThread) {
        const reactionData = await postJson<ReactionResponse>(
          "http://localhost:8000/classify-reaction",
          {
            reply: userMessage,
            selected_thread: selectedThread,
          }
        );

        const reactionMeta = `reaction: ${reactionData.reaction}
confidence: ${typeof reactionData.confidence === "number" ? reactionData.confidence.toFixed(2) : "none"}
selected_thread: ${reactionData.selected_thread || selectedThread || "none"}
redirected_thread: ${reactionData.redirected_thread || "none"}
redirected_text: ${reactionData.redirected_text || "none"}
redirect_supported: ${String(reactionData.redirect_supported)}

matched_signals.agree: ${reactionData.matched_signals?.agree?.join(", ") || "none"}
matched_signals.reject: ${reactionData.matched_signals?.reject?.join(", ") || "none"}
matched_signals.redirect: ${reactionData.matched_signals?.redirect?.join(", ") || "none"}
matched_signals.unsure: ${reactionData.matched_signals?.unsure?.join(", ") || "none"}

agree_score: ${reactionData.debug?.agree_score ?? 0}
reject_score: ${reactionData.debug?.reject_score ?? 0}
redirect_score: ${reactionData.debug?.redirect_score ?? 0}
unsure_score: ${reactionData.debug?.unsure_score ?? 0}
found_known_thread_terms: ${reactionData.debug?.found_known_thread_terms?.join(", ") || "none"}
found_unknown_redirect_cue: ${String(reactionData.debug?.found_unknown_redirect_cue ?? false)}
notes: ${reactionData.debug?.notes?.join(" | ") || "none"}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: `Iteration 4 classification: ${reactionData.reaction || "unknown"}`,
            meta: reactionMeta,
          },
        ]);

        const threadData = await postJson<ThreadResolutionResponse>(
          "http://localhost:8000/resolve-thread",
          {
            selected_thread: selectedThread,
            reaction: reactionData.reaction,
            redirected_thread: reactionData.redirected_thread,
            themes,
            tried_threads: triedThreads,
          }
        );

        const threadMeta = `resolved: ${String(threadData.resolved ?? false)}
resolved_thread: ${threadData.resolved_thread || "none"}
next_thread: ${threadData.next_thread || "none"}
resolution_status: ${threadData.resolution_status || "none"}
next_question: ${threadData.next_question || "none"}
tried_threads: ${threadData.tried_threads?.join(", ") || "none"}
notes: ${threadData.notes?.join(" | ") || "none"}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: "Iteration 5: thread resolution",
            meta: threadMeta,
          },
        ]);

        const nextTriedThreads = threadData.tried_threads ?? triedThreads;
        setTriedThreads(nextTriedThreads);
        setResolutionStatus(threadData.resolution_status || null);

        if (!threadData.resolved) {
          if (
            threadData.resolution_status === "retry_with_new_thread" &&
            threadData.next_thread
          ) {
            const retryThread = threadData.next_thread;
            setSelectedThread(retryThread);
            setCurrentStage("awaiting_reaction");
            setMessages((prev) => [
              ...prev,
              {
                sender: "assistant",
                text: getThreadRetryPrompt(retryThread),
              },
            ]);
            return;
          }

          setCurrentStage("thread_resolution");
          if (threadData.next_thread) {
            setSelectedThread(threadData.next_thread);
          }
          if (threadData.next_question) {
            setMessages((prev) => [
              ...prev,
              { sender: "assistant", text: threadData.next_question as string },
            ]);
          }
          return;
        }

        const finalResolvedThread = threadData.resolved_thread || selectedThread;
        setResolvedThread(finalResolvedThread);
        setSelectedThread(threadData.next_thread || finalResolvedThread);
        setCurrentStage("sub_issue_resolution");

        if (finalResolvedThread) {
          await runSubIssueAndSuggestion(userMessage, finalResolvedThread);
        }
      } else if (currentStage === "sub_issue_resolution" && resolvedThread) {
        await runSubIssueAndSuggestion(userMessage, resolvedThread);
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
themes: ${data.themes?.join(", ") || "none"}
selected_thread: ${data.selected_thread || "none"}
future_lane: ${data.future_lane || "none"}
positive_points: ${data.positive_points?.join(", ") || "none"}
negative_points: ${data.negative_points?.join(", ") || "none"}
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

        if (data.selected_thread) {
          setSelectedThread(data.selected_thread);
          setThemes(data.themes || []);
          setResolvedThread(null);
          setResolutionStatus(null);
          setTriedThreads([]);
          setTriedSubIssues([]);
          setCandidateSubIssues([]);
          setSubIssue(null);
          setSuggestionTarget(null);
          setChangeArea(null);
          setSuggestionType(null);
          setActionLabel(null);
          setActionText(null);
          setFollowUpQuestion(null);
          setCurrentStage("awaiting_reaction");
        } else {
          setSelectedThread(null);
          setCurrentStage("initial");
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
      setCurrentStage("initial");
      setSelectedThread(null);
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
          mode: {currentStage}
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
              currentStage === "awaiting_reaction"
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