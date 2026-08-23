import { test, expect } from "@playwright/test";

test.describe("Lanework E2E Smoke Tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Lanework/);
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign in")).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("text=Create account")).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Pricing")).toBeVisible();
  });

  test("protected routes redirect to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("login form has required fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("404 page shows for unknown routes", async ({ page }) => {
    await page.goto("/nonexistent-page-12345");
    await expect(page.locator("text=404")).toBeVisible();
  });

  test("API returns 401 for unauthenticated requests", async ({ request }) => {
    const response = await request.get("/api/shipment");
    expect(response.status()).toBe(401);
  });

  test("CSRF token endpoint works", async ({ request }) => {
    const response = await request.get("/api/csrf");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.csrfToken).toBeTruthy();
  });
});
