import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useBookmarkFeed } from "./useBookmarkFeed";
import { mockApi, makeBookmark } from "../test/utils";

// A fake server holding `all` bookmarks, paged 2 at a time so paging is
// easy to exercise.
function fakeServer(all, { pageSize = 2 } = {}) {
  const calls = [];
  const fetchMock = mockApi(({ method, path, query }) => {
    calls.push({ method, path, q: query.get("q"), tag: query.get("tag") });
    if (method === "DELETE") {
      const id = Number(path.split("/").pop());
      const i = all.findIndex((b) => b.id === id);
      if (i === -1) return { status: 404, body: { error: "Bookmark not found" } };
      all.splice(i, 1);
      return { status: 204 };
    }
    const offset = Number(query.get("offset") ?? 0);
    return {
      body: {
        bookmarks: all.slice(offset, offset + pageSize),
        hasMore: offset + pageSize < all.length,
        pageSize,
      },
    };
  });
  return { calls, fetchMock };
}

describe("useBookmarkFeed", () => {
  it("loads the first page", async () => {
    const all = [makeBookmark(), makeBookmark(), makeBookmark()];
    fakeServer(all);

    const { result } = renderHook(() => useBookmarkFeed());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookmarks).toEqual(all.slice(0, 2));
    expect(result.current.hasMore).toBe(true);
  });

  it("passes q and tag to the API", async () => {
    const { calls } = fakeServer([]);
    const { result } = renderHook(() => useBookmarkFeed({ q: "kan", tag: "ux" }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls[0]).toMatchObject({ q: "kan", tag: "ux" });
  });

  it("appends the next page on loadMore", async () => {
    const all = [makeBookmark(), makeBookmark(), makeBookmark()];
    fakeServer(all);
    const { result } = renderHook(() => useBookmarkFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.loadMore());

    expect(result.current.bookmarks.map((b) => b.id)).toEqual(all.map((b) => b.id));
    expect(result.current.hasMore).toBe(false);
  });

  it("keeps paging correct after a delete", async () => {
    const all = [1, 2, 3, 4, 5].map((id) => makeBookmark({ id }));
    fakeServer(all);
    const { result } = renderHook(() => useBookmarkFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.remove(1));
    await act(() => result.current.loadMore());

    expect(result.current.bookmarks.map((b) => b.id)).toEqual([2, 3, 4]);
  });

  it("does not duplicate bookmarks that appear on two pages", async () => {
    const shared = makeBookmark();
    let call = 0;
    mockApi(() => {
      call += 1;
      return {
        body: {
          bookmarks: call === 1 ? [shared] : [shared, makeBookmark({ id: 999 })],
          hasMore: call === 1,
        },
      };
    });
    const { result } = renderHook(() => useBookmarkFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.loadMore());
    expect(result.current.bookmarks.map((b) => b.id)).toEqual([shared.id, 999]);
  });

  it("removes a deleted bookmark", async () => {
    const all = [makeBookmark({ id: 1 }), makeBookmark({ id: 2 })];
    const { calls } = fakeServer(all);
    const { result } = renderHook(() => useBookmarkFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.remove(1));

    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: "/bookmarks/1" });
    expect(result.current.bookmarks.map((b) => b.id)).toEqual([2]);
  });

  it("reports a failed delete and keeps the bookmark", async () => {
    fakeServer([makeBookmark({ id: 1 })]);
    const { result } = renderHook(() => useBookmarkFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.remove(123));

    expect(result.current.error).toBe(
      "Could not delete bookmark: Bookmark not found",
    );
    expect(result.current.bookmarks).toHaveLength(1);
  });

  it("reports a failed load", async () => {
    mockApi(() => ({ status: 500, body: { error: "Something went wrong" } }));
    const { result } = renderHook(() => useBookmarkFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Something went wrong");
  });

  it("reports a failed loadMore", async () => {
    let call = 0;
    mockApi(() => {
      call += 1;
      return call === 1
        ? { body: { bookmarks: [makeBookmark()], hasMore: true } }
        : { status: 500, body: { error: "Nope" } };
    });
    const { result } = renderHook(() => useBookmarkFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.loadMore());
    expect(result.current.error).toBe("Nope");
    expect(result.current.loadingMore).toBe(false);
  });

  it("reloads from the start when the query changes", async () => {
    const { calls } = fakeServer([makeBookmark()]);
    const { result, rerender } = renderHook((props) => useBookmarkFeed(props), {
      initialProps: { q: "one" },
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    rerender({ q: "two" });
    await waitFor(() => expect(calls.at(-1).q).toBe("two"));
  });
});
