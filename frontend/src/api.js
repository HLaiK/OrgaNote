function getApiBaseUrl() {
  const defaultApiBaseUrl = import.meta.env.DEV
    ? "http://localhost:3002/api"
    : "/api";

  const runtimeApiBaseUrl =
    typeof window !== "undefined"
      ? window.__APP_CONFIG__?.VITE_API_URL
      : undefined;

  return (
    runtimeApiBaseUrl ||
    import.meta.env.VITE_API_URL ||
    defaultApiBaseUrl
  ).replace(/\/$/, "");
}

export async function apiFetch(path, options = {}) {
  const userId = localStorage.getItem("organote_user_id");
  const apiBaseUrl = getApiBaseUrl();

  const res = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      "x-timezone-offset": String(new Date().getTimezoneOffset()),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      `Expected JSON from ${res.url}, received ${contentType || "unknown content type"}: ${text.slice(0, 160)}`,
    );
  }

  return res.json();
}
