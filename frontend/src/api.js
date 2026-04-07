const defaultApiBaseUrl = import.meta.env.DEV
  ? "http://localhost:3002/api"
  : "/api";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || defaultApiBaseUrl
).replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const userId = localStorage.getItem("organote_user_id");

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }

  return res.json();
}
