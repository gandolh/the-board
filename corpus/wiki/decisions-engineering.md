---
summary: Locked engineering calls for brief-board, each with date, rejected alternative and reason. One CLI on PATH that other repos name without a path; a down board never stops work (revisited 2026-11-02: the container now runs always, agents still carry on without it); Base UI for the UI's widgets, styled with Tailwind (revisited 2026-11-11); the CLI authenticates with one shared token; the board on the VPS behind sign-in (2026-11-02); and the house style, vendored from the skills library, Prettier at width 120, npm run check as the gate (2026-11-11). Split out of decisions.md on 2026-11-11. Read before proposing to change any of these.
updated: 2026-11-11
---

# Engineering decisions

Split out of [decisions.md](decisions.md), which holds the board's model. The
same tests apply: hard to reverse, surprising without context, a real trade-off.

## One CLI, and other repos name it without a path
_2026-10-08_. The only client is a CLI that lives in this repo. Every project
uses it, and a project's CLAUDE.md refers to brief-board by name only. No
corpus outside this repo holds a path to it. Rejected: a script copied into
each repo, which means 14 copies to keep in step. Also rejected: an MCP server,
which has to be registered in every repo. A change to how agents talk to the
board is one edit here. The CLI goes on PATH through `npm link`, and the board
address lives in a user-level config file that a repo's `.env` can override
with a URL. No file in another repo holds a path to brief-board. Each
project's CLAUDE.md gets a short section that names the `brief-board` command,
and `brief-board guide` prints the rules, so the rules live only here.

## A down board never stops work
_2026-10-08_. The board is not a hard dependency the way Ward is for the apps.
Nothing keeps the server running; the owner starts it. When the CLI can't reach
it, the agent tells the owner once and carries on with the brief without the
board. Moves made while it is down are lost, and sync recovers what the corpus
knows. Rejected: an always-on container with a restart policy, and agents
waiting or failing until the board comes back.

**Revisited 2026-11-02**, with the move to the VPS: the always-on container
with a restart policy, rejected above, is now what runs (`brief-board-api`,
`restart: unless-stopped`, deployed by vps-deploy). What stays: the board is
still not a hard dependency. The CLI exits 3 when it can't reach the board or
the board refuses its token, agents tell the owner once and carry on, moves
made while it is down are lost, and sync recovers them. Rejected: keeping the
hand-started server on the owner's machine, which the VPS move exists to
replace.

## Base UI for the UI's widgets, styled with Tailwind
_2026-10-23_. The detail panel is a Base UI `Dialog` and the lanes are Base UI
`Collapsible`s. They keep `styles.css` and key off the attributes Base UI sets
(`data-panel-open`). The owner asked for this on 2026-10-23, after a survey
showed most of their other apps already on Base UI. Rejected: keeping the
hand-built panel, which never gave focus back to the card; and a styled kit
such as shadcn, which would bring Tailwind into a board that has none. Native
controls that are already accessible, such as the tag filter's `<select>`,
stay native.

_2026-11-09, built 2026-11-11_. The estate's Base UI conventions apply: Base UI
is imported only under `web/src/components/ui/` (`Dialog`, `Collapsible`,
`RadioGroup` wrappers), the panel has a `Dialog.Title`, and the needs strip,
a filter, is a `RadioGroup` (arrow keys, one Tab stop) with "Show all" beside
it, not a row of toggle buttons.

_Revisited 2026-11-11_ (the owner's call of 2026-11-09: Base UI is styled with
Tailwind, and whole apps move to it). The widgets, and now the whole web app,
are styled with Tailwind 4 from one stylesheet, `web/src/styles/index.css`;
`styles.css` is gone. This reverses "keep `styles.css`" and the rejection of
Tailwind "in a board that has none". shadcn stays rejected, for a reason of its
own: Base UI is used directly, without a styled kit on top. The native-controls
half stands.

## The CLI authenticates with one shared token
_2026-11-02_. Before the board leaves the owner's machine, the API gets one
shared secret: the server reads `BRIEF_BOARD_TOKEN`, and the CLI sends it as
`Authorization: Bearer <token>`, read from the environment or
`~/.config/brief-board/env` and never from a repo's `.env`. A refused token
exits 3, like a down board. `GET /api/health` stays open for the deploy's
check. Every agent runs as the owner on the owner's machine, and `--author`
already names who wrote a comment. Rejected: per-agent tokens, since every
agent is the owner's and there is nothing to tell apart; and the CLI signing
in with a local account's password, which means a password in a file and a
session to keep alive. The browser's sign-in (Ward, or a local account) is a
separate guard in front of the same API.

## On the VPS at /brief-board, behind sign-in like the other apps
_2026-11-02_, the owner's call. The board moves to the shared VPS at a
sub-path of the main domain (`/brief-board/`, the API at `/brief-board-api`),
and the browser needs a sign-in, like almanac and the estate's other apps:
"Sign in with Ward", plus a local account in the board's own SQLite so the
board still opens while Ward is down. A browser session only reads; every
write is the CLI's, with the shared token, and who gets in through Ward is
decided by grants in Ward's console. Rejected: open to anyone, which makes
every brief title and comment public; Ward only, which locks the board
whenever Ward is down; and a host of its own, which needs a DNS record and
keeps cookies off the shared origin, a gain the read-only sessions make
small. How it is built: [sign-in.md](sign-in.md).

## The house style, formatted and checked
_2026-11-11_, the owner's call of 2026-11-09 and the skills library's house-style
package. The repo holds a vendored copy of that package (`vendor/house-style/`,
a version header, refreshed by `npm run house-style:sync`), and its configs
decide the format and the lint rules: Prettier at width 120 with double quotes,
semicolons and trailing commas; ESLint with six typed rules through
`projectService`; `verbatimModuleSyntax` and `erasableSyntaxOnly`; knip and
dependency-cruiser; and two convention checkers. `npm run check` is the gate
(typecheck, lint, format check, conventions, tests) and `npm run check:fast`
its quick subset, which the plugin's Stop hook runs. The reformat was one
commit, listed in `.git-blame-ignore-revs`.

Width 120 changed 1,208 lines in 50 files (about 12% of the code, from the 74
TypeScript files plus the YAML and JSON that Prettier reads). The least churn
here was 150, which touches 176 lines, but the estate has one width and the
owner picked it. Markdown stays out of Prettier: the CLI prints `guide.md` to
every agent, and done briefs are immutable. The old stylesheet stayed out until
the Tailwind migration deleted it (2026-11-11). Rejected: a git or tarball dependency on the
package (the Docker `deps` stage has no `git`, and the Dockerfile stays as it
is); extending the vendored `tsconfig.base.json` (the image copies only the
repo's own base, so the house flags are written into it); one `.claude/`
settings file in the repo (the hooks live in the plugin).
