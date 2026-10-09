# Task 08: Roll out to every project

## Context

Agents in other repos learn about the board from one short section in that
repo's CLAUDE.md, which names the `brief-board` command and nothing else. See
"One CLI, and other repos name it without a path" in
[decisions.md](../../wiki/decisions.md). This brief adds that section to every
project with a corpus, and writes the owner's setup steps into this repo's
README.

It runs last, after briefs 04 and 06, so `brief-board guide` has something to
print.

## Files you OWN

- `README.md` in this repo, the "Owner setup" section only.
- In each project below, exactly one file: its root `CLAUDE.md` if it has one,
  otherwise `corpus/CLAUDE.md`.

The projects with a `corpus/` on 2026-10-08, and the file each one gets:

| Project | File |
|---|---|
| 3D-sandbox | corpus/CLAUDE.md |
| atrium | CLAUDE.md |
| brief-board | corpus/CLAUDE.md |
| formally-verified-small-robot-scenarios | corpus/CLAUDE.md |
| game-engine | CLAUDE.md |
| imbatranimOS | corpus/CLAUDE.md |
| just-a-bot | CLAUDE.md |
| newspapper | CLAUDE.md |
| presentation-sites | corpus/CLAUDE.md |
| public-resource-map | corpus/CLAUDE.md |
| showcase | corpus/CLAUDE.md |
| sports-app | corpus/CLAUDE.md |
| trips | corpus/CLAUDE.md |
| vps-deploy | corpus/CLAUDE.md |
| wzd_auth | corpus/CLAUDE.md (new file) |

Re-check the list when the brief runs. Add any project that has gained a
corpus since.

## Files you must NOT touch

Anything else in any other repo. Don't touch `shared/`, `server/`, `cli/` or
`web/` here either.

## What to do

1. **The section.** Add it verbatim, at the end of the file:

   ```
   ## brief-board

   Brief progress goes on brief-board. Run `brief-board guide` before you
   start or resume a brief, and follow it.
   ```

   It contains no path and no URL. wzd_auth has no CLAUDE.md at all. Create
   `corpus/CLAUDE.md` there with a one-line heading and this section. That is
   not a corpus bootstrap.
2. **Commit hygiene in each repo.**
   - First read its CLAUDE.md for branch rules, then run `git status`.
   - Several repos carry uncommitted work. If the target file already has
     changes, skip that repo and report it.
   - Run `git add` on that one file only. One commit per repo, titled "Point
     agents at brief-board for brief progress".
   - Never push.
3. **Owner setup in this repo's README.** List the commands the owner runs,
   because a global install is an owner step:
   - `npm install && npm run build`
   - `npm link`, run inside `cli/`, which puts `brief-board` on PATH (check
     with `which brief-board`)
   - `npm start`, which serves on 127.0.0.1:8806
   - optionally, create `~/.config/brief-board/env` with `BRIEF_BOARD_URL` and
     `BRIEF_BOARD_PROJECTS_DIR`
   - `brief-board sync` to fill the board

   Say that the board can be down, and that agents carry on without it.
4. **Path check.** In every file you changed outside this repo, nothing may
   match:

   ```
   grep -n -e 'brief-board/' -e '127.0.0.1:8806' <file>
   ```

## Acceptance

- Every project in the table has the section in the right file, in its own
  commit, with nothing else staged. Any repo you skipped is listed with the
  reason.
- The path check finds nothing outside this repo.
- After the owner has run the setup steps, running `brief-board guide` from
  inside sports-app prints the guide.
