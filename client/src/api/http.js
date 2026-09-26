// The single seam between the UI and the backend. Every call goes to
// /api/..., carries the httpOnly session cookie automatically, and throws
// an ApiError (with the server's message) on a non-2xx response.

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// Fired when a gated call comes back 401 (e.g. the 7-day session expired),
// so AuthProvider can drop the user and send them to the login screen.
export const AUTH_EXPIRED_EVENT = "auth:expired";

export async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(
      data?.error || `Request failed (${res.status})`,
      res.status,
      data,
    );
  }
  return data;
}
