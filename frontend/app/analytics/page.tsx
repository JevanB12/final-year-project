"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getJson } from "../lib/api";
import {
  AnalyticsRecentResponse,
  AnalyticsSummaryResponse,
  AnalyticsTimelineResponse,
} from "../types/analytics";

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getWeekAverageLabel(score: number | null) {
  if (score === null) return "No check-ins yet";

  if (score >= 4.2) return "A strong week overall";
  if (score >= 3.4) return "A fairly steady week";
  if (score >= 2.6) return "A mixed week overall";
  if (score >= 1.8) return "A more difficult week";
  return "A heavy week overall";
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<AnalyticsTimelineResponse | null>(null);
  const [recent, setRecent] = useState<AnalyticsRecentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<"week" | "month">("week");
  const [showRecentCheckins, setShowRecentCheckins] = useState(false);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError(null);

        const [summaryData, timelineData, recentData] = await Promise.all([
          getJson<AnalyticsSummaryResponse>("http://localhost:8000/analytics/summary"),
          getJson<AnalyticsTimelineResponse>("http://localhost:8000/analytics/timeline"),
          getJson<AnalyticsRecentResponse>("http://localhost:8000/analytics/recent"),
        ]);

        setSummary(summaryData);
        setTimeline(timelineData);
        setRecent(recentData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load analytics.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  const selectedAverage = useMemo(() => {
    if (!summary) return null;
    return selectedRange === "week"
      ? summary.average_score_7_days
      : summary.average_score_30_days;
  }, [summary, selectedRange]);

  const strongestPositive = summary?.top_positive_points?.[0] ?? null;
  const strongestNegative = summary?.top_negative_points?.[0] ?? null;

  const rangeTimelineItems = useMemo(() => {
    if (!timeline) return [];
    if (selectedRange === "week") {
      return timeline.items.slice(-7);
    }
    return timeline.items;
  }, [timeline, selectedRange]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-8">
            <p className="text-slate-600 text-lg">Loading analytics...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Link
            href="/"
            className="inline-flex px-4 py-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Back to Chat
          </Link>

          <div className="bg-white rounded-[28px] shadow-sm border border-rose-100 p-8">
            <p className="text-rose-600 font-medium">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <section className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-[0.2em]">
                Wellbeing
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 mt-3">
                Your progress
              </h1>
              <p className="text-slate-600 mt-3 leading-7">
                A softer view of how things have been going recently, based on your check-ins.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex px-4 py-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition self-start"
            >
              Back to Chat
            </Link>
          </div>
        </section>

        <section className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Average score
              </p>
              <div className="flex items-end gap-3 mt-3">
                <p className="text-6xl font-semibold tracking-tight text-slate-900">
                  {selectedAverage ?? "-"}
                </p>
                <p className="text-slate-500 pb-2">/ 5</p>
              </div>
              <p className="text-slate-600 mt-3">
                {getWeekAverageLabel(selectedAverage)}
              </p>
            </div>

            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSelectedRange("week")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedRange === "week"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Past week
              </button>
              <button
                type="button"
                onClick={() => setSelectedRange("month")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedRange === "month"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600"
                }`}
              >
                Past month
              </button>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-end gap-3 h-36">
              {rangeTimelineItems.length > 0 ? (
                rangeTimelineItems.map((item) => {
                  const height = `${Math.max(18, item.day_score * 20)}%`;

                  return (
                    <div
                      key={item.id}
                      className="flex-1 flex flex-col items-center justify-end gap-3"
                    >
                      <div className="w-full max-w-[34px] rounded-full bg-sky-200/70 overflow-hidden h-28 flex items-end">
                        <div
                          className="w-full rounded-full bg-sky-400/80"
                          style={{ height }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {item.date.slice(5)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-500 italic">
                  No check-ins yet — start chatting to see your weekly view.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-7">
            <p className="text-sm font-medium text-slate-500">
              What seems to be going well
            </p>

            {strongestPositive ? (
              <>
                <p className="text-2xl font-semibold text-slate-900 mt-4 capitalize">
                  {formatLabel(strongestPositive.label)}
                </p>
                <p className="text-slate-600 mt-3 leading-7">
                  This has been the strongest positive signal in your recent check-ins.
                </p>
              </>
            ) : (
              <p className="text-slate-500 mt-4 italic">
                Not enough positive check-in data yet.
              </p>
            )}
          </div>

          <div className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-7">
            <p className="text-sm font-medium text-slate-500">
              What needs the most work
            </p>

            {strongestNegative ? (
              <>
                <p className="text-2xl font-semibold text-slate-900 mt-4 capitalize">
                  {formatLabel(strongestNegative.label)}
                </p>
                <p className="text-slate-600 mt-3 leading-7">
                  This has been the strongest area of difficulty in your recent check-ins.
                </p>
              </>
            ) : (
              <p className="text-slate-500 mt-4 italic">
                Not enough difficult-day data yet.
              </p>
            )}
          </div>
        </section>

        <section className="bg-white rounded-[28px] shadow-sm border border-slate-100 p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xl font-semibold text-slate-900">
                Recent check-ins
              </p>
              <p className="text-slate-600 mt-2">
                Keep the main view simple, and open recent entries only when you want them.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowRecentCheckins((prev) => !prev)}
              className="inline-flex px-4 py-2 rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition self-start"
            >
              {showRecentCheckins ? "Hide recent check-ins" : "See recent check-ins"}
            </button>
          </div>

          {showRecentCheckins && (
            <div className="mt-6 space-y-4">
              {recent && recent.items.length > 0 ? (
                recent.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-slate-150 border-slate-200 p-5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.date}</p>
                        <p className="text-sm text-slate-500 mt-1 capitalize">
                          {item.tone} · score {item.day_score}
                        </p>
                      </div>

                      <p className="text-sm text-slate-500 capitalize">
                        {item.selected_thread
                          ? formatLabel(item.selected_thread)
                          : "no main thread"}
                      </p>
                    </div>

                    <p className="mt-4 text-slate-700 leading-7">{item.raw_message}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 italic">
                  No recent check-ins yet.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}