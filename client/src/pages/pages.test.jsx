// Page-level tests: each page rendered at its real route against a fake API.
import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "./Home";
import Results from "./Results";
import Tags from "./Tags";
import TagBookmarks from "./TagBookmarks";
import AddBookmark from "./AddBookmark";
import AddUser from "./AddUser";
import { renderPage, mockApi, makeBookmark } from "../test/utils";

function page(bookmarks, hasMore = false) {
  return { body: { bookmarks, hasMore, pageSize: 50 } };
}

describe("Home", () => {
  it("shows recent bookmarks without Load more", async () => {
    const fetchMock = mockApi(() =>
      page([makeBookmark({ title: "Newest" }), makeBookmark({ title: "Older" })], true),
    );
    renderPage(<Home />);

    expect(
      await screen.findByRole("link", { name: "Newest" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Older" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bookmarks");
  });

  it("invites the user to add their first bookmark", async () => {
    mockApi(() => page([]));
    renderPage(<Home />);

    expect(
      await screen.findByRole("link", { name: "Add your first one" }),
    ).toHaveAttribute("href", "/addbookmark");
  });
});

describe("Results", () => {
  it("searches for the q parameter and pages", async () => {
    const fetchMock = mockApi(({ query }) =>
      query.get("offset")
        ? page([makeBookmark({ title: "Second page" })])
        : page([makeBookmark({ title: "Kanban intro" })], true),
    );
    renderPage(<Results />, { route: "/results?q=kanban" });

    expect(
      await screen.findByRole("heading", { name: "Results for “kanban”" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Kanban intro" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bookmarks?q=kanban");

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("link", { name: "Second page" })).toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    mockApi(() => page([]));
    renderPage(<Results />, { route: "/results?q=zebra" });
    expect(
      await screen.findByText("No bookmarks match your search."),
    ).toBeInTheDocument();
  });

  it("prompts for a query when q is missing", () => {
    mockApi(() => page([]));
    renderPage(<Results />, { route: "/results" });
    expect(
      screen.getByText("Type something in the search box to find bookmarks."),
    ).toBeInTheDocument();
  });
});

describe("Tags", () => {
  it("lists tags with counts as links to their pages", async () => {
    mockApi(() => ({
      body: [
        { name: "agile", count: 3 },
        { name: "s&s", count: 1 },
      ],
    }));
    renderPage(<Tags />, { route: "/tags" });

    const link = await screen.findByRole("link", { name: "s&s (1)" });
    expect(link).toHaveAttribute("href", "/tags/s%26s");
    expect(screen.getByRole("link", { name: "agile (3)" })).toHaveAttribute(
      "href",
      "/tags/agile",
    );
  });

  it("says when there are no tags", async () => {
    mockApi(() => ({ body: [] }));
    renderPage(<Tags />, { route: "/tags" });
    expect(await screen.findByText("No tags yet.")).toBeInTheDocument();
  });

  it("shows an error if tags fail to load", async () => {
    mockApi(() => ({ status: 500, body: { error: "Something went wrong" } }));
    renderPage(<Tags />, { route: "/tags" });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong",
    );
  });
});

describe("TagBookmarks", () => {
  it("shows bookmarks for the decoded tag name", async () => {
    const fetchMock = mockApi(() => page([makeBookmark({ title: "Tagged one" })]));
    renderPage(<TagBookmarks />, {
      route: "/tags/s%26s",
      path: "/tags/:name",
    });

    expect(await screen.findByRole("link", { name: "Tagged one" })).toBeInTheDocument();
    expect(screen.getByRole("heading")).toHaveTextContent("Tagged s&s");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bookmarks?tag=s%26s");
    expect(screen.getByRole("link", { name: "All tags" })).toHaveAttribute(
      "href",
      "/tags",
    );
  });
});

describe("AddBookmark", () => {
  function api({ create } = {}) {
    return mockApi(({ method, path, body }) => {
      if (path === "/tags") return { body: [{ name: "ux", count: 1 }] };
      if (method === "POST" && path === "/bookmarks") {
        return create ? create(body) : { status: 201, body: makeBookmark(body) };
      }
    });
  }

  it("offers the user's existing tags", async () => {
    api();
    renderPage(<AddBookmark />, { route: "/addbookmark" });
    expect(await screen.findByRole("option", { name: "ux" })).toBeInTheDocument();
  });

  it("keeps Save disabled until a URL is entered", async () => {
    api();
    renderPage(<AddBookmark />, { route: "/addbookmark" });
    const save = screen.getByRole("button", { name: "Save bookmark" });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText("URL"), "a.com");
    expect(save).toBeEnabled();
  });

  it("saves the bookmark with its fields and returns home", async () => {
    let posted;
    api({
      create: (body) => {
        posted = body;
        return { status: 201, body: makeBookmark(body) };
      },
    });
    renderPage(<AddBookmark />, { route: "/addbookmark" });

    await userEvent.type(screen.getByLabelText("URL"), "https://a.com/post");
    await userEvent.type(screen.getByLabelText(/Title/), "A post");
    await userEvent.type(screen.getByLabelText(/Description/), "Good stuff");
    await userEvent.selectOptions(await screen.findByRole("listbox"), ["ux"]);
    await userEvent.type(screen.getByLabelText("New tag"), "reading{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Save bookmark" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/),
    );
    expect(posted).toEqual({
      url: "https://a.com/post",
      title: "A post",
      description: "Good stuff",
      tags: ["ux", "reading"],
    });
  });

  it("alerts the user when the URL is already bookmarked", async () => {
    api({
      create: () => ({
        status: 409,
        body: { error: "You have already bookmarked this URL", existingId: 4 },
      }),
    });
    renderPage(<AddBookmark />, { route: "/addbookmark" });

    await userEvent.type(screen.getByLabelText("URL"), "https://a.com");
    await userEvent.click(screen.getByRole("button", { name: "Save bookmark" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("You have already bookmarked this URL.");
    expect(within(alert).getByRole("link", { name: "Find it" })).toHaveAttribute(
      "href",
      "/results?q=https%3A%2F%2Fa.com",
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/addbookmark");
  });

  it("clears the duplicate alert when the URL is edited", async () => {
    api({ create: () => ({ status: 409, body: { error: "dupe" } }) });
    renderPage(<AddBookmark />, { route: "/addbookmark" });

    await userEvent.type(screen.getByLabelText("URL"), "https://a.com");
    await userEvent.click(screen.getByRole("button", { name: "Save bookmark" }));
    await screen.findByRole("alert");

    await userEvent.type(screen.getByLabelText("URL"), "/b");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows validation errors from the server", async () => {
    api({
      create: () => ({
        status: 400,
        body: { error: "Please enter a valid http or https URL" },
      }),
    });
    renderPage(<AddBookmark />, { route: "/addbookmark" });

    await userEvent.type(screen.getByLabelText("URL"), "nonsense");
    await userEvent.click(screen.getByRole("button", { name: "Save bookmark" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please enter a valid http or https URL",
    );
    expect(screen.getByRole("button", { name: "Save bookmark" })).toBeEnabled();
  });

  it("still works if tags fail to load", async () => {
    mockApi(({ path }) =>
      path === "/tags" ? { status: 500, body: {} } : undefined,
    );
    renderPage(<AddBookmark />, { route: "/addbookmark" });
    expect(
      await screen.findByText("You have no tags yet — create one below."),
    ).toBeInTheDocument();
  });
});

describe("AddUser", () => {
  async function fill(username, password, confirm = password) {
    await userEvent.type(screen.getByLabelText("Username"), username);
    await userEvent.type(screen.getByLabelText("Password"), password);
    await userEvent.type(screen.getByLabelText("Confirm password"), confirm);
    await userEvent.click(screen.getByRole("button", { name: "Create user" }));
  }

  it("creates a user and clears the form", async () => {
    const fetchMock = mockApi(() => ({
      status: 201,
      body: { id: 2, username: "alex" },
    }));
    renderPage(<AddUser />);

    await fill("alex", "long-enough");

    expect(await screen.findByRole("status")).toHaveTextContent('User "alex" created');
    expect(screen.getByLabelText("Username")).toHaveValue("");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/create-user");
  });

  it("checks the passwords match before calling the API", async () => {
    const fetchMock = mockApi(() => ({ body: {} }));
    renderPage(<AddUser />);

    await fill("alex", "long-enough", "different");

    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows server errors", async () => {
    mockApi(() => ({ status: 409, body: { error: "Username already taken" } }));
    renderPage(<AddUser />);

    await fill("paul", "long-enough");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Username already taken",
    );
  });
});
