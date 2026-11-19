# Brief 24: Linking Ward asks for the password

**Depends on:** Ward's library at the version that adds the look-alike username check (2026-11-19; the dispatch prompt names the wzd_auth commit to vendor from).

**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-19 by the controller. The owner's rule of 2026-11-17: an app links or unlinks a Ward account only after the local password is typed again. Ward's library carries the rule from 1.0.0; this app gets it when it vendors the new copy. The same update refuses a new or changed local username that looks like an existing one (Unicode's confusable skeleton: `AIice` against `alice`, `b0b` against `bob`).

## Context

This app vendors ward-auth 0.7.0 in `server/vendor/ward` and `web/vendor/ward`. Its code calls the link at: `web/src/AccountPage.tsx:83` (link).

What the update changes here:

- `POST /ward/link` takes `{ currentPassword }`: 400 `invalid_request` without it, 401 `invalid_credentials` when it is wrong, 429 `too_many_attempts` with `retryAfterSeconds` under the change-password budget.
- The browser calls take the password: `link(currentPassword)` / `startWardLink(currentPassword)`. The old call shape no longer compiles, so the typecheck finds every call site.
- A link start is held in the server's memory for ten minutes; one still waiting for Ward when the server restarts lands as `?ward_error=invalid_callback` (the words for it exist).
- The username key: a migration at start adds a key column and fills it. Two existing accounts with the same key are both kept and logged once. Nothing to do by hand.

## Decisions

- **Both copies in one commit.** The new server copy refuses a link or unlink from an old web copy (400); an old server ignores the new field.
- **The password field sits with its control:** next to the Link button. Labelled as the app labels its other password fields ("Current password" or the app's language), `type="password"`, `autocomplete="current-password"`. A refusal stays on the page: `invalid_credentials` and `too_many_attempts` (with the wait) show beside the field, which keeps focus.

## Files you OWN

- `server/vendor/ward/` and `web/vendor/ward/`: generated, written only by Ward's vendor script.
- The settings code named above, the server's auth plugin options, and their tests.
- Corpus: `corpus/wiki/status.md`, `corpus/log.md`, the wiki page that describes sign-in.

## Files you must NOT touch

- The wzd_auth repo: read only (its vendor script writes only into this repo). Other features.

## What to do

1. Vendor both copies from the wzd_auth checkout at the commit the dispatch prompt names: `npm run vendor -- <this repo>/server/vendor/ward`, then the same for `web/vendor/ward`, in one commit with the call-site changes.
2. Server tests that POST `/ward/link` with a session send `{ currentPassword }`. New: link without it, with a wrong one and with the right one; a linked user still signs in with Ward.
3. The settings UI as decided, with a test that the call carries the password and that a wrong one shows the message.
4. A test that a new local account with a look-alike name (`AIice` when `alice` exists) is refused with the taken-name answer on `/register`, where this app has a route that creates or renames local accounts; skip it and say so where it has none.
5. Start the app on its dev seed once and read the start log: the username-key migration ran; note any shared-key line.
6. Shots of the settings at 1280 light and 390 dark; read them for clipping.

## Acceptance

- [ ] Both vendored copies at the new version; the tests above pass; `npm run check` exit 0; `bash corpus/lint.sh` OK.
- [ ] The outcome note lists each CHANGELOG entry this app crossed and what it needed.
- [ ] End move `ready_for_deploy` with the app's deploy step (server and web both change).

## Outcome (2026-11-19)

Commit: f9f8273. Both vendored copies (`server/vendor/ward`, `web/vendor/ward`) are ward-auth 1.1.0, from the controller's staged copy built at wzd_auth 66998b7; `sha256sum -c` against its SHA256SUMS passed in each. `allowRename: false` is unchanged.

**What a person notices:** on the account page, Link Ward is now a form: "Current password" and the button. An empty field says "Enter your password to link Ward."; a wrong password says "That password is wrong. Type your brief-board password again." and a lockout says how long to wait; the error sits under the field, which keeps focus. A signed-in Ward-only user (no local password) no longer sees the form.

**CHANGELOG entries crossed, 0.7.0 to 1.1.0:**
- 0.7.1 and 0.7.2: nothing needed.
- 1.0.0: link takes `{ currentPassword }`; the browser call is `link(currentPassword)`. That was `AccountPage.tsx`, now `LinkWard.tsx`. Unlink is not offered here, so nothing for it. A link waiting for Ward across a restart lands as `?ward_error=invalid_callback`, whose words already existed.
- 1.1.0: migration 5 (`username_skeleton`) runs at first boot; nothing by hand. No step back once it has run.

**Tests:** server (`auth.test.ts`): link without the password 400 `invalid_request`, wrong 401 `invalid_credentials`, right 200 with Ward's authorize URL, five wrong then 429; there is no `/register` route (404 with a session) and the seed throws `UsernameTakenError` for `AIice` beside `alice`. Web: `LinkWard.test.tsx` (field, error), and `web/e2e/account.spec.ts` (the call carries the typed password, a wrong one and a lockout show). The brief's "a linked user still signs in with Ward" is not tested: it needs a full OIDC callback and Ward's signing; the library's own tests cover it.

**Start log:** a scratch database written by the 0.7.0 library with `alice` and `AIice`, started on 1.1.0, logged once: `ward-auth: 2 users have usernames that read the same (ids ...). They stay as they are, and no new user or rename can take that name.` A fresh database logs nothing for migration 5.

**Shots** at 1280 light and 390 dark, with the refusal showing, read for clipping: none. `shots.spec.ts` gained an `account-link-error` screen.

Commits: f9f8273
Checks run: `npm run check` exit 0 (386 tests); `npx playwright test account` pass; shots of the account page at 1280 and 390, light and dark; the 1.1.0 start on a scratch database.
Checks skipped: a linked user signing in with Ward end to end (needs Ward); no local Ward start (shots stub the routes).
Owner steps: from vps-deploy, back up the board's SQLite file (migration 5 cannot be stepped back), then `node cli.ts brief-board all`.
