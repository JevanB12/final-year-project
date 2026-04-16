"use client";

import { useMemo, useState } from "react";
import { postJson } from "../lib/api";
import {
  closingReply,
  positiveFollowUpReply,
  safeJoin,
  subIssuePrompt,
  threadPrompt,
} from "../lib/chatHelpers";
import {
  ActionGenerationResponse,
  ChatResponse,
  Message,
  ReactionResponse,
  SubIssueResolutionResponse,
  SuggestionMapResponse,
  ThreadResolutionResponse,
} from "../types/chat";

type ConversationMode =
  | "awaiting_reaction_to_hypothesis"
  | "awaiting_guided_clarification"
  | "awaiting_positive_reflection"
  | "resolved_thread"
  | "awaiting_initial_day_message";

export function useChatFlow() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { sender: "assistant", text: "Hey — how's your day been?" },
  ]);
  const [loading, setLoading] = useState(false);
  const [avatarTone, setAvatarTone] = useState("neutral");
  const [avatarIntensity, setAvatarIntensity] = useState(0);

  const [conversationMode, setConversationMode] =
    useState<ConversationMode>("awaiting_initial_day_message");

  const [pendingSelectedThread, setPendingSelectedThread] = useState<string | null>(null);

  const [themes, setThemes] = useState<string[]>([]);
  const [candidateThreads, setCandidateThreads] = useState<string[]>([]);
  const [triedThreads, setTriedThreads] = useState<string[]>([]);
  const [rejectedThreads, setRejectedThreads] = useState<string[]>([]);
  const [rejectionCount, setRejectionCount] = useState(0);

  const [resolvedThread, setResolvedThread] = useState<string | null>(null);
  const [awaitingSubIssue, setAwaitingSubIssue] = useState(false);
  const [triedSubIssues, setTriedSubIssues] = useState<string[]>([]);
  const [candidateSubIssues, setCandidateSubIssues] = useState<string[]>([]);
  const [subIssue, setSubIssue] = useState<string | null>(null);

  const [suggestionTarget, setSuggestionTarget] = useState<string | null>(null);
  const [conversationComplete, setConversationComplete] = useState(false);

  const resetFlowState = () => {
    setConversationMode("awaiting_initial_day_message");
    setPendingSelectedThread(null);
    setThemes([]);
    setCandidateThreads([]);
    setTriedThreads([]);
    setRejectedThreads([]);
    setRejectionCount(0);
    setResolvedThread(null);
    setAwaitingSubIssue(false);
    setTriedSubIssues([]);
    setCandidateSubIssues([]);
    setSubIssue(null);
    setSuggestionTarget(null);
    setAvatarTone("neutral");
    setAvatarIntensity(0);
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
confidence: ${
      typeof suggestionData.confidence === "number"
        ? suggestionData.confidence.toFixed(2)
        : "none"
    }
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
confidence: ${
      typeof actionData.confidence === "number"
        ? actionData.confidence.toFixed(2)
        : "none"
    }
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
    setConversationMode("resolved_thread");
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

    if (conversationMode === "awaiting_positive_reflection") {
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: userMessage },
        {
          sender: "assistant",
          text: positiveFollowUpReply(userMessage),
        },
      ]);
      setInput("");
      setConversationComplete(true);
      setConversationMode("resolved_thread");
      setPendingSelectedThread(null);
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      if (awaitingSubIssue && resolvedThread) {
        await runSubIssueSuggestionAndAction(userMessage, resolvedThread);
      } else if (
        conversationMode === "awaiting_reaction_to_hypothesis" ||
        conversationMode === "awaiting_guided_clarification"
      ) {
        const activeSelectedThread =
          conversationMode === "awaiting_reaction_to_hypothesis"
            ? pendingSelectedThread
            : null;

        const reactionData = await postJson<ReactionResponse>(
          "http://localhost:8000/classify-reaction",
          {
            reply: userMessage,
            selected_thread: activeSelectedThread,
            tried_threads: triedThreads,
          }
        );

        const reactionMeta = `reaction: ${reactionData.reaction}
confidence: ${reactionData.confidence.toFixed(2)}
mode: ${conversationMode}
selected_thread: ${reactionData.selected_thread || activeSelectedThread || "none"}
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
found_unknown_redirect_cue: ${String(
          reactionData.debug?.found_unknown_redirect_cue ?? false
        )}
notes: ${
          reactionData.debug?.notes?.join(" | ") ||
          reactionData.notes?.join(" | ") ||
          "none"
        }`;

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
            selected_thread: activeSelectedThread,
            reaction: reactionData.reaction,
            redirected_thread: reactionData.redirected_thread,
            user_text: userMessage,
            themes,
            candidate_threads: candidateThreads,
            tried_threads: triedThreads,
            rejected_threads: rejectedThreads,
            rejection_count: rejectionCount,
          }
        );

        const threadMeta = `resolved: ${String(threadData.resolved)}
resolved_thread: ${threadData.resolved_thread || "none"}
next_thread: ${threadData.next_thread || "none"}
resolution_status: ${threadData.resolution_status || "none"}
mode: ${threadData.mode || "none"}
latest_question_type: ${threadData.latest_question_type || "none"}
next_question: ${threadData.next_question || "none"}
tried_threads: ${safeJoin(threadData.tried_threads)}
rejected_threads: ${safeJoin(threadData.rejected_threads)}
rejection_count: ${threadData.rejection_count ?? 0}
candidate_threads: ${safeJoin(threadData.candidate_threads)}
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
        setCandidateThreads(threadData.candidate_threads || candidateThreads);
        setRejectedThreads(threadData.rejected_threads || rejectedThreads);
        setRejectionCount(threadData.rejection_count ?? rejectionCount);

        if (threadData.resolved && threadData.resolved_thread) {
          setResolvedThread(threadData.resolved_thread);
          setConversationMode("resolved_thread");
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
          setConversationMode("awaiting_reaction_to_hypothesis");
        } else if (threadData.next_question) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "assistant",
              text: threadData.next_question,
            },
          ]);
          setPendingSelectedThread(threadData.next_thread || null);
          if (threadData.next_thread) {
            setConversationMode("awaiting_reaction_to_hypothesis");
          } else {
            setConversationMode("awaiting_guided_clarification");
          }
        } else {
          setConversationMode("awaiting_initial_day_message");
          setPendingSelectedThread(null);
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
thread_evidence: ${
          data.thread_evidence ? JSON.stringify(data.thread_evidence) : "{}"
        }

${
  classification
    ? `classification.label: ${classification.label || "none"}
