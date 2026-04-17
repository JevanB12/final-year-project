"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getJson } from "../lib/api";
import {
  AnalyticsRecentResponse,
  AnalyticsSummaryResponse,
  AnalyticsTimelineResponse,
} from "../types/analytics";

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function toneBadgeClasses(tone: string) {
  if (tone === "positive") {
    return "bg-green-100 text-green-700";
  }
  if (tone === "negative") {
    return "bg-red-100 text-red-700";
  }
  return "bg-gray-200 text-gray-700";
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<AnalyticsTimelineResponse | null>(null);
  const [recent, setRecent] = useState<AnalyticsRecentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg p-8">
            <p className="text-gray-700 text-lg">Loading analytics...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Chat
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8 border border-red-100">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="bg-white rounded-3xl shadow-lg p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Wellbeing Dashboard
              </p>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
                Analytics Overview
              </h1>
              <p className="text-gray-600 mt-3 max-w-2xl">
                A summary of saved wellbeing check-ins, recent patterns, and the
                main areas that seem to be going well or needing attention.
              </p>
            </div>

            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition self-start"
            >
              Back to Chat
            </Link>
          </div>
        </section>

        {summary && (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <p className="text-sm font-medium text-gray-500">
                Average score
              </p>
              <p className="text-4xl font-bold text-gray-900 mt-3">
                {summary.average_score_7_days ?? "-"}
              </p>
              <p className="text-sm text-gray-500 mt-2">Last 7 days</p>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <p className="text-sm font-medium text-gray-500">
                Average score
              </p>
              <p className="text-4xl font-bold text-gray-900 mt-3">
                {summary.average_score_30_days ?? "-"}
              </p>
              <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <p className="text-sm font-medium text-gray-500">
                Check-in streak
              </p>
              <p className="text-4xl font-bold text-gray-900 mt-3">
                {summary.checkin_streak}
              </p>
              <p className="text-sm text-gray-500 mt-2">Consecutive days</p>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <p className="text-sm font-medium text-gray-500">
                Most common tone
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-3 capitalize">
                {summary.most_common_tone_30_days ?? "-"}
              </p>
              <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
            </div>
          </section>
        )}

        {summary && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">
                Tone distribution
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl bg-green-50 px-4 py-3">
                  <span className="font-medium text-green-700">Positive</span>
                  <span className="font-semibold text-green-700">
                    {summary.tone_counts_30_days.positive}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-gray-100 px-4 py-3">
                  <span className="font-medium text-gray-700">Neutral</span>
                  <span className="font-semibold text-gray-700">
                    {summary.tone_counts_30_days.neutral}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3">
                  <span className="font-medium text-red-700">Negative</span>
                  <span className="font-semibold text-red-700">
                    {summary.tone_counts_30_days.negative}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
                  <span className="font-medium text-amber-700">Strain days</span>
                  <span className="font-semibold text-amber-700">
                    {summary.strain_days_30_days}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-blue-50 px-4 py-3">
                  <span className="font-medium text-blue-700">Total check-ins</span>
                  <span className="font-semibold text-blue-700">
                    {summary.total_checkins_30_days}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">
                Top themes
              </h2>

              <div className="space-y-3">
                {summary.top_themes.length > 0 ? (
                  summary.top_themes.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center border-b border-gray-100 pb-3"
                    >
                      <span className="text-gray-700 capitalize">
                        {formatLabel(item.label)}
                      </span>
                      <span className="min-w-8 h-8 px-3 rounded-full bg-gray-100 text-gray-900 text-sm font-semibold flex items-center justify-center">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">
                    No theme data yet — start chatting to generate insights.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {summary && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">
                Things going well
              </h2>

              <div className="space-y-3">
                {summary.top_positive_points.length > 0 ? (
                  summary.top_positive_points.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center border-b border-gray-100 pb-3"
                    >
                      <span className="text-gray-700">{item.label}</span>
                      <span className="min-w-8 h-8 px-3 rounded-full bg-green-100 text-green-700 text-sm font-semibold flex items-center justify-center">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">
                    No positive point data yet — start chatting to generate
                    insights.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-5">
                Things needing attention
              </h2>

              <div className="space-y-3">
                {summary.top_negative_points.length > 0 ? (
                  summary.top_negative_points.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center border-b border-gray-100 pb-3"
                    >
                      <span className="text-gray-700">{item.label}</span>
                      <span className="min-w-8 h-8 px-3 rounded-full bg-red-100 text-red-700 text-sm font-semibold flex items-center justify-center">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">
                    No negative point data yet — start chatting to generate
                    insights.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {timeline && (
          <section className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">
              Timeline
            </h2>

            <div className="space-y-3">
              {timeline.items.length > 0 ? (
                timeline.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:shadow-sm transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{item.date}</p>
                      <div className="mt-2">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${toneBadgeClasses(
                            item.tone
                          )}`}
                        >
                          {item.tone} day
                        </span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      <p>
                        <span className="font-medium">Score:</span> {item.day_score}
                      </p>
                      <p>
                        <span className="font-medium">Thread:</span>{" "}
                        {item.selected_thread
                          ? formatLabel(item.selected_thread)
                          : "none"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">
                  No timeline data yet — start chatting to generate insights.
                </p>
              )}
            </div>
          </section>
        )}

        {recent && (
          <section className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">
              Recent check-ins
            </h2>

            <div className="space-y-4">
              {recent.items.length > 0 ? (
                recent.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{item.date}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${toneBadgeClasses(
                              item.tone
                            )}`}
                          >
                            {item.tone}
                          </span>
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Score {item.day_score}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Thread:</span>{" "}
                        {item.selected_thread
                          ? formatLabel(item.selected_thread)
                          : "none"}
                      </p>
                    </div>

                    <p className="mt-4 text-gray-800 leading-7">{item.raw_message}</p>

                    <div className="mt-4 text-sm text-gray-600 space-y-2">
                      <p>
                        <span className="font-medium">Themes:</span>{" "}
                        {item.themes.length > 0
                          ? item.themes.map(formatLabel).join(", ")
                          : "none"}
                      </p>
                      <p>
                        <span className="font-medium">Positive points:</span>{" "}
                        {item.positive_points.length > 0
                          ? item.positive_points.join(", ")
                          : "none"}
                      </p>
                      <p>
                        <span className="font-medium">Negative points:</span>{" "}
                        {item.negative_points.length > 0
                          ? item.negative_points.join(", ")
                          : "none"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">
                  No recent check-ins yet — start chatting to generate insights.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}