import { useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Wordmark from "./Wordmark";
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

  // The wordmark sits centred between two navs, mirrored either side.
  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <nav className={styles.primary} aria-label="Main">
          <Link to="/addbookmark" className={styles.add}>
            <svg viewBox="0 0 14 14" aria-hidden="true">
              <path d="M7 1v12M1 7h12" />
            </svg>
            Add bookmark
          </Link>
          <NavLink to="/tags" className={styles.link}>
            Tags
          </NavLink>
        </nav>

        <Link to="/" className={styles.brand}>
          <Wordmark />
        </Link>

        <nav className={styles.account} aria-label="Account">
          <NavLink to="/users/new" className={styles.link}>
            Add user
          </NavLink>
          <button type="button" className={styles.logout} onClick={handleLogout}>
            Log out{user ? ` ${user.username}` : ""}
          </button>
        </nav>
      </div>

      <form role="search" className={styles.search} onSubmit={handleSearch}>
        <svg className={styles.moon} viewBox="0 0 22 22" aria-hidden="true">
          <path d="M14 2.5a9 9 0 1 0 5.5 14.6A7.5 7.5 0 0 1 14 2.5z" />
        </svg>
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
