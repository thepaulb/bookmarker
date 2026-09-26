import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BookmarkItem from "./BookmarkItem";
import { renderPage, makeBookmark } from "../test/utils";

function renderItem(bookmark, onDelete = vi.fn()) {
  renderPage(
    <ul>
      <BookmarkItem bookmark={bookmark} onDelete={onDelete} />
    </ul>,
  );
  return onDelete;
}

describe("BookmarkItem", () => {
  it("links the title to the source page in a new tab", () => {
    renderItem(makeBookmark({ title: "Read me", url: "https://a.com/x" }));

    const link = screen.getByRole("link", { name: "Read me" });
    expect(link).toHaveAttribute("href", "https://a.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the created date", () => {
    renderItem(makeBookmark({ createdAt: "2025-07-03T10:32:58.000Z" }));
    const time = screen.getByText(/3 Jul 2025/);
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2025-07-03T10:32:58.000Z");
  });

  it("lists tags as links to their tag pages", () => {
    renderItem(makeBookmark({ tags: ["ux", "s&s"] }));

    const tags = within(screen.getByRole("list", { name: "Tags" }));
    expect(tags.getByRole("link", { name: "ux" })).toHaveAttribute(
      "href",
      "/tags/ux",
    );
    expect(tags.getByRole("link", { name: "s&s" })).toHaveAttribute(
      "href",
      "/tags/s%26s",
    );
  });

  it("omits the tag list when there are no tags", () => {
    renderItem(makeBookmark({ tags: [] }));
    expect(screen.queryByRole("list", { name: "Tags" })).not.toBeInTheDocument();
  });

  it("shows the description when there is one", () => {
    renderItem(makeBookmark({ description: "Worth a read" }));
    expect(screen.getByText("Worth a read")).toBeInTheDocument();
  });

  it("asks for confirmation, then deletes", async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);
    const onDelete = renderItem(makeBookmark({ id: 42, title: "Old news" }));

    await userEvent.click(screen.getByRole("button", { name: "Delete Old news" }));

    expect(confirm).toHaveBeenCalledWith('Delete "Old news"?');
    expect(onDelete).toHaveBeenCalledWith(42);
  });

  it("does nothing if the user cancels", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    const onDelete = renderItem(makeBookmark({ title: "Keep me" }));

    await userEvent.click(screen.getByRole("button", { name: "Delete Keep me" }));

    expect(onDelete).not.toHaveBeenCalled();
  });
});
