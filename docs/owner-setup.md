# Owner setup

Everything you do by hand to put brief-board on the VPS. Nothing in the repo
deploys or writes a secret for you. Commands run on your machine unless a step
says otherwise. The deploy builds the API image on the VPS; Caddy serves the
board and forwards `/brief-board-api/` to the container on `127.0.0.1:8806`.
Running it on your own machine is under [Local development](#local-development)
and in [getting-started.md](getting-started.md).

`<production origin>` below means `https://` plus the main domain's host, with
no path.

## 1. Register the board in production Ward

The adoption guide is `wzd_auth/shared-library/README.md`. Almanac and
Shelfmark were registered the same way.

1. Open the console on Ward's own host (`/console`) and sign in as the
   break-glass superuser.
2. Create an app with slug `brief-board` and name `brief-board`, with public
   registration closed.
3. Make the client's key pair, from Ward's checkout:

   ```
   cd path/to/wzd_auth && npm run oidc-client-key --workspace=api -- brief-board
   ```

   It prints a private `WARD_OIDC_CLIENT_KEY=...` line and a public JWK. Keep
   the private line for step 2. Never paste it into Ward.
4. On the app's page, under "Sign in with Ward", register a client with the
   public JWK and these addresses:
   - redirect URI: `<production origin>/brief-board-api/auth/ward/callback`
   - sign-out return URI: `<production origin>/brief-board/`

## 2. Write the deploy secrets

Make the CLI's token:

```
openssl rand -base64 32
```

Create `vps-deploy/secrets/brief-board.env` with two lines, then `chmod 600`
it:

```
WARD_OIDC_CLIENT_KEY=<the private key from step 1>
BRIEF_BOARD_TOKEN=<the token you just made>
```

Keep the token for step 7 too. The deploy adds everything else (the origin,
the other Ward settings, the trusted proxy range). Without either line the
`server` step stops and names it. The dry run in step 4 shows that before you
deploy.

## 3. Check the container locally

Docker Desktop's WSL integration must be on. From the repo root, with a
scratch data directory so the container does not write into your dev database:

```
touch infrastructure/.env
BRIEF_BOARD_DATA_DIR="$(mktemp -d)" docker compose -f infrastructure/docker-compose.yml up --build -d
curl -s http://127.0.0.1:8806/api/health
```

Expect `{"ok":true}`. Stop it with:

```
docker compose -f infrastructure/docker-compose.yml down
```

`infrastructure/.env` is git-ignored, and the scratch directory sits under
`/tmp`. Delete both afterwards if you like. Stop a local `npm start` first: it
uses the same port.

## 4. Deploy

Dry run first. It prints every action and runs none. If step 2 is not done,
it stops at the missing secret:

```
cd path/to/vps-deploy
node cli.ts brief-board all --dry-run
```

Then the real one. It asks for the server sudo password once, builds the
board, ships it, and builds and starts the API container:

```
node cli.ts brief-board all
```

Later updates:

```
node cli.ts brief-board deploy   # the board (web/dist)
node cli.ts brief-board server   # the API container
```

Check that the container is healthy and the board is served:

```
curl -s <production origin>/brief-board-api/api/health
curl -sI <production origin>/brief-board/
```

The first prints `{"ok":true}`; the second returns `200`.

## 5. Create your account

There is no register page. Run the seed inside the container on the VPS. It
asks for the username and password and shows neither on screen, so nothing is
stored or lands in shell history. The password needs at least 8 characters:

```
ssh hetzner-svc
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
cd /srv/brief-board-api
docker compose -f infrastructure/docker-compose.yml exec -it brief-board-api node server/dist/seed.js
```

If you would rather pass them, add `-e SEED_USERNAME=<name> -e SEED_PASSWORD=<password>`
after `exec`, and keep the command out of any file. An existing user is left as
it is, password included.

After your first sign-in, check that the login lockout sees each visitor's own
address:

```
docker compose -f infrastructure/docker-compose.yml logs brief-board-api | grep -i "X-Forwarded-For ignored"
```

No output is right. If the line shows up, every visitor shares one lockout
counter. The line names the address Caddy came from; add that range to
`TRUSTED_PROXIES` in vps-deploy's `stacks/ward.ts`, which every app on the box
shares, and deploy again.

## 6. Let your Ward account in

In Ward's console, open the `brief-board` app and grant a role on it to your
own Ward account. Without a grant Ward refuses the sign-in. Every signed-in
user sees the whole board, so grant it to no one else unless they should.

Link your accounts in this order, or you end up with two users:

1. Sign in at `<production origin>/brief-board/` with the local account from
   step 5.
2. Open the account page (your name, top right) and press "Link Ward".

From then on "Sign in with Ward" on the login page signs you in as that user.
The browser only reads the board; every move still comes from an agent's
CLI.

## 7. Point the CLI at the VPS

In `~/.config/brief-board/env` on your machine:

```
BRIEF_BOARD_URL=<production origin>/brief-board-api
BRIEF_BOARD_TOKEN=<the token from step 2>
```

Then `chmod 600 ~/.config/brief-board/env`. Check it, then fill the board:

```
brief-board list
brief-board sync
```

`list` answers "No tickets" on an empty board. "the board refused the token"
means the two token values differ. Before that first sync, settle how sync
treats the restarted brief numbers (`corpus/wiki/sync.md`, "Open").

## Local development

1. `cp .env.example .env`, then fill `BRIEF_BOARD_TOKEN` (`openssl rand -base64 32`)
   and, for `npm start`, `PUBLIC_ORIGIN=http://127.0.0.1:8806`.
2. Make your local account: `npm run seed -w @brief-board/server`.
3. For "Sign in with Ward" against the local Ward: once Ward's local seed lists
   brief-board (`wzd_auth`, `infrastructure/local/seed.mjs`), run
   `node seed.mjs` there. It writes the five `WARD_OIDC_*` values into this
   repo's `.env`.
4. `npm run dev`: the API on `127.0.0.1:8806` and the board at
   <http://localhost:5178/brief-board/>.

The CLI reads the same token from `~/.config/brief-board/env`, with
`BRIEF_BOARD_URL` left at its default.
