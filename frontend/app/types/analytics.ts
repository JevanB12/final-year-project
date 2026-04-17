export type AnalyticsListItem = {
    label: string;
    count: number;
  };
  
  export type AnalyticsSummaryResponse = {
    average_score_7_days: number | null;
    average_score_30_days: number | null;
    tone_counts_30_days: {
      positive: number;
      neutral: number;
      negative: number;
    };
    most_common_tone_30_days: string | null;
    top_themes: AnalyticsListItem[];
    top_positive_points: AnalyticsListItem[];
    top_negative_points: AnalyticsListItem[];
    strain_days_30_days: number;
    checkin_streak: number;
    total_checkins_30_days: number;
  };
  
  export type AnalyticsTimelineItem = {
    id: number;
    date: string;
    tone: string;
    day_score: number;
    selected_thread: string | null;
    intensity: number;
    strain_detected: boolean;
  };
  
  export type AnalyticsTimelineResponse = {
    days: number;
    items: AnalyticsTimelineItem[];
  };
  
  export type RecentCheckinItem = {
    id: number;
    date: string;
    raw_message: string;
    tone: string;
    day_score: number;
    selected_thread: string | null;
    themes: string[];
    positive_points: string[];
    negative_points: string[];
  };
  
  export type AnalyticsRecentResponse = {
    items: RecentCheckinItem[];
  };