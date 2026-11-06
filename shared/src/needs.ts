import { NEED_KINDS, type Need, type NeedKind } from "./api.js";

/** How each kind of need is counted, the same on the board's strip and in `brief-board needs`. */
const COUNT_WORDS: Record<NeedKind, [one: string, many: string]> = {
  question: ["question", "questions"],
  blocked: ["blocked", "blocked"],
  stale_run: ["stale run", "stale runs"],
  ready_for_test: ["to test", "to test"],
  ready_for_deploy: ["to deploy", "to deploy"],
};

/** "3 questions", "1 blocked", "7 to deploy". */
export function needCountText(kind: NeedKind, count: number): string {
  return `${count} ${COUNT_WORDS[kind][count === 1 ? 0 : 1]}`;
}

/** The kinds with anything in them, in the owner's order, each with its needs. */
export function groupNeeds(needs: readonly Need[]): { kind: NeedKind; needs: Need[] }[] {
  return NEED_KINDS.map((kind) => ({ kind, needs: needs.filter((need) => need.kind === kind) })).filter((group) => group.needs.length > 0);
}
