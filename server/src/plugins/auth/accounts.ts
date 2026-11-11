import { createAccounts, createSqliteStore, seedUsers, type Accounts } from "../../../vendor/ward/ward-auth.js";
import type { Db } from "../../db.js";

/**
 * The board's local accounts, on the vendored ward-auth library. Every
 * signed-in user sees the whole board, so there is one role and nothing checks
 * it; a user made by a first "Sign in with Ward" gets it too (`plugins/auth`).
 */
export const USER_ROLE = "user";

/**
 * The accounts on the board's own database. The library migrates its own
 * tables (`auth_users`, `auth_sessions`, `auth_ward_links`, tracked in
 * `auth_migrations`) on this call, beside the board's; it never touches
 * `PRAGMA user_version`, which is the board's (`db.ts`).
 */
export function openAccounts(db: Db): Accounts {
  return createAccounts({ store: createSqliteStore(db) });
}

/**
 * Create a user, unless one of that name (case-folded) exists, which is then
 * left exactly as it is: no password reset. True when it was created. Throws
 * the library's policy errors (a password under 8 characters, say).
 */
export async function seedUser(accounts: Accounts, user: { username: string; password: string }): Promise<boolean> {
  const result = await seedUsers(accounts, [{ ...user, role: USER_ROLE }]);
  return result.created.length > 0;
}
