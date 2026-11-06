import { describe, expect, it } from "vitest";
import type { Run } from "./api.js";
import { formatDuration, runDuration, runDurationText } from "./duration.js";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe("formatDuration", () => {
  it("writes minutes up to an hour, hours and minutes up to a day, then days and hours", () => {
    expect(formatDuration(0)).toBe("<1m");
    expect(formatDuration(59_999)).toBe("<1m");
    expect(formatDuration(45 * MINUTE)).toBe("45m");
    expect(formatDuration(59 * MINUTE + 59_000)).toBe("59m");
    expect(formatDuration(HOUR)).toBe("1h");
    expect(formatDuration(HOUR + 20 * MINUTE)).toBe("1h 20m");
    expect(formatDuration(24 * HOUR - MINUTE)).toBe("23h 59m");
    expect(formatDuration(24 * HOUR)).toBe("1d");
    expect(formatDuration(48 * HOUR)).toBe("2d");
    expect(formatDuration(51 * HOUR + 59 * MINUTE)).toBe("2d 3h");
    expect(formatDuration(-5 * MINUTE)).toBe("<1m");
  });
});

describe("a run's duration", () => {
  const now = new Date("2026-11-06T12:00:00.000Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const run = (fields: Partial<Run>): Run => ({
    id: 1,
    author: "ana",
    message: null,
    startedAt: ago(5 * HOUR),
    lastHeardAt: ago(HOUR),
    stale: false,
    endedAt: null,
    ended: null,
    endedTo: null,
    ...fields,
  });

  it("is now minus start for an open run", () => {
    expect(runDuration(run({ startedAt: ago(40 * MINUTE) }), now)).toEqual({ ms: 40 * MINUTE, atLeast: false });
    expect(runDurationText(run({ startedAt: ago(40 * MINUTE) }), now)).toBe("running 40m");
  });

  it("is end minus start for a run that moved or was released", () => {
    const moved = run({ endedAt: ago(3 * HOUR + 40 * MINUTE), ended: "moved", endedTo: "done" });
    expect(runDurationText(moved, now)).toBe("took 1h 20m");
    expect(runDurationText(run({ endedAt: ago(4 * HOUR), ended: "released" }), now)).toBe("took 1h");
  });

  it("is at least start to last heard for a stale run, open or ended by sync", () => {
    const heard = ago(5 * HOUR - (3 * HOUR + 10 * MINUTE));
    expect(runDuration(run({ stale: true, lastHeardAt: heard }), now)).toEqual({ ms: 3 * HOUR + 10 * MINUTE, atLeast: true });
    expect(runDurationText(run({ stale: true, lastHeardAt: heard }), now)).toBe("ran ≥ 3h 10m");
    expect(runDurationText(run({ lastHeardAt: heard, endedAt: ago(0), ended: "stale" }), now)).toBe("took ≥ 3h 10m");
  });
});
