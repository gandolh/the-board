/**
 * The three ways a command fails, each with its exit code (brief 04):
 * 1 for a usage mistake, 2 when the board refuses (or the local move check
 * does), 3 when the board cannot be reached. 0 is success.
 */
export class UsageError extends Error {
  readonly exitCode = 1;
}

export class Rejected extends Error {
  readonly exitCode = 2;
}

export class Unreachable extends Error {
  readonly exitCode = 3;
  constructor(readonly url: string) {
    // The one line an agent sees. It must not suggest writing a path to
    // brief-board anywhere: other repos name it by its command only.
    super(`brief-board: the board isn't reachable at ${url}. Tell the owner and carry on without it.`);
  }
}
