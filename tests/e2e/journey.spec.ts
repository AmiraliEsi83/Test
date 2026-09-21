import { expect, test } from "@playwright/test";

test("signup, chart, paper order, close, logout", async ({ page }) => {
  const email = `e2e-${Date.now()}@harsi.test`;
  await page.goto("/");
  await expect(page.getByTestId("landing-hero")).toBeVisible();
  await page.goto("/signup");
  await page.fill("#name", "E2E Desk");
  await page.fill("#email", email);
  await page.fill("#password", "paper-pass-123");
  await page.getByTestId("signup-submit").click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("chart")).toBeVisible();
  await page.getByTestId("side-buy").click();
  await page.fill("#qty", "10000");
  await page.getByTestId("submit-order").click();
  await expect(page.getByTestId("positions-table")).toContainText("EURUSD");
  await page.getByRole("button", { name: "Close" }).first().click();
  await page.getByTestId("logout").click();
  await page.waitForURL("**/");
});
