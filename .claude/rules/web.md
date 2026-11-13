---
paths:
  - "web/src/**"
---

# The board (`web/src`)

- Read the `base-ui` skill before you add or change a component, and
  [corpus/wiki/board-ui.md](../../corpus/wiki/board-ui.md) for UI work.
- The board is read-only ([corpus/wiki/decisions.md](../../corpus/wiki/decisions.md),
  "The UI is read-only"): no control that writes to the API.
- Base UI is imported only under `web/src/components/ui/` (`Dialog`,
  `Collapsible`, `RadioGroup`); everything else uses those wrappers. A
  trigger around one of our components uses `render`, never a wrapping `span` or
  `div`. A strip that filters a list is a `RadioGroup`.
- Native controls that are already accessible, such as the tag filter's
  `<select>`, stay native
  ([corpus/wiki/decisions-engineering.md](../../corpus/wiki/decisions-engineering.md),
  "Base UI for the UI's widgets, styled with Tailwind").
- The one stylesheet is `web/src/styles/index.css`. Tokens come only from its `@theme`
  (`bg-surface`, `text-ink`); no arbitrary colours (`bg-[#fff]`), no `text-[13px]`: type sizes
  come from the named scale (`text-body`, `text-meta`). A new token's name also goes in
  `web/src/lib/cn.ts`'s lists.
- A class chosen by data is a whole string in a `Record` (see `STATUS_CHIP`), never built by
  concatenation: Tailwind reads source text, so a class built from `status` would produce no CSS.
- `narrow:` (`max-width: 1099px`), `phone:` (`719px`) and `mid:` (`1239px`) are the breakpoints, each
  the pixel before the edge the design names; the header's one row is `min-[1240px]:`. Don't use
  `max-sm:` or `max-lg:`: they are one pixel off.
- Light, Dark and System (light on a first visit) set `data-theme` on `<html>`, from
  `lib/theme.ts` and the boot script in `web/index.html`. Colour tokens are `light-dark()` pairs, so
  both themes change when a token changes; no `dark:` class is needed. `prefers-color-scheme`
  appears only in the stylesheet's `dark` variant.
- `hover:` applies only where the device hovers, so nothing is revealed by hover alone.
- Words in the UI follow [corpus/wiki/glossary.md](../../corpus/wiki/glossary.md):
  "ticket" in copy, "card" only for its drawing, "lane".
- Components use named exports. Default exports are for config files only.
- Tests render to static markup (`renderToStaticMarkup`), so assert on roles, text and
  `data-` attributes, never on class names.
- `web/vendor/` is Ward's generated client. Never edit it.
- `npm run check:conventions` runs `check-base-ui` over this folder, strict. ESLint's
  `better-tailwindcss` rules (unknown classes, class order) are errors; `npx eslint --fix web/src`
  sorts the classes.
