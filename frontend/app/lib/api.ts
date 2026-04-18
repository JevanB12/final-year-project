import { getAuthToken } from "./auth";

/** Parse FastAPI-style `{ "detail": ... }` into a short user-facing string. */
function messageFromErrorBody(status: number, raw: string): string {
  const trimmed = raw?.trim() ?? "";
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
    const { detail } = parsed;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first && typeof first.msg === "string") {
        return first.msg;
      }
    }
  } catch {
    // not JSON
  }

  if (status === 401) {
    return "Invalid email or password.";
  }
  if (status === 403) {
    return "You don't have permission to do that.";
  }
  if (status === 404) {
    return "Not found.";
  }
  if (status >= 500) {
    return "Something went wrong. Please try again.";
  }

  return "Something went wrong.";
}

function buildHeaders() {
  const token = typeof window !== "undefined" ? getAuthToken() : null;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(messageFromErrorBody(response.status, raw));
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Backend returned invalid JSON at ${url}: ${raw.slice(0, 200) || "<empty>"}`
    );
  }
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
    cache: "no-store",
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(messageFromErrorBody(response.status, raw));
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Backend returned invalid JSON at ${url}: ${raw.slice(0, 200) || "<empty>"}`
    );
  }
}