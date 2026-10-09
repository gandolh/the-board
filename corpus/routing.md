# Routing profile: brief-board

Read by the `orchestrate` skill at the start of a work request.

## Skill choices

| Purpose | Skill |
|---|---|
| Implement | `plan-split-dispatch` |
| Capture | `corpus-flow` |
| Query knowledge | `corpus-flow` §5 |
| Design / UI | `impeccable`, with familiar Jira-style navigation |
| Review | inline (no project reviewer yet) |
| Pre-PR | none (single-user repo) |

## Intent table

| The user says | Route to |
|---|---|
| "add a todo", "note this for later" | `corpus-flow` §1 |
| "let's build brief NN", "implement this" | `corpus-flow` §3, then `plan-split-dispatch` |
| "what does the wiki say about X" | `corpus-flow` §5 |
| "grill me", "stress-test this design" | `grill-me` |
| "make the board look better" | `impeccable` |

## READ / SKIP / SKILLS

| Always READ | Always SKIP | Load SKILL |
|---|---|---|
| [index.md](index.md) | `node_modules/`, `dist/` | `corpus-flow` for any capture or completion |
| [wiki/status.md](wiki/status.md) | lockfiles, the SQLite database file | `plan-split-dispatch` for 3 or more independent chunks |
| [wiki/glossary.md](wiki/glossary.md) | `briefs/` wholesale | `impeccable` for visual or UX work |
| [CLAUDE.md](CLAUDE.md) hard rules | | `grill-me` before a new subsystem |

## Knowledge routing

| Question shape | Layer | Why |
|---|---|---|
| "Why is it built this way?" | `wiki/` | The corpus is the why. |
| "Which moves need a message?" | [wiki/decisions.md](wiki/decisions.md) | Owns the transition rules. |
| "Where does feature Y live?" | `grep` | Structural. Never ask the wiki. |
| "Did I get every usage?" | `grep -rnw` | Completeness needs exhaustive search. |
| "Does the API enforce the rules?" | the tests | Behavior is verified, not remembered. |

**Code graph:** not installed. The app is small and `grep` is cheaper than an
index.
