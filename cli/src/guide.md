# brief-board guide

## 1. What the board is
A view of brief progress across every project in ~/projects. Each ticket mirrors
one corpus brief and is keyed <project>-<number>, like atrium-82. The corpus is
the record. Do the corpus-flow steps every time, board or no board: move the
brief to done/, write the log entry, update the wiki.

Run commands from inside the project's repo. <ticket> is a key, or a brief
number in this project. Exit codes: 0 done, 1 usage mistake, 2 the board
refused (the output says what is allowed), 3 the board is down.

## 2. Filing a brief
After you write a brief, put it on the board:
  brief-board create <number> --title "<title>" --summary "<summary>"
Write the summary in two to four sentences for the owner glancing at the board:
what the brief does and why. Add --tag <label> for labels.

## 3. Starting or resuming
If the owner named a ticket, run `brief-board show <ticket>` first and read
every comment before you do anything. Earlier sessions and the owner's answers
are there. Then run `brief-board start <ticket>`. On a ticket already In
Progress, start records the resume; add -m "<what you pick up>" if it helps.

## 4. Blocking
Ask the owner before you block. Most questions get answered in the session;
answer them there and carry on. Move to Blocked only after the owner agrees to
put the work off to another session:
  brief-board move <ticket> blocked -m "<what the owner must do or decide>"

## 5. Finishing
Pick one column:
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

## 7. When the board is down
A command that prints "the board isn't reachable" exits 3. Tell the owner once,
make no more board calls this session, and carry on with the brief. Moves made
while it is down are lost; a later sync restores what the corpus knows.

## 8. Hard rules
- Never write a path to brief-board into any repo. Repos name the command only.
- Never put a secret in a message. Name a secret by its file and key.
- Don't run `brief-board sync` unless the owner asks.
- Don't touch another project's tickets unless the owner asks.

## 9. The moves
Any move not listed is refused. A move marked "required" needs -m "<message>".
{{moves}}
