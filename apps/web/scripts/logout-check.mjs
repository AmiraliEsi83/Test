import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(20000);
await page.goto("http://localhost:3000/login");
await page.locator('input[type="email"]').fill("trader@harsi.ai");
await page.locator('input[type="password"]').fill("harsi123");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForURL("**/dashboard");
await page.screenshot({ path: "/opt/cursor/artifacts/dashboard_logout_button.png", fullPage: true });
await page.getByRole("button", { name: "Log out" }).first().click();
await page.waitForURL("http://localhost:3000/");
await page.screenshot({ path: "/opt/cursor/artifacts/landing_after_logout.png", fullPage: true });
await page.goto("http://localhost:3000/dashboard");
await page.waitForTimeout(1500);
const url = page.url();
await page.screenshot({ path: "/opt/cursor/artifacts/dashboard_after_logout_redirect.png", fullPage: true });
console.log("after logout home ok, dashboard url:", url);
if (!url.includes("/login") && !url.endsWith("/")) {
  throw new Error("Expected redirect to login, got " + url);
}
await browser.close();
console.log("LOGOUT_OK");
