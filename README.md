# Bookmarker

A personal bookmarking service to replace getpocket.com. React + Vite on the
front end, Express 5 + SQLite (better-sqlite3) behind it, with the same
architecture as the Workout Tracker: JWT in an httpOnly cookie, every query
scoped to the signed-in user.

See `Bookmarking tool specification.md` for the user stories.

## Getting started

```bash
npm install
(cd client && npm install)
cp .env.example .env   # then set JWT_SECRET
npm run dev            # API on :3001, app on http://localhost:3000
```

On first visit the login page asks you to create the first account. After
that, signed-in users can add more accounts from **Add user**.

## Importing your Pocket export

Create your account in the app first, then:

```bash
npm run import:pocket -- --user <username>
npm run import:pocket -- --user <username> --file "path/to/another.csv"
```

The default file is `Pocket export/part_000000.csv`. The import is safe to
re-run: URLs you already have are skipped. During import:

- Pocket's `time_added` becomes the bookmark's created date.
- Tags are lower-cased and cleaned (stray backslashes removed, empties dropped).
- Titles that are just the URL get a readable one built from it, e.g.
  `Perfect roast chicken – jamieoliver.com`.
- Descriptions are left empty; Pocket's `status` and highlights are not imported.

## Tests

```bash
npm test                     # server then client
npm run test:server:coverage
npm run test:client:coverage
```

Server tests run the Express app in-process against an in-memory database;
client tests use Testing Library in jsdom with a fake API behind `fetch`.

## Layout

```
server/
  app.js, index.js       Express app / entry point
  db.js, schema.sql      SQLite connection and schema
  middleware/auth.js     requireAuth — verifies the JWT cookie
  routes/                auth, bookmarks, tags
  lib/                   data access, URL/title and tag helpers, Pocket import
  import-pocket.js       CLI for the Pocket import
client/src/
  api/                   fetch wrappers — the only code that calls /api
  context/, hooks/       AuthProvider, useAuth, useBookmarkFeed
  components/, pages/    UI
  styles/main.scss       basic styling; tokens at the top for the redesign
```

## API

All routes except `/api/auth/*` and `/api/health` need a session.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/bookmarks?q=&tag=&offset=` | Newest first, 50 per page, `{ bookmarks, hasMore }` |
| POST | `/api/bookmarks` | `{ url, title?, description?, tags? }`; 409 if the URL exists |
| DELETE | `/api/bookmarks/:id` | Removes tags left unused |
| GET | `/api/tags` | `[{ name, count }]`, A–Z |
| GET | `/api/auth/status` | `{ needsSetup }` |
| POST | `/api/auth/register` | First user only |
| POST | `/api/auth/login`, `/api/auth/logout` | |
| GET | `/api/auth/me` | |
| POST | `/api/auth/create-user` | Signed-in users add accounts |
