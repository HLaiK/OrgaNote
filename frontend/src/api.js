export async function apiFetch(path, options = {}) {
  const userId = localStorage.getItem("organote_user_id");

  const res = await fetch(`http://localhost:3002/api${path}`, {
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
