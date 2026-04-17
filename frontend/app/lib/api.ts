export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Backend error ${response.status} at ${url}: ${raw || response.statusText}`);
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
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store", // important for fresh analytics data
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Backend error ${response.status} at ${url}: ${raw || response.statusText}`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Backend returned invalid JSON at ${url}: ${raw.slice(0, 200) || "<empty>"}`
    );
  }
}