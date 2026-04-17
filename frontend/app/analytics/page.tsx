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
        const message = err instanceof Error ? err.message : "Failed to load analytics.";
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
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6">Loading analytics...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Back to Chat
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 text-red-600">
            {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-2">
                Overview of saved wellbeing check-ins and recent trends.
              </p>
            </div>

            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition self-start"
            >
              Back to Chat
            </Link>
          </div>
        </div>

        {summary && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-sm text-gray-500">Average score (7 days)</p>
              <p className="text-3xl font-semibold mt-2">
                {summary.average_score_7_days ?? "-"}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-sm text-gray-500">Average score (30 days)</p>
              <p className="text-3xl font-semibold mt-2">
                {summary.average_score_30_days ?? "-"}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-sm text-gray-500">Check-in streak</p>
              <p className="text-3xl font-semibold mt-2">{summary.checkin_streak}</p>
            </div>

            <div className="bg-white rounded-2xl shadow p-5">
              <p className="text-sm text-gray-500">Most common tone</p>
              <p className="text-3xl font-semibold mt-2 capitalize">
                {summary.most_common_tone_30_days ?? "-"}
              </p>
            </div>
          </section>
        )}

        {summary && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Tone counts (30 days)</h2>
              <div className="space-y-2 text-gray-700">
                <p>Positive: {summary.tone_counts_30_days.positive}</p>
                <p>Neutral: {summary.tone_counts_30_days.neutral}</p>
                <p>Negative: {summary.tone_counts_30_days.negative}</p>
                <p>Strain days: {summary.strain_days_30_days}</p>
                <p>Total check-ins: {summary.total_checkins_30_days}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Top themes</h2>
              <div className="space-y-2">
                {summary.top_themes.length > 0 ? (
                  summary.top_themes.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between border-b border-gray-100 pb-2"
                    >
                      <span className="text-gray-700 capitalize">
                        {formatLabel(item.label)}
                      </span>
                      <span className="font-medium text-gray-900">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No theme data yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {summary && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Top things going well</h2>
              <div className="space-y-2">
                {summary.top_positive_points.length > 0 ? (
                  summary.top_positive_points.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between border-b border-gray-100 pb-2"
                    >
                      <span className="text-gray-700">{item.label}</span>
                      <span className="font-medium text-gray-900">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No positive point data yet.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Top things needing attention</h2>
              <div className="space-y-2">
                {summary.top_negative_points.length > 0 ? (
                  summary.top_negative_points.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between border-b border-gray-100 pb-2"
                    >
                      <span className="text-gray-700">{item.label}</span>
                      <span className="font-medium text-gray-900">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No negative point data yet.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {timeline && (
          <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            <div className="space-y-3">
              {timeline.items.length > 0 ? (
                timeline.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.date}</p>
                      <p className="text-sm text-gray-600 capitalize">
                        Tone: {item.tone}
                      </p>
                    </div>

                    <div className="text-sm text-gray-700">
                      <p>Score: {item.day_score}</p>
                      <p>Thread: {item.selected_thread ? formatLabel(item.selected_thread) : "none"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No timeline data yet.</p>
              )}
            </div>
          </section>
        )}

        {recent && (
          <section className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent check-ins</h2>
            <div className="space-y-4">
              {recent.items.length > 0 ? (
                recent.items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{item.date}</p>
                        <p className="text-sm text-gray-600 capitalize">
                          Tone: {item.tone} · Score: {item.day_score}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Thread: {item.selected_thread ? formatLabel(item.selected_thread) : "none"}
                      </p>
                    </div>

                    <p className="mt-3 text-gray-800">{item.raw_message}</p>

                    <div className="mt-3 text-sm text-gray-600">
                      <p>
                        Themes:{" "}
                        {item.themes.length > 0
                          ? item.themes.map(formatLabel).join(", ")
                          : "none"}
                      </p>
                      <p>
                        Positive points:{" "}
                        {item.positive_points.length > 0
                          ? item.positive_points.join(", ")
                          : "none"}
                      </p>
                      <p>
                        Negative points:{" "}
                        {item.negative_points.length > 0
                          ? item.negative_points.join(", ")
                          : "none"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent check-ins yet.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}