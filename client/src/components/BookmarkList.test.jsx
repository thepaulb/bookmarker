import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookmarkList from "./BookmarkList";
import { renderPage, makeBookmark } from "../test/utils";

function feed(overrides = {}) {
  return {
    bookmarks: [],
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
    loadMore: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

describe("BookmarkList", () => {
  it("shows a loading message", () => {
    renderPage(<BookmarkList feed={feed({ loading: true })} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the empty message when there are no bookmarks", () => {
    renderPage(<BookmarkList feed={feed()} emptyMessage="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("renders one item per bookmark in order", () => {
    renderPage(
      <BookmarkList
        feed={feed({
          bookmarks: [makeBookmark({ title: "One" }), makeBookmark({ title: "Two" })],
        })}
      />,
    );
    const links = screen.getAllByRole("link").map((a) => a.textContent);
    expect(links).toEqual(["One", "Two"]);
  });

  it("shows errors as an alert", () => {
    renderPage(<BookmarkList feed={feed({ error: "Boom" })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
  });

  it("offers Load more when there are more pages", async () => {
    const f = feed({ bookmarks: [makeBookmark()], hasMore: true });
    renderPage(<BookmarkList feed={f} />);

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(f.loadMore).toHaveBeenCalled();
  });

  it("disables Load more while loading", () => {
    renderPage(
      <BookmarkList
        feed={feed({ bookmarks: [makeBookmark()], hasMore: true, loadingMore: true })}
      />,
    );
    expect(screen.getByRole("button", { name: "Loading…" })).toBeDisabled();
  });

  it("hides Load more when not pageable", () => {
    renderPage(
      <BookmarkList
        pageable={false}
        feed={feed({ bookmarks: [makeBookmark()], hasMore: true })}
      />,
    );
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("passes deletes through to the feed", async () => {
    vi.stubGlobal("confirm", () => true);
    const f = feed({ bookmarks: [makeBookmark({ id: 9, title: "Bye" })] });
    renderPage(<BookmarkList feed={f} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete Bye" }));
    expect(f.remove).toHaveBeenCalledWith(9);
  });
});
