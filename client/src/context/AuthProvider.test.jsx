import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "../hooks/useAuth";
import { AUTH_EXPIRED_EVENT } from "../api/http";
import { mockApi } from "../test/utils";

function Probe() {
  const { user, loading, needsSetup, login, register, logout } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <>
      <p>user: {user?.username ?? "none"}</p>
      <p>setup: {String(needsSetup)}</p>
      <button onClick={() => login("paul", "pw").catch(() => {})}>login</button>
      <button onClick={() => register("first", "pw")}>register</button>
      <button onClick={logout}>logout</button>
    </>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  it("restores the session from /api/auth/me", async () => {
    mockApi(({ path }) =>
      path === "/auth/me" ? { body: { username: "paul" } } : undefined,
    );
    renderProvider();

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("user: paul")).toBeInTheDocument();
  });

  it("flags first-run setup when signed out and no users exist", async () => {
    mockApi(({ path }) => {
      if (path === "/auth/me") return { status: 401, body: {} };
      if (path === "/auth/status") return { body: { needsSetup: true } };
    });
    renderProvider();

    expect(await screen.findByText("user: none")).toBeInTheDocument();
    expect(screen.getByText("setup: true")).toBeInTheDocument();
  });

  it("copes with the status check failing", async () => {
    mockApi(() => ({ status: 500, body: {} }));
    renderProvider();
    expect(await screen.findByText("setup: false")).toBeInTheDocument();
  });

  it("logs in", async () => {
    mockApi(({ path }) => {
      if (path === "/auth/me") return { status: 401, body: {} };
      if (path === "/auth/status") return { body: { needsSetup: false } };
      if (path === "/auth/login") return { body: { username: "paul" } };
    });
    renderProvider();

    await userEvent.click(await screen.findByText("login"));
    expect(await screen.findByText("user: paul")).toBeInTheDocument();
  });

  it("stays signed out when login fails", async () => {
    mockApi(({ path }) => {
      if (path === "/auth/me") return { status: 401, body: {} };
      if (path === "/auth/status") return { body: { needsSetup: false } };
      if (path === "/auth/login") return { status: 401, body: { error: "no" } };
    });
    renderProvider();

    await userEvent.click(await screen.findByText("login"));
    expect(screen.getByText("user: none")).toBeInTheDocument();
  });

  it("registers the first user and clears the setup flag", async () => {
    mockApi(({ path }) => {
      if (path === "/auth/me") return { status: 401, body: {} };
      if (path === "/auth/status") return { body: { needsSetup: true } };
      if (path === "/auth/register") return { status: 201, body: { username: "first" } };
    });
    renderProvider();

    await userEvent.click(await screen.findByText("register"));
    expect(await screen.findByText("user: first")).toBeInTheDocument();
    expect(screen.getByText("setup: false")).toBeInTheDocument();
  });

  it("logs out", async () => {
    mockApi(({ path }) => {
      if (path === "/auth/me") return { body: { username: "paul" } };
      if (path === "/auth/logout") return { body: { ok: true } };
    });
    renderProvider();

    await userEvent.click(await screen.findByText("logout"));
    expect(await screen.findByText("user: none")).toBeInTheDocument();
  });

  it("signs the user out when a session-expired event fires", async () => {
    mockApi(() => ({ body: { username: "paul" } }));
    renderProvider();
    await screen.findByText("user: paul");

    act(() => {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    });
    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
  });
});

describe("useAuth", () => {
  it("throws outside an AuthProvider", () => {
    const Broken = () => {
      useAuth();
      return null;
    };
    // React logs the thrown error; keep the test output clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Broken />)).toThrow(
      "useAuth must be used within an AuthProvider",
    );
    spy.mockRestore();
  });
});
