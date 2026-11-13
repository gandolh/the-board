// Contrast over the built tokens: reads web/src/styles/index.css, takes each light-dark() colour
// for both themes, and checks every text, icon and edge pair the board draws against WCAG 2.
// Text and icons need 4.5:1; the edges that must be seen (the field and the focus ring) 3:1.
// Prints the minimum per theme, and exits 1 if any pair fails.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../web/src/styles/index.css", import.meta.url), "utf8");
const tokens = { light: {}, dark: {} };
for (const m of css.matchAll(/--color-([\w-]+):\s*light-dark\(\s*(#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\s*\)/gi)) {
  tokens.light[m[1]] = m[2];
  tokens.dark[m[1]] = m[3];
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, b, weightA) => a.map((c, i) => Math.round(c * weightA + b[i] * (1 - weightA)));

const STATUS = ["backlog", "todo", "in_progress", "ready_for_test", "ready_for_deploy", "done", "danger", "warn"];
// Each status colour on the wash its badge or pill sits on.
const WASH = {
  danger: "danger-wash",
  warn: "danger-wash",
  in_progress: "question-wash",
  done: "done-wash",
  ready_for_test: "test-wash",
};
const GROUNDS = ["page", "surface", "surface-sunk"];

const failures = [];
const minimum = {};
for (const theme of ["light", "dark"]) {
  const t = tokens[theme];
  const color = (name) => rgb(t[name]);
  const hover = mix(color("surface"), color("accent"), 0.92);
  const pairs = [];
  const text = (fg, bg, bgName, need = 4.5) => pairs.push({ label: `${fg} on ${bgName}`, fg: color(fg), bg, need });
  // Text on every ground: the page, the cards and bands, the wells and the facts.
  for (const ground of GROUNDS) for (const fg of ["ink", "ink-muted"]) text(fg, color(ground), ground);
  for (const fg of ["ink", "ink-muted", "warn"]) text(fg, hover, "surface-hover");
  // The status colours are text on the surface only: the status row, the head line's totals, the pills
  // and chips (each drawn on the surface), and the stale run on a card. Never on a well.
  for (const fg of STATUS) text(fg, color("surface"), "surface");
  // A status colour on its wash: the badges, the role tags and the Open / Answered tags.
  for (const [fg, wash] of Object.entries(WASH)) text(fg, color(wash), wash);
  text("banner-text", color("banner-bg"), "banner-bg");
  text("on-accent", color("accent"), "accent");
  // Edges: the select and fields, the focus ring, and a status pill's border are seen against their ground.
  for (const ground of GROUNDS) {
    text("outline", color(ground), ground, 3);
    text("focus", color(ground), ground, 3);
  }
  for (const fg of STATUS) text(fg, color("surface"), "surface (a pill's edge)", 3);

  let min = Infinity;
  let at = "";
  for (const p of pairs) {
    const r = ratio(p.fg, p.bg);
    if (r < min) [min, at] = [r, p.label];
    if (r < p.need) failures.push(`${theme}: ${p.label} is ${r.toFixed(2)}, needs ${p.need}`);
  }
  // The text-only minimum, apart from the 3:1 edges.
  const textMin = Math.min(...pairs.filter((p) => p.need === 4.5).map((p) => ratio(p.fg, p.bg)));
  minimum[theme] = { pairs: pairs.length, lowest: `${min.toFixed(2)} (${at})`, textMin: textMin.toFixed(2) };
}

console.log(JSON.stringify(minimum, null, 2));
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
