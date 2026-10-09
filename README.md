# brief-board

brief-board is one Jira-style board for every corpus brief across
`~/projects`: a lane per project, six columns, and a ticket for each brief that
shows where the work stands. Agents read and move tickets with the
`brief-board` command; the owner watches the board in a browser and does the
two moves that are theirs (testing and deploying). The corpus in each project
stays the source of truth: the board adds who is on what and what is waiting
for the owner, and loses nothing if it is down. The design is in
[corpus/wiki/](corpus/wiki/).

## Owner setup

These are the owner's steps: `npm link` is a global install, so no agent runs
it.

1. Build it, from this repo:

   ```
   npm install && npm run build
   ```

2. Put `brief-board` on your PATH:

   ```
   cd cli && npm link
   which brief-board        # should print a path; brief-board --version prints the version
   ```

   Rebuild (`npm run build`) after pulling changes; the linked command runs
   `cli/dist/`.

3. Start the board when you want it, from this repo:

   ```
   npm start
   ```

   It serves the API and the board on <http://127.0.0.1:8806>, and keeps its
   data in `data/brief-board.sqlite`. Nothing restarts it.

4. Optionally, create `~/.config/brief-board/env` to change the defaults:

   ```
   BRIEF_BOARD_URL=http://127.0.0.1:8806
   BRIEF_BOARD_PROJECTS_DIR=~/projects
   ```

5. Fill the board from every project's corpus:

   ```
   brief-board sync
   ```

   Run it again whenever the board looks stale; nothing runs it on a schedule.

The board can be down. Agents check for it, tell you once, and carry on with
the brief without it; `brief-board sync` later puts back what the corpus knows.
Every project's CLAUDE.md tells its agents to run `brief-board guide`, which
prints the rules.
