import { test, expect } from "@playwright/test";

test("landing page renders HARSI terminal marketing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Session signals/i })).toBeVisible();
  await expect(page.getByText(/London HARSI/i)).toBeVisible();
  await page.getByRole("link", { name: /Sign in/i }).first().click();
  await expect(page.getByRole("heading", { name: /Sign in/i })).toBeVisible();
});
