import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "./Login";
import { renderPage, fakeAuth } from "../test/utils";

function signedOut(overrides = {}) {
  return fakeAuth({ user: null, ...overrides });
}

describe("Login", () => {
  it("signs in and goes home", async () => {
    const auth = signedOut({ login: vi.fn().mockResolvedValue() });
    renderPage(<Login />, { route: "/login", auth });

    await userEvent.type(screen.getByLabelText("Username"), "paul");
    await userEvent.type(screen.getByLabelText("Password"), "secret-pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.login).toHaveBeenCalledWith("paul", "secret-pw");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/),
    );
  });

  it("shows a generic error on bad credentials", async () => {
    const auth = signedOut({ login: vi.fn().mockRejectedValue(new Error("x")) });
    renderPage(<Login />, { route: "/login", auth });

    await userEvent.type(screen.getByLabelText("Username"), "paul");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username or password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("disables sign in until both fields are filled", async () => {
    renderPage(<Login />, { route: "/login", auth: signedOut() });
    const button = screen.getByRole("button", { name: "Sign in" });
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Username"), "paul");
    expect(button).toBeDisabled();
  });

  it("redirects home when already signed in", () => {
    renderPage(<Login />, { route: "/login" });
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("renders nothing while auth is loading", () => {
    renderPage(<Login />, {
      route: "/login",
      auth: signedOut({ loading: true }),
    });
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  describe("first-run setup", () => {
    it("creates the first account", async () => {
      const auth = signedOut({
        needsSetup: true,
        register: vi.fn().mockResolvedValue(),
      });
      renderPage(<Login />, { route: "/login", auth });

      expect(
        screen.getByRole("heading", { name: "Create your account" }),
      ).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Username"), "paul");
      await userEvent.type(screen.getByLabelText("Password"), "long-enough");
      await userEvent.type(screen.getByLabelText("Confirm password"), "long-enough");
      await userEvent.click(screen.getByRole("button", { name: "Create account" }));

      expect(auth.register).toHaveBeenCalledWith("paul", "long-enough");
      expect(auth.login).not.toHaveBeenCalled();
    });

    it("checks the passwords match", async () => {
      const auth = signedOut({ needsSetup: true });
      renderPage(<Login />, { route: "/login", auth });

      await userEvent.type(screen.getByLabelText("Username"), "paul");
      await userEvent.type(screen.getByLabelText("Password"), "long-enough");
      await userEvent.type(screen.getByLabelText("Confirm password"), "other");
      await userEvent.click(screen.getByRole("button", { name: "Create account" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
      expect(auth.register).not.toHaveBeenCalled();
    });

    it("shows the server's error (e.g. password too short)", async () => {
      const auth = signedOut({
        needsSetup: true,
        register: vi
          .fn()
          .mockRejectedValue(new Error("password must be at least 8 characters")),
      });
      renderPage(<Login />, { route: "/login", auth });

      await userEvent.type(screen.getByLabelText("Username"), "paul");
      await userEvent.type(screen.getByLabelText("Password"), "short");
      await userEvent.type(screen.getByLabelText("Confirm password"), "short");
      await userEvent.click(screen.getByRole("button", { name: "Create account" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "password must be at least 8 characters",
      );
    });
  });
});
