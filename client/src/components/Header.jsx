import { useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./Header.module.scss";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/results?${new URLSearchParams({ q })}`);
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link to="/" className={styles.brand}>
          Bookmarker
        </Link>

        <nav className={styles.nav} aria-label="Main">
          <Link to="/addbookmark" className={styles.add}>
            Add
          </Link>
          <NavLink to="/tags" className={styles.link}>
            Tags
          </NavLink>
          <NavLink to="/users/new" className={styles.link}>
            Add user
          </NavLink>
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Log out{user ? ` ${user.username}` : ""}
          </button>
        </nav>
      </div>

      <form role="search" className={styles.search} onSubmit={handleSearch}>
        <label htmlFor="search" className="visually-hidden">
          Search bookmarks
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search titles, URLs and tags"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
    </header>
  );
}
