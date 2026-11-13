/** What a list or a board says when it has nothing to show. */
export const EMPTY = "my-3.5 py-12 text-center text-ink-muted";

/** A project or status count beside its name. */
export const COUNT = "ml-1 font-normal text-ink-muted tabular-nums";

/** A tag chip. */
export const TAG = "inline-block rounded-badge bg-surface-sunk px-2 text-meta font-normal text-ink-muted";

/** The page's width and padding; the board's other pages share it. The bottom padding clears the phone's bar. */
export const MAIN = "mx-auto w-full max-w-360 px-6 pt-2 pb-10 phone:px-4 phone:pb-22";

/** A list of label and value pairs: a `dl` with the labels muted. */
export const FACTS = "grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 [&_dd]:min-w-0 [&_dt]:text-ink-muted";

/** The heading of a section of the detail panel: sentence case, on a line of its own. */
export const SECTION = "mb-2 text-heading font-bold";

/** The board's name, in the header and on the sign-in cards. */
export const BRAND = "text-display font-strong tracking-[-0.01em]";

/** A notice in the banner's colours. */
export const NOTICE = "rounded-card bg-banner-bg px-3 py-2 text-banner-text";

/** A button, and the one the page is for. */
export const BUTTON =
  "inline-flex min-h-8 cursor-pointer items-center justify-center gap-1 rounded-card border border-outline bg-surface px-3 text-small font-medium text-ink hover:bg-surface-sunk active:bg-line disabled:cursor-default disabled:opacity-60 phone:min-h-10";
export const BUTTON_PRIMARY =
  "inline-flex min-h-8 cursor-pointer items-center justify-center gap-1 rounded-card border border-accent bg-accent px-3 text-small font-medium text-on-accent hover:brightness-[1.15] active:brightness-125 disabled:cursor-default disabled:opacity-60 phone:min-h-10";

/** A text field, and the tag select: an edge that is seen, 36 px high (44 on a phone, 16 px type so a phone doesn't zoom). */
export const FIELD =
  "h-9 rounded-card border border-outline bg-surface px-3 text-ink aria-invalid:border-danger phone:h-11 phone:text-[16px]";

/** The sign-in screens: a card in the middle of the window. */
export const GATE = "grid min-h-screen place-items-center p-6";
export const GATE_CARD =
  "flex w-full max-w-90 flex-col gap-3 rounded-band border border-line bg-surface p-6 shadow-card";
