# brief-board guide

## 1. What the board is
A view of brief progress across every project in ~/projects. Each ticket mirrors
one corpus brief and is keyed <project>-<number>, like atrium-82. The corpus is
the record. Do the corpus-flow steps every time, board or no board: move the
brief to done/, write the log entry, update the wiki.
Open todos have tickets in Backlog, keyed <project>:<slug>, owned by sync:
never move or comment on one. Promoting the todo to a brief takes it off.

Run commands from inside the project's repo. A corpus whose folder name isn't
its board name puts the name alone in corpus/board-name. <ticket> is a key, or
a brief number in this project. Exit codes: 0 done, 1 usage mistake, 2 the
board refused (the output says what is allowed), 3 the board is down or
refused the token (a 401).

## 2. Filing a brief
After you write a brief, put it on the board:
  brief-board create <number> --title "<title>" --summary "<summary>"
Write the summary in two to four sentences for the owner glancing at the board:
what the brief does and why. Add --tag <label> for labels.

## 3. Starting or resuming
If the owner named a ticket, run `brief-board show <ticket>` first and read
every comment before you do anything. Earlier sessions and the owner's answers
are there. Then run `brief-board start <ticket>`. Start opens a run, the
board's record that you work the ticket; each start, comment and move keeps it
fresh, and after 4 hours with none it reads as stale. On a ticket already In
Progress, start records the resume and the run passes to you; add
-m "<what you pick up>" if it helps.
Start a long-lived process, such as a dev server, as your runtime's background
task, so /tasks shows it with its command line, never with & or nohup. Stop
what you started before your end move.

## 4. Blocking
Ask the owner before you block. Most questions get answered in the session;
answer them there and carry on. Move to Blocked only after the owner agrees to
put the work off to another session:
  brief-board move <ticket> blocked -m "<what the owner must do or decide>"

## 5. Finishing
Make the end move before you move the brief to done/ and before the commit
that moves it: a sync in between closes the ticket under you. Its message ends
with these four lines; the full report goes in the brief's outcome note.
  Commits: <hashes>
  Checks run: <what passed>
  Checks skipped: <what, and why>
  Owner steps: <the exact commands, or none>
Ask each question for the owner with --question "<question>" on that move,
one flag per question, never as prose in the message. Pick one column:
- The owner needs to try it: move to ready_for_test with test notes. Say what
  to try and where: the URL, the command, which account. Never a password.
- It is finished but needs a deploy: move to ready_for_deploy with deploy
  steps, the exact commands the owner runs. Deploys are an owner step. A
  project that ships to the VPS deploys with `node cli.ts <project> deploy`
  from ~/projects/vps-deploy. A project that never deploys never uses this
  column.
- Otherwise move to done, with an optional conclusion: what shipped, and
  anything left for later.

## 6. When the owner reports back
- "Tested, works": move ready_for_test to done, or to ready_for_deploy if it
  still needs a deploy.
- "Failed: X": move back to in_progress with -m saying what failed, then fix it.
- "Deployed": move ready_for_deploy to done.
- "The deploy broke X": move back to in_progress with -m saying what broke.
- On a Blocked ticket, "I did X": start it with -m saying what the owner did,
  or move it to done with a confirmation if nothing is left to do.
- An answer to a question: brief-board answer <ticket> <n> -m "<the answer>".
  `brief-board questions` lists the open ones.

## 7. Running other agents
For a session that starts agents and waits on them:
- Give each agent a name to pass as --author on every board command.
- Before a sync the owner asks for, run `brief-board runs` and tell the owner
  which runs are open.
- When your runtime reports an agent's token use, add it to the agent's
  ticket: brief-board comment <ticket> -m "Tokens: <count>". Else leave it out.
- To stop an agent, first ask it to wind down if your runtime lets you message
  it: stop what it started, release its run, hand back. Otherwise stop it and
  release its run yourself, naming what it left running (a port, a container):
  brief-board release <ticket> -m "<why, and what it left running>"
  The ticket stays In Progress for the owner to decide.

## 8. When the board is down
A command printing "the board isn't reachable" or "the board refused the token"
exits 3. Tell the owner once, make no more board calls this session, and carry
on. Moves made while it is down are lost; sync restores what the corpus knows.

## 9. Hard rules
- Never write a path to brief-board into any repo. Repos name the command only.
- Never put a secret in a message. Name a secret by its file and key.
- Don't run `brief-board sync` unless the owner asks.
- Don't touch another project's tickets unless the owner asks.

## 10. The moves
Any move not listed is refused. A move marked "required" needs -m "<message>".
{{moves}}
