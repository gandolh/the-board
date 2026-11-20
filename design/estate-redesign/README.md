# The redesign: "The queue and the lanes"

This folder is the design record of The board's redesign. The estate redesign board, where it was drawn and approved, is a private canvas; this is a copy of the app's page on it plus the build behind that page. The owner approved it on 2026-11-13, and [brief 20](../../corpus/briefs/done/20-a-redesign-with-hallmark-on-the-estate-board.md) built it. The code is now the source of truth: where the app and these files differ, the app wins, and later work may have moved a screen on. Read this folder to see what was decided and why before reshaping a screen.

## The owner's decisions

The owner approved the whole board on 2026-11-13, with every question standing at what the board proposed unless they reopened it. The questions this app's page asked:

- **Ask:** 1. Reopened record: board-ui.md says lanes scroll sideways below 1100 px. Proposed: they never do, and each lane stacks its statuses on a phone. Accept? 2. New copy on a phone: a lane folds its empty statuses into one line, "Backlog, Blocked: empty" (the word "empty" is new). Keep it? 3. Approve The queue and the lanes as the-board's direction?
- **Open question:** At 390 the panel is a bottom sheet over a dimmed header, not today's full-width panel. Today's panel is non-modal so another card can be clicked (board-ui.md, 2026-10-23); on a phone nothing else is reachable while it is open, so the scrim is only a visual dim. Keep the sheet? It has no drag handle, since nothing here is built to drag.
- **Reopened:** Recorded (brief-board wiki/board-ui.md, 2026-11-09 and 2026-11-10): "Below 1100 px each lane scrolls sideways on its own and shows its own column names." Proposed: nothing scrolls sideways. At 1280 one status row aligns with every lane's wells, and below 1100 px each lane stacks its non-empty statuses as headings with their cards.

Where the files below disagree, the later layer wins: the owner's decisions, then the controller's rulings, then the judges' rulings, then the directions file.

## What is here

| Path | What it holds |
|---|---|
| `directions/the-board.md` | The director's brief: both directions (the winner is the one built), the shared fixture and the screens to draw. |
| `judge/the-board/RESULT.md` | The blind judging against today and the rulings that came with the win. |
| `critiques/the-board-controller.md`, `critiques/the-board.md` | The design critic's review against today, and the controller's rulings over it. |
| `manifests/the-board.tokens.css`, `manifests/the-board.tokens-map.md` | The token hand-off in the app's own names, and the renamed, new and unused tokens. |
| `manifests/the-board.board-notes.md` | What the board said beside the screens: the asks, decisions, reopened rules, open questions, the contrast table and the runner-up. |
| `canvas/the-board-*.dc.html` | The board's own artboards for the direction sheet and the proposed screens: HTML and CSS in the board's component format (a `<x-dc>` page with `{{…}}` values filled by the script at its foot). They need the board's runtime to render, so read them as source; no rendered picture of them exists outside the board. |
| `shots/the-board/` | Today's screens as the board showed them before the redesign. |

People's names and data in the pictures come from seeded demo accounts or are invented.

## Not here

The sketches and the judges' images, the runner-up's build (its notes are in the board's notes), the build's scripts, and the screenshots taken while it was built. They stay in the estate build folder.
