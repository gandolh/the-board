import { expect, test } from "@playwright/test";
import { BASE, stubBoard } from "./fixtures";

/**
 * Linking Ward asks for the account's password again. The server's answers are stubbed: a wrong
 * password is refused beside the field, and the right one reaches Ward with the password in the call.
 */
test("Link Ward sends the typed password and shows a refusal beside the field", async ({ page }) => {
  await stubBoard(page);
  const bodies: unknown[] = [];
  let answer: { status: number; body: unknown } = { status: 401, body: { error: "invalid_credentials" } };
  await page.route("**/brief-board-api/auth/ward/link", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({
      status: answer.status,
      contentType: "application/json",
      body: JSON.stringify(answer.body),
    });
  });
  await page.goto(`${BASE}account`);

  const field = page.getByLabel("Current password");
  await page.getByRole("button", { name: "Link Ward" }).click();
  await expect(page.getByText("Enter your password to link Ward.")).toBeVisible();
  expect(bodies).toEqual([]);

  await field.fill("wrong-password");
  await page.getByRole("button", { name: "Link Ward" }).click();
  await expect(page.getByRole("alert")).toHaveText("That password is wrong. Type your brief-board password again.");
  await expect(field).toBeFocused();
  expect(bodies).toEqual([{ currentPassword: "wrong-password" }]);

  answer = {
    status: 429,
    body: { error: "too_many_attempts", retryAfterSeconds: 45 },
  };
  await page.getByRole("button", { name: "Link Ward" }).click();
  await expect(page.getByRole("alert")).toHaveText("Too many tries. Wait 45 seconds, then try again.");
});
