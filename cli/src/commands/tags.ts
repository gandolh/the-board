import { TAG_PATTERN, TOO_MANY_TAGS, type TagsResponse } from "@brief-board/shared";
import { ApiRejected } from "../client.js";
import { Rejected, UsageError } from "../errors.js";
import type { Runtime } from "../runtime.js";

/**
 * `tag` and `untag`: change the tags of a ticket that exists. Idempotent: a
 * tag the ticket carries, or one it lacks, changes nothing. The board records
 * each real change, by the author, in the ticket's history.
 */

function tagArgs(rt: Runtime, verb: "tag" | "untag", args: string[]) {
  const { values, positionals } = rt.parse(args, {});
  const [ticket, ...rest] = positionals;
  const tags = rest.map((tag) => tag.trim()).filter(Boolean);
  if (ticket === undefined || tags.length === 0) throw new UsageError(`${verb} <ticket> <tag>...`);
  const key = rt.ticketKey(ticket, values.project);
  return { key, tags, author: rt.author(values.author) };
}

async function send(key: string, call: () => Promise<TagsResponse>): Promise<TagsResponse> {
  try {
    return await call();
  } catch (err) {
    if (!(err instanceof ApiRejected)) throw err;
    // A board deployed before tags could change has no such route.
    if (err.status === 404 && err.body.message.startsWith("no route "))
      throw new Rejected(
        `brief-board: the board's server doesn't take tag changes yet; ${key} is unchanged. Tell the owner it needs a deploy.`,
      );
    if (err.body.code === TOO_MANY_TAGS) throw new UsageError(err.body.message);
    throw err;
  }
}

const list = (tags: readonly string[]) => (tags.length ? tags.join(", ") : "none");

/** `tag <ticket> <tag>...` */
export async function tag(rt: Runtime, args: string[]): Promise<void> {
  const { key, tags, author } = tagArgs(rt, "tag", args);
  const bad = tags.filter((one) => one.length > 50 || !TAG_PATTERN.test(one));
  if (bad.length > 0)
    throw new UsageError(
      `${bad.map((one) => `"${one}"`).join(", ")}: a tag is lower-case words joined by hyphens, like server-structure`,
    );
  const result = await send(key, () => rt.client().tags(key, { add: tags, author }));
  rt.out(
    result.added.length
      ? `${key}: tagged ${list(result.added)}; tags now ${list(result.ticket.tags)}`
      : `${key}: already tagged; tags ${list(result.ticket.tags)}`,
  );
}

/** `untag <ticket> <tag>...` */
export async function untag(rt: Runtime, args: string[]): Promise<void> {
  const { key, tags, author } = tagArgs(rt, "untag", args);
  const result = await send(key, () => rt.client().tags(key, { remove: tags, author }));
  rt.out(
    result.removed.length
      ? `${key}: untagged ${list(result.removed)}; tags now ${list(result.ticket.tags)}`
      : `${key}: carries none of those; tags ${list(result.ticket.tags)}`,
  );
}
