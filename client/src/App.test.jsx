// Routing smoke tests: the real AuthProvider and route table against a
// fake API.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { AppRoutes } from "./App";
import { mockApi, makeBookmark } from "./test/utils";

function renderAt(route) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}

function signedIn() {
  mockApi(({ path }) => {
    if (path === "/auth/me") return { body: { username: "paul" } };
    if (path === "/bookmarks") {
      return { body: { bookmarks: [makeBookmark({ title: "Hello" })], hasMore: false } };
    }
    if (path === "/tags") return { body: [] };
  });
}

describe("App routes", () => {
  it("sends signed-out visitors to the login page", async () => {
    mockApi(({ path }) => {
      if (path === "/auth/me") return { status: 401, body: {} };
      if (path === "/auth/status") return { body: { needsSetup: false } };
    });
    renderAt("/tags");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows the home page with the header when signed in", async () => {
    signedIn();
    renderAt("/");
    expect(
      await screen.findByRole("heading", { name: "Recent bookmarks" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Hello" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add bookmark" })).toBeInTheDocument();
  });

  it.each([
    ["/addbookmark", "Add a bookmark"],
    ["/tags", "Tags"],
    ["/users/new", "Add a user"],
    ["/nowhere", "Page not found"],
  ])("routes %s", async (route, heading) => {
    signedIn();
    renderAt(route);
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  });
});