classification.confidence: ${classificationConfidence ?? "none"}
classification.reason: ${classification.reason || "none"}`
    : "classification: none"
}

pos: ${data.debug?.pos_score ?? 0}
neg: ${data.debug?.neg_score ?? 0}
words: ${data.debug?.word_count ?? 0}
strain_detected: ${String(data.debug?.strain_detected ?? false)}
strong_distress_detected: ${String(data.debug?.strong_distress_detected ?? false)}
contrast_detected: ${String(data.debug?.contrast_detected ?? false)}
positive_reflection_mode: ${String(data.debug?.positive_reflection_mode ?? false)}
conversation_type: ${data.conversation_type || "none"}
expects_reaction_classification: ${String(
          data.expects_reaction_classification ?? true
        )}`;

        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: data.reply,
            meta,
          },
        ]);

        setAvatarTone(data.avatar?.tone || data.emotion || "neutral");
        setAvatarIntensity(data.avatar?.intensity || data.intensity || 0);

        setConversationComplete(false);
        setThemes(data.themes || []);
        setCandidateThreads(Object.keys(data.thread_scores || {}));
        setTriedThreads([]);
        setRejectedThreads([]);
        setRejectionCount(0);
        setResolvedThread(null);
        setAwaitingSubIssue(false);
        setConversationMode("awaiting_initial_day_message");
        setTriedSubIssues([]);
        setCandidateSubIssues([]);
        setSubIssue(null);
        setSuggestionTarget(null);

        if (
          data.conversation_type === "positive_reflection" ||
          data.expects_reaction_classification === false
        ) {
          setPendingSelectedThread(null);
          setConversationMode("awaiting_positive_reflection");
        } else if (data.selected_thread) {
          setPendingSelectedThread(data.selected_thread);
          setConversationMode("awaiting_reaction_to_hypothesis");
        } else {
          setPendingSelectedThread(null);
          setConversationMode("awaiting_guided_clarification");
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
      setConversationMode("awaiting_initial_day_message");
      setPendingSelectedThread(null);
      setAwaitingSubIssue(false);
      setConversationComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const inputPlaceholder = useMemo(() => {
    if (conversationComplete) return "Reply to wrap things up...";
    if (awaitingSubIssue) return "Reply to the assistant's narrowing question...";
    if (conversationMode === "awaiting_reaction_to_hypothesis") {
      return "Reply to the assistant's hypothesis...";
    }
    if (conversationMode === "awaiting_guided_clarification") {
      return "Reply to the assistant's guided question...";
    }
    if (conversationMode === "awaiting_positive_reflection") {
      return "Reply with what's been helping...";
    }
    return "Type a message...";
  }, [conversationComplete, awaitingSubIssue, conversationMode]);

  const statusText = useMemo(() => {
    if (conversationComplete) return "awaiting final acknowledgement";
    if (awaitingSubIssue && resolvedThread) {
      return `awaiting sub-issue response for ${resolvedThread}`;
    }
    if (
      conversationMode === "awaiting_reaction_to_hypothesis" &&
      pendingSelectedThread
    ) {
      return `awaiting_reaction_to_hypothesis: ${pendingSelectedThread}`;
    }
    return conversationMode;
  }, [
    conversationComplete,
    awaitingSubIssue,
    resolvedThread,
    conversationMode,
    pendingSelectedThread,
  ]);

  return {
    input,
    setInput,
    messages,
    loading,
    avatarTone,
    avatarIntensity,
    conversationComplete,
    awaitingSubIssue,
    conversationMode,
    pendingSelectedThread,
    resolvedThread,
    sendMessage,
    inputPlaceholder,
    statusText,
    subIssue,
    suggestionTarget,
  };
}