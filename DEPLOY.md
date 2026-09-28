# Deploying Bookmarker

Bookmarker runs at **https://bookmarks.theanvil.uk** on the same Hetzner box
as the Workout Tracker (`gym.theanvil.uk`), behind a shared Caddy.

## How it fits together

```
Browser ──443──▶ Caddy (~/workout-tracker/proxy)
                   │  external docker network `web`
                   ├──▶ gym:3001         (workout-tracker)
                   └──▶ bookmarker:3001  (this repo, ~/bookmarker)
                                │
                                ▼
                     volume bookmarker_bookmarker-data
                       /data/bookmarks.db  + backups/
```

- **One container** serves both the API and the built React client from
  `client/dist`, so there's no CORS and no separate client container.
- **No published ports.** The app is only reachable through Caddy, over
  the `web` network. It joins as `bookmarker`, because both apps name their
  compose service `app`.
- **The volume is the only state.** Everything else can be rebuilt from git.
- Caddy's config lives in the workout-tracker repo:
  [`proxy/README.md`](https://github.com/thepaulb/workout-tracker/blob/main/proxy/README.md).

## Everyday deploys

Merge to `main`. [CI](.github/workflows/ci.yml) then:

1. runs the server and client tests, and builds the client
2. builds the Docker image and pushes it to `ghcr.io/thepaulb/bookmarker`,
   tagged `:latest` and `:<commit sha>`
3. SSHes in as `deploy` and runs `git pull`, `docker compose pull` and
   `docker compose up -d` in `~/bookmarker`

PRs run the tests plus a Docker build check, but don't deploy.

### Rolling back

Deploy an earlier image by its commit SHA:

```sh
cd ~/bookmarker
IMAGE=ghcr.io/thepaulb/bookmarker:<sha>
docker pull $IMAGE && docker tag $IMAGE ghcr.io/thepaulb/bookmarker:latest
docker compose -f docker-compose.prod.yml up -d   # no `pull`, or it fetches the newest :latest again
```

The next merge to `main` puts `:latest` back on the new build. Schema
changes aren't reversed by a rollback, so restore a backup if one needs undoing.

## Configuration

`~/bookmarker/.env` on the server (mode 600, never committed or baked into
the image):

| Name             | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| `JWT_SECRET`     | Production-only. The app refuses to start without it.    |
| `JWT_EXPIRES_IN` | `7d`                                                     |

`DB_PATH=/data/bookmarks.db` and `NODE_ENV=production` are set by the
compose file and the image, not by `.env`.

GitHub repo secret: **`DEPLOY_SSH_KEY`**, a private key whose public half is
in `~deploy/.ssh/authorized_keys` on the server. It's the `bookmarker_ci` key,
separate from the gym repo's key.

## Backups

`server/backup.js` (`npm run backup`) takes an online SQLite backup into a
`backups/` folder next to the database, and keeps the latest 30. In
production that's inside the volume, so backups survive redeploys.

Nightly cron on the server (`crontab -e` as `deploy`):

```
0 3 * * * cd ~/bookmarker && docker compose -f docker-compose.prod.yml exec -T app node server/backup.js >> ~/bookmarker-backup.log 2>&1
```

Check it with `tail ~/bookmarker-backup.log`. Each run logs its row counts.

List the backups:

```sh
docker run --rm -v bookmarker_bookmarker-data:/data alpine ls -la /data/backups
```

## Restoring or replacing the database

Use this to restore from a backup, or to seed from a local database (this
is how production was first seeded).

**Always stop the app first.** If it's running, it keeps the old database
open and can write it back over your copy.

1. Put the file you want at `~/seed/bookmarks.db` on the server.
   - From your Mac:
     ```sh
     npm run backup
     scp "$(ls -t server/backups/bookmarks-*.db | head -1)" deploy@gym.theanvil.uk:seed/bookmarks.db
     ```
   - Or from a server-side backup:
     ```sh
     docker run --rm -v bookmarker_bookmarker-data:/data -v ~/seed:/seed alpine \
       cp /data/backups/bookmarks-<timestamp>.db /seed/bookmarks.db
     ```

2. Swap it in:
   ```sh
   cd ~/bookmarker
   docker compose -f docker-compose.prod.yml stop app
   docker run --rm -v bookmarker_bookmarker-data:/data -v ~/seed:/seed alpine sh -c \
     'rm -f /data/bookmarks.db /data/bookmarks.db-wal /data/bookmarks.db-shm \
      && cp /seed/bookmarks.db /data/bookmarks.db \
      && chown 1000:1000 /data/bookmarks.db && ls -la /data'
   docker compose -f docker-compose.prod.yml start app
   ```
   The listing should show `bookmarks.db` at the same size as the seed file,
   owned by `1000` (the image's `node` user).

3. Check you can log in, then `rm -rf ~/seed`.

## Setting up from scratch

This is what was done for the first deploy (2026-09-28), for rebuilding
the box or repeating it elsewhere. It assumes the shared proxy and the
`web` network already exist (see the workout-tracker `proxy/README.md`).

1. **DNS (Cloudflare):** A and AAAA records for `bookmarks`, with the same
   IPs as `gym`, set to **DNS only** (grey cloud) so Caddy can get its own
   Let's Encrypt certificate.
2. **Caddyfile:** a `bookmarks.theanvil.uk { reverse_proxy bookmarker:3001 }`
   block in the workout-tracker `proxy/Caddyfile`, then reload Caddy.
3. **Clone over HTTPS.** The repo is public, and cloning over SSH fails
   with `Permission denied (publickey)` because the server has no GitHub
   key for this repo:
   ```sh
   git clone https://github.com/thepaulb/bookmarker.git ~/bookmarker
   ```
4. **`.env`:**
   ```sh
   printf 'JWT_SECRET=%s\nJWT_EXPIRES_IN=7d\n' "$(openssl rand -hex 48)" > ~/bookmarker/.env
   chmod 600 ~/bookmarker/.env
   ```
5. **CI key (on your Mac):** generate a key pair, add the public half to the
   server's `authorized_keys`, and store the private half as the
   `DEPLOY_SSH_KEY` repo secret:
   ```sh
   ssh-keygen -t ed25519 -f ~/.ssh/bookmarker_ci -N "" -C "bookmarker-ci"
   cat ~/.ssh/bookmarker_ci.pub | ssh deploy@gym.theanvil.uk 'cat >> ~/.ssh/authorized_keys'
   pbcopy < ~/.ssh/bookmarker_ci
   ```
6. **Merge to `main`.** The first deploy creates the volume and an empty
   database.
7. **Seed straight away.** While the database has no users, anyone can
   register as the first user. Follow
   [Restoring or replacing the database](#restoring-or-replacing-the-database).
8. **Add the backup cron job.**

## Gotchas

- **The image must be public.** The server has no ghcr login, so
  `docker compose pull` only works for public packages. New ghcr packages
  can start out private. If a deploy fails with `denied`, go to GitHub →
  Packages → bookmarker → Package settings → Change visibility → Public,
  then re-run the failed job.
- **`deploy` can't use `sudo`.** It has no usable password. To fix a
  root-owned path, go through Docker instead:
  `docker run --rm -v <path>:/x alpine chown "$(id -u):$(id -g)" /x`
- **Bind mounts create missing folders as root.** If `-v ~/seed:/seed`
  runs before `~/seed` exists, Docker creates it owned by root, and `scp`
  can't write into it. Fix it with the chown above.
- **A wrong volume name fails silently.** `docker run -v <name>:/data`
  creates a new empty volume if `<name>` doesn't exist. Check which one the
  app uses:
  ```sh
  docker inspect -f '{{range .Mounts}}{{.Name}}{{end}}' \
    "$(docker compose -f docker-compose.prod.yml ps -q app)"
  ```
- **"Create account" on the login page means the database has no users.**
  The app is reading an empty or unseeded database, so check the volume
  before registering.
