import { request } from "./http";

export function getMe() {
  return request("/auth/me");
}

export function getAuthStatus() {
  return request("/auth/status");
}

export function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

// First-run only: creates the very first account and signs it in.
export function register(username, password) {
  return request("/auth/register", {
    method: "POST",
    body: { username, password },
  });
}

export function logout() {
  return request("/auth/logout", { method: "POST" });
}

// Signed-in users can add further accounts.
export function createUser(username, password) {
  return request("/auth/create-user", {
    method: "POST",
    body: { username, password },
  });
}
