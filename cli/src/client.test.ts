import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BoardClient, DEFAULT_TIMEOUT_MS } from "./client.js";
import { Unreachable } from "./errors.js";

/** A board that answers `/api/board` after `delayMs`, or never when `delayMs` is null. */
async function slowBoard(delayMs: number | null): Promise<{ url: string; server: Server }> {
  const server = createServer((_req, res) => {
    if (delayMs === null) return;
    setTimeout(() => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ tickets: [] }));
    }, delayMs);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, server };
}

const servers: Server[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

describe("the client's timeout", () => {
  it("waits for a board that answers late, as a waking one does", async () => {
    const { url, server } = await slowBoard(300);
    servers.push(server);
    await expect(new BoardClient(url, undefined, 1_000).board()).resolves.toEqual({ tickets: [] });
  });

  it("calls a board that never answers unreachable once the time is up", async () => {
    const { url, server } = await slowBoard(null);
    servers.push(server);
    await expect(new BoardClient(url, undefined, 200).board()).rejects.toBeInstanceOf(Unreachable);
  });

  it("gives the board 30 seconds unless told otherwise", async () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(30_000);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const { url, server } = await slowBoard(0);
    servers.push(server);
    await new BoardClient(url).board();
    expect(timeout).toHaveBeenCalledWith(30_000);
  });
});
