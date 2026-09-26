// Shared helpers for client tests: a fake API behind fetch, and render
// wrappers that supply a router and auth context.
import { vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// Replace fetch with a fake server. handler receives
// { method, path, query, body } — path without the /api prefix, query as
// URLSearchParams — and returns { status, body } (status defaults to 200).
// Returns the vi.fn so tests can inspect calls.
export function mockApi(handler) {
  const fetchMock = vi.fn(async (input, init = {}) => {
    const url = new URL(input, "http://localhost");
    const result = (await handler({
      method: init.method || "GET",
      path: url.pathname.replace(/^\/api/, ""),
      query: url.searchParams,
      body: init.body ? JSON.parse(init.body) : undefined,
    })) ?? { status: 404, body: { error: "Not found" } };
    const status = result.status ?? 200;
    return new Response(
      status === 204 ? null : JSON.stringify(result.body ?? null),
      { status, headers: { "Content-Type": "application/json" } },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Build a bookmark as the API returns it.
let nextId = 1;
export function makeBookmark(fields = {}) {
  const id = fields.id ?? nextId++;
  return {
    id,
    url: `https://example.com/${id}`,
    title: `Bookmark ${id}`,
    description: "",
    createdAt: "2026-09-26T12:00:00.000Z",
    tags: [],
    ...fields,
  };
}

// Shows the current location so tests can assert on navigation.
function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  );
}

export function fakeAuth(overrides = {}) {
  return {
    user: { username: "paul" },
    loading: false,
    needsSetup: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  };
}

// Render ui at `route`, matched by `path` (so useParams works), inside a
// MemoryRouter and a fake auth context.
export function renderPage(
  ui,
  { route = "/", path = "*", auth = fakeAuth() } = {},
) {
  const result = render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          {path !== "*" && <Route path="*" element={null} />}
        </Routes>
        <LocationDisplay />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { ...result, auth };
}
