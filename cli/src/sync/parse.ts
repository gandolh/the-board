/**
 * A brief's title and summary, read from its markdown (brief 05). Pure, so the
 * odd shapes found across the corpora can be tested one by one.
 */

/** Where the summary is cut, at a sentence end where possible. */
export const SUMMARY_MAX = 600;

/**
 * The first H1, without a leading `Task 72 —`, `Brief 99 —`, `Task 01:`, a
 * bare `12 -`, or newspapper's `Wave 0 —`. With no H1, the slug in words.
 */
export function briefTitle(markdown: string, slug: string): string {
  const h1 = /^#\s+(.+?)\s*#*\s*$/m.exec(markdown)?.[1];
  if (!h1) return slugWords(slug);
  const stripped = h1.replace(/^(?:(?:task|brief|wave)\s+)?\d+\s*[—–:-]\s*/i, "").trim();
  return stripped || h1.trim();
}

/** `night-mode-for-the-map` → "Night mode for the map". */
export function slugWords(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : slug;
}

/** Markdown links and images become their text: relative links mean nothing on the board. */
export function unlink(text: string): string {
  return text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
}

/** The first paragraph of the lines from `start`: skip blank lines, stop at the next blank line or heading. */
function paragraphAt(lines: string[], start: number, skip: (line: string) => boolean = () => false): string | null {
  let i = start;
  while (i < lines.length && (lines[i]!.trim() === "" || skip(lines[i]!))) i++;
  const paragraph: string[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === "" || /^#{1,6}\s/.test(line)) break;
    paragraph.push(line.trim());
  }
  return paragraph.length ? paragraph.join(" ") : null;
}

/** Cut to about `max` characters, at the last sentence end inside the limit if there is one. */
export function cut(text: string, max = SUMMARY_MAX): string {
  if (text.length <= max) return text;
  const window = text.slice(0, max);
  const sentenceEnd = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (sentenceEnd > max / 3) return window.slice(0, sentenceEnd + 1);
  const space = window.lastIndexOf(" ");
  return `${window.slice(0, space > 0 ? space : max).trimEnd()}…`;
}

/**
 * The first paragraph under `## Context`, else under `## Problem`
 * (imbatranimOS), else the first paragraph after the H1 that is not a
 * `Status:` line. Links become text; the result is cut to about 600 characters.
 */
export function briefSummary(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const sectionStart = (name: RegExp) => {
    const index = lines.findIndex((line) => /^##\s+/.test(line) && name.test(line.replace(/^##\s+/, "")));
    return index === -1 ? null : index + 1;
  };
  const start = sectionStart(/^(project\s+)?context\b/i) ?? sectionStart(/^problem\b/i);
  let paragraph = start === null ? null : paragraphAt(lines, start);
  if (paragraph === null) {
    const h1 = lines.findIndex((line) => /^#\s+/.test(line));
    paragraph = paragraphAt(lines, h1 + 1, (line) => /^\s*\**status\**\s*:/i.test(line));
  }
  return paragraph ? cut(unlink(paragraph)) : "";
}
