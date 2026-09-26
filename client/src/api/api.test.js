import { describe, it, expect, vi } from "vitest";
import { request, ApiError, AUTH_EXPIRED_EVENT } from "./http";
import { getBookmarks, createBookmark, deleteBookmark } from "./bookmarks";
import { getTags } from "./tags";
import * as auth from "./auth";
import { mockApi } from "../test/utils";

describe("request", () => {
  it("returns parsed JSON on success", async () => {
    mockApi(() => ({ body: { ok: true } }));
    await expect(request("/thing")).resolves.toEqual({ ok: true });
  });

  it("returns null for 204 No Content", async () => {
    mockApi(() => ({ status: 204 }));
    await expect(request("/thing", { method: "DELETE" })).resolves.toBeNull();
  });

  it("sends a JSON body with the right header", async () => {
    const fetchMock = mockApi(() => ({ status: 201, body: {} }));
    await request("/thing", { method: "POST", body: { a: 1 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/thing");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ a: 1 });
  });

  it("throws an ApiError carrying the server's message, status and body", async () => {
    mockApi(() => ({ status: 409, body: { error: "Dupe", existingId: 3 } }));
    const err = await request("/thing").catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Dupe");
    expect(err.status).toBe(409);
    expect(err.body.existingId).toBe(3);
  });

  it("falls back to a generic message when the body isn't JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>", { status: 502 })),
    );
    await expect(request("/thing")).rejects.toThrow("Request failed (502)");
  });

  it("announces an expired session on a 401 from a gated route", async () => {
    mockApi(() => ({ status: 401, body: { error: "Unauthorised" } }));
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    await request("/bookmarks").catch(() => {});
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not announce expiry for auth routes (e.g. a failed login)", async () => {
    mockApi(() => ({ status: 401, body: { error: "Invalid credentials" } }));
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    await request("/auth/login", { method: "POST", body: {} }).catch(() => {});
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("bookmarks api", () => {
  it("getBookmarks builds the query string from what is given", async () => {
    const fetchMock = mockApi(() => ({ body: { bookmarks: [], hasMore: false } }));

    await getBookmarks();
    await getBookmarks({ q: "a b", tag: "s&s", offset: 50 });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/bookmarks");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/bookmarks?q=a+b&tag=s%26s&offset=50",
    );
  });

  it("createBookmark posts the fields", async () => {
    const fetchMock = mockApi(() => ({ status: 201, body: { id: 1 } }));
    await createBookmark({
      url: "https://a.com",
      title: "A",
      description: "",
      tags: ["x"],
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/bookmarks");
    expect(JSON.parse(init.body)).toEqual({
      url: "https://a.com",
      title: "A",
      description: "",
      tags: ["x"],
    });
  });

  it("deleteBookmark sends DELETE to the bookmark", async () => {
    const fetchMock = mockApi(() => ({ status: 204 }));
    await deleteBookmark(7);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bookmarks/7",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("getTags fetches the tag list", async () => {
    mockApi(() => ({ body: [{ name: "ux", count: 2 }] }));
    await expect(getTags()).resolves.toEqual([{ name: "ux", count: 2 }]);
  });
});

describe("auth api", () => {
  it.each([
    ["login", "/api/auth/login"],
    ["register", "/api/auth/register"],
    ["createUser", "/api/auth/create-user"],
  ])("%s posts credentials to %s", async (fn, path) => {
    const fetchMock = mockApi(() => ({ body: { username: "paul" } }));
    await auth[fn]("paul", "secret-pw");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(path);
    expect(JSON.parse(init.body)).toEqual({
      username: "paul",
      password: "secret-pw",
    });
  });

  it.each([
    ["getMe", "/api/auth/me", "GET"],
    ["getAuthStatus", "/api/auth/status", "GET"],
    ["logout", "/api/auth/logout", "POST"],
  ])("%s calls %s", async (fn, path, method) => {
    const fetchMock = mockApi(() => ({ body: {} }));
    await auth[fn]();
    expect(fetchMock).toHaveBeenCalledWith(
      path,
      expect.objectContaining({ method }),
    );
  });
});
