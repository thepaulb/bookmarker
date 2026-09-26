import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// UX-only guard: the server's requireAuth is the real enforcement.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
