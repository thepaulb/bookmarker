import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Header from "./components/Header";
import Home from "./pages/Home";
import AddBookmark from "./pages/AddBookmark";
import Results from "./pages/Results";
import Tags from "./pages/Tags";
import TagBookmarks from "./pages/TagBookmarks";
import Login from "./pages/Login";
import AddUser from "./pages/AddUser";

function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to your bookmarks</Link>
      </p>
    </>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Header />
            <main className="page">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/addbookmark" element={<AddBookmark />} />
                <Route path="/results" element={<Results />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/tags/:name" element={<TagBookmarks />} />
                <Route path="/users/new" element={<AddUser />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
