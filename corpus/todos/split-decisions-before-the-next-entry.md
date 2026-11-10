---
title: Split wiki/decisions.md before the next entry
created: 2026-11-10
---

# Split wiki/decisions.md before the next entry

Brief 21 (sprints) left `corpus/wiki/decisions.md` at the page-size cap
(about 200 body lines). Briefs 16, 18 and 19 each add a decisions entry, so the
first of them splits the page by topic first (for example the board's own
rules and the sync and deploy rules), with each half under the cap and every
link to the old page fixed. `bash corpus/lint.sh` must stay clean.
