import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, told the app's own @theme names. Without the `text` list it reads
 * `text-body` as a colour, so `cn("text-ink-muted", "text-body")` drops one of them. Without
 * the others it can't tell that two radii, shadows, weights or z values clash. The app's sizes
 * carry no line height, so a later `text-*` must not drop an earlier `leading-*`.
 * Keep the lists in step with `@theme`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["micro", "meta", "small", "body", "heading", "title", "display"],
      radius: ["badge", "card", "band", "pill", "chip", "box", "gate"],
      shadow: ["card", "panel", "sheet"],
      "font-weight": ["strong"],
    },
    classGroups: {
      z: [{ z: ["cell", "columns", "top", "panel"] }],
    },
  },
  override: {
    // Tailwind says a font size also resets the line height; here a size carries none.
    conflictingClassGroups: { "font-size": [] },
  },
});

/** Joins class names, and lets a later class win over an earlier one it conflicts with. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
