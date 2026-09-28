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

## Importing bookmarks

Create your account in the app first, then:

```bash
npm run import -- --user <username>
npm run import -- --user <username> --file ~/Downloads/bookmarks.json --tag to-sort
```

| Option | Meaning |
| --- | --- |
| `--user <name>` | Account to import into (required) |
| `--file <path>` | `.csv` = Pocket export, `.json` = Trello export. Default: `Pocket export/part_000000.csv` |
| `--tag <name>` | Add this tag to every imported bookmark. Repeat for several tags |
| `--no-fetch-titles` | Don't visit pages to look up missing titles; build them from the URL |

`npm run import:pocket` still works and is the same command.

The import is safe to re-run: URLs you already have are skipped, as are
repeats within the file. It prints a summary, plus any items it skipped
because they had no usable URL.

**Pocket CSV** (`title,url,time_added,tags,status`)

- `time_added` becomes the bookmark's created date.
- Tags are lower-cased and cleaned (stray backslashes removed, empties dropped).
- Titles that are just the URL get a readable one built from it, e.g.
  `Perfect roast chicken – jamieoliver.com`.
- Descriptions are left empty; `status` and highlights are not imported.

**Trello JSON** (a board or card export with a checklist of links)

- Every checklist item is read. The first URL in its text is kept, including
  from a Markdown `[text](url)` link. Any note around the URL is discarded.
- The created date comes from the item's Trello id, which encodes when the
  item was added.
- Items have no titles, so the import looks them up (see below).

**Title lookup.** For bookmarks without a title, the import script visits
each page once, six at a time, and uses its `og:title` or `<title>`.
YouTube titles come from YouTube's oEmbed endpoint, because UK visitors are
shown a cookie-consent page. Pages that fail, time out after 8 seconds, or
return a bot-wall or error title ("Just a moment…", "Access denied", "Page
not found") fall back to a title built from the URL. Only these command-line
scripts fetch pages; the running app never does.

## Tracking parameters

Every URL, whether imported or added in the app, has click-tracking
parameters removed before it is saved: `utm_*`, `fbclid`, `gclid`, `mc_cid`,
HubSpot's `_hsenc`, TED's `user_email_address`, and others (the full list is
in `server/lib/urls.js`). On YouTube, the share parameters `si`, `feature` and
`pp` are also dropped, while the video, playlist and position are kept. As a
result, the same article saved from two newsletters counts as a duplicate.

To clean URLs saved before this was added:

```bash
npm run clean:urls              # dry run: lists what would change
npm run clean:urls -- --apply   # makes the changes
```

When several bookmarks turn out to be the same page, the oldest is kept,
the others' tags are merged into it, and the rest are deleted. Back up the
database first (see below).

## Backups

Your bookmarks live in `server/bookmarks.db`, which is not committed to git.
Take a copy before running imports or clean-ups:

```bash
npm run backup
```

This writes a timestamped copy to `server/backups/` and keeps the latest 30.
`backups/` is ignored by git. To restore, stop the server, delete
`server/bookmarks.db-wal` and `server/bookmarks.db-shm` if they exist (they
belong to the current database), then copy the backup over
`server/bookmarks.db`.

## Deployment

Production runs at https://bookmarks.theanvil.uk and deploys automatically on
merge to `main`. See [DEPLOY.md](DEPLOY.md) for how it's set up, backups,
restores and rollbacks.

## Tests

```bash
npm test                     # server then client
npm run test:server:coverage
npm run test:client:coverage
```

Server tests run the Express app in-process against an in-memory database;
client tests use Testing Library in jsdom with a fake API behind `fetch`.

Run the server tests from the project root (or with the npm scripts). From
anywhere else Vitest can't find `vitest.config.mjs`, and `server/db.js`
refuses to start rather than let the tests reach your real database.

## Layout

```
server/
  app.js, index.js       Express app / entry point
  db.js, schema.sql      SQLite connection and schema
  middleware/auth.js     requireAuth — verifies the JWT cookie
  routes/                auth, bookmarks, tags
  lib/                   data access, URL/title and tag helpers,
                         Pocket and Trello parsers, importer, title lookup,
                         URL clean-up
  import-bookmarks.js    CLI: npm run import
  clean-urls.js          CLI: npm run clean:urls
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
| POST | `/api/bookmarks` | `{ url, title?, description?, tags? }`; tracking parameters stripped; 409 if the URL exists |
| DELETE | `/api/bookmarks/:id` | Removes tags left unused |
| GET | `/api/tags` | `[{ name, count }]`, A–Z |
| GET | `/api/auth/status` | `{ needsSetup }` |
| POST | `/api/auth/register` | First user only |
| POST | `/api/auth/login`, `/api/auth/logout` | |
| GET | `/api/auth/me` | |
| POST | `/api/auth/create-user` | Signed-in users add accounts |
