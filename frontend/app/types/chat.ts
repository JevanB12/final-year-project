export type ChatResponse = {
    reply: string;
    emotion: string;
    tone: string;
    intensity: number;
    themes: string[];
    positive_points: string[];
    negative_points: string[];
    selected_thread: string | null;
    future_lane: string | null;
    thread_scores?: Record<string, number>;
    thread_evidence?: Record<string, string[]>;
    conversation_type?: "positive_reflection" | "problem_resolution";
    expects_reaction_classification?: boolean;
    avatar?: {
      tone: string;
      intensity: number;
    };
    debug: {
      pos_score: number;
      neg_score: number;
      word_count: number;
      strain_detected?: boolean;
      strong_distress_detected?: boolean;
      contrast_detected?: boolean;
      positive_reflection_mode?: boolean;
      classification?: {
        label?: string;
        confidence?: number | string;
        reason?: string;
      };
    };
  };
  
  export type ReactionResponse = {
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
  
  export type ThreadResolutionResponse = {
    resolved_thread: string | null;
    next_thread: string | null;
    resolved: boolean;
    resolution_status: string;
    next_question: string | null;
    mode?: string;
    latest_question_type?: string;
    candidate_threads?: string[];
    rejected_threads?: string[];
    rejection_count?: number;
    tried_threads: string[];
    notes: string[];
  };
  
  export type SubIssueResolutionResponse = {
    sub_issue: string | null;
    resolved: boolean;
    sub_issue_status: string;
    next_question: string | null;
    candidate_sub_issues: string[];
    tried_sub_issues: string[];
    notes: string[];
  };
  
  export type SuggestionMapResponse = {
    suggestion_target: string;
    change_area: string;
    suggestion_type: string;
    confidence: number;
    notes: string[];
  };
  
  export type ActionGenerationResponse = {
    action_label: string;
    action_text: string;
    follow_up_question: string;
    confidence: number;
    notes: string[];
  };
  
  export type Message = {
    sender: "user" | "assistant";
    text: string;
    meta?: string;
  };