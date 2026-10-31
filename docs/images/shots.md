# README images

How each image was made, so the next refresh is a re-run. Re-take an image when the board's look changes.

| File | Shows | How to reach that state | Viewport | Data | Taken |
|---|---|---|---|---|---|
| board.webp | The board with three lanes and tickets in every column | see "Demo data" below, then open the board | 1440×720 @2x | made-up projects | 2026-10-31 |
| ticket-detail.webp | Detail panel of a blocked ticket | same, then click "Offline mode" | 1440×720 @2x | made-up projects | 2026-10-31 |

## Demo data

The real board lists the owner's actual briefs, so the screenshots use a throwaway board instead:

1. Start a second server on a temporary database: `BRIEF_BOARD_DB=/tmp/demo.sqlite PORT=8807 npm start`.
2. Make a temporary projects folder with three made-up projects (`recipe-box`, `garden-planner`, `photo-archive`), each with a few `corpus/briefs/todo/NN-slug.md` files holding a `# Task NN: Title` line and a `## Context` paragraph.
3. Run `BRIEF_BOARD_URL=http://127.0.0.1:8807 BRIEF_BOARD_PROJECTS_DIR=<that folder> brief-board sync`, then `start`/`move` a few tickets so every column has one, including one `blocked` with a reason.

Capture: on 2026-10-31, Playwright with Chrome at 1440×720 @2x (earlier, `agent-browser set viewport 1440 720 2`), screenshot, then `ffmpeg -i shot.png -c:v libwebp -quality 82 shot.webp`. That run's statuses: one ticket each in Blocked, Ready for test, Ready for deploy and Done, two in In Progress, the rest in To Do.
