/** A link to another page of the board, in the header. */
export const NAV_LINK = "font-semibold text-accent hover:underline";

/** What a list or a board says when it has nothing to show. */
export const EMPTY = "my-3.5 py-12 text-center text-ink-muted";

/** A project or status count beside its name. */
export const COUNT = "ml-1 font-medium tabular-nums";

/** A tag chip. */
export const TAG = "mr-1 inline-block rounded-chip bg-accent/12 px-1.5 text-meta text-ink";

/** The page's padding; the board's other pages share it. */
export const MAIN = "px-6 pt-3 pb-12 narrow:px-4 narrow:pt-2 narrow:pb-10";

/** A list of label and value pairs: a `dl` with the labels muted. */
export const FACTS = "grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 [&_dd]:min-w-0 [&_dt]:text-ink-muted";

/** The small caps heading of a section of the detail panel. */
export const SECTION = "mt-5 mb-1.5 text-meta font-bold tracking-[0.02em] text-ink-muted uppercase";

/** The board's name, in the header and on the sign-in cards. */
export const BRAND = "text-title font-strong";

/** A notice in the banner's colours. */
export const NOTICE = "rounded-box bg-banner-bg px-3 py-2 text-banner-text";

/** A button, and the one the page is for. */
export const BUTTON =
  "cursor-pointer rounded-box border border-line bg-surface-sunk px-3.5 py-2 font-semibold text-ink hover:border-ink-muted disabled:cursor-default disabled:opacity-60";
export const BUTTON_PRIMARY =
  "cursor-pointer rounded-box border border-accent bg-accent px-3.5 py-2 font-semibold text-surface hover:brightness-[1.08] disabled:cursor-default disabled:opacity-60";

/** The sign-in screens: a card in the middle of the window. */
export const GATE = "grid min-h-screen place-items-center p-6";
export const GATE_CARD = "flex w-full max-w-90 flex-col gap-3 rounded-gate bg-surface p-6 shadow-card";
