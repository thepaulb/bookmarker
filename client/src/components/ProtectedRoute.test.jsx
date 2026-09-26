import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import ProtectedRoute from "./ProtectedRoute";
import { renderPage, fakeAuth } from "../test/utils";

const Secret = () => (
  <ProtectedRoute>
    <p>secret</p>
  </ProtectedRoute>
);

describe("ProtectedRoute", () => {
  it("renders children for a signed-in user", () => {
    renderPage(<Secret />);
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("renders nothing while auth is loading", () => {
    renderPage(<Secret />, { auth: fakeAuth({ user: null, loading: true }) });
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });

  it("redirects to /login when signed out", () => {
    renderPage(<Secret />, { auth: fakeAuth({ user: null }) });
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
