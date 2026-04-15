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

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "assistant",
      text: "Hey — how's your day been?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const [awaitingReaction, setAwaitingReaction] = useState(false);
  const [pendingSelectedThread, setPendingSelectedThread] = useState<string | null>(null);
  const [themes, setThemes] = useState<string[]>([]);
  const [triedThreads, setTriedThreads] = useState<string[]>([]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      if (awaitingReaction && pendingSelectedThread) {
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
tried_threads: ${threadData.tried_threads?.join(", ") || "none"}
notes: ${threadData.notes?.join(" | ") || "none"}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: `Iteration 5: thread resolution`,
            meta: threadMeta,
          },
        ]);

        setTriedThreads(threadData.tried_threads || []);

        if (threadData.resolved && threadData.resolved_thread) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              text: `Resolved thread: ${threadData.resolved_thread}`,
            },
          ]);
          setAwaitingReaction(false);
          setPendingSelectedThread(null);
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

        setThemes(data.themes || []);
        setTriedThreads([]);

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
          mode: {awaitingReaction && pendingSelectedThread
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
              awaitingReaction
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