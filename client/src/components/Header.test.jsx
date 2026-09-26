import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "./Header";
import { renderPage, fakeAuth } from "../test/utils";

describe("Header", () => {
  it("has Add, Tags and Add user links", () => {
    renderPage(<Header />);
    expect(screen.getByRole("link", { name: "Add" })).toHaveAttribute(
      "href",
      "/addbookmark",
    );
    expect(screen.getByRole("link", { name: "Tags" })).toHaveAttribute(
      "href",
      "/tags",
    );
    expect(screen.getByRole("link", { name: "Add user" })).toHaveAttribute(
      "href",
      "/users/new",
    );
  });

  it("searches by navigating to /results?q=", async () => {
    renderPage(<Header />);

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search bookmarks" }),
      "kanban board{Enter}",
    );

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/results?q=kanban+board",
    );
  });

  it("ignores an empty search", async () => {
    renderPage(<Header />);
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("prefills the search box from the current query", () => {
    renderPage(<Header />, { route: "/results?q=fitness" });
    expect(screen.getByRole("searchbox")).toHaveValue("fitness");
  });

  it("logs out and returns to the login page", async () => {
    const auth = fakeAuth({ logout: vi.fn().mockResolvedValue() });
    renderPage(<Header />, { auth });

    await userEvent.click(screen.getByRole("button", { name: "Log out paul" }));

    expect(auth.logout).toHaveBeenCalled();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
