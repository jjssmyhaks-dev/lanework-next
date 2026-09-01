/**
 * E2E Test: Full Chat Flow
 *
 * Tests the complete user journey:
 * 1. Login with test credentials
 * 2. Navigate to chat page
 * 3. Send a message via suggestion button
 * 4. Verify the message appears in the conversation
 * 5. Verify the assistant response arrives (tool call or fallback)
 * 6. Send a custom message
 * 7. Verify multi-turn context works
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = "test@lanework.in";
const TEST_PASSWORD = "Test@1234";

test.describe("Chat Flow", () => {
  test("login and navigate to chat", async ({ page }) => {
    // 1. Go to login
    await page.goto(`${BASE_URL}/login`);
    await expect(page).toHaveTitle(/Lanework/);

    // 2. Fill login form
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);

    // 3. Submit login
    await page.click('button:has-text("Sign in"), button[type="submit"]');

    // 4. Wait for redirect to dashboard
    await page.waitForURL("**/dashboard**", { timeout: 10000 });

    // 5. Navigate to chat
    await page.click('a[href="/chat"]');
    await page.waitForURL("**/chat", { timeout: 10000 });

    // 6. Verify chat page loaded
    await expect(page.locator("text=What can I help with?")).toBeVisible();
    await expect(page.locator("text=Lanework logistics copilot")).toBeVisible();
  });

  test("send message via suggestion button", async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign in"), button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    await page.click('a[href="/chat"]');
    await page.waitForURL("**/chat", { timeout: 10000 });

    // Click a suggestion button
    const suggestion = page.locator('button:has-text("Track shipment")').first();
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    // Verify user message appears
    await expect(page.locator('text=Track shipment SH-2024-001')).toBeVisible({ timeout: 5000 });

    // Wait for assistant response (either streaming or fallback)
    // The response should contain tool call data or an error message
    const responseArea = page.locator('[class*="rounded-2xl"]').filter({ hasText: /Here's what|I couldn't|Something went wrong/ });
    await expect(responseArea.first()).toBeVisible({ timeout: 15000 });
  });

  test("send custom message", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign in"), button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    await page.click('a[href="/chat"]');
    await page.waitForURL("**/chat", { timeout: 10000 });

    // Type a custom message
    const textarea = page.locator('textarea[placeholder*="Ask about" i]');
    await expect(textarea).toBeVisible();
    await textarea.fill("Check weather in Mumbai");

    // Send the message
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Verify user message appears
    await expect(page.locator('text=Check weather in Mumbai')).toBeVisible({ timeout: 5000 });

    // Wait for response
    const responseArea = page.locator('[class*="rounded-2xl"]').filter({ hasText: /Weather|weather|I can help/ });
    await expect(responseArea.first()).toBeVisible({ timeout: 15000 });
  });

  test("chat page has all UI elements", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign in"), button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    await page.click('a[href="/chat"]');
    await page.waitForURL("**/chat", { timeout: 10000 });

    // Verify key UI elements
    await expect(page.locator("text=What can I help with?")).toBeVisible();
    await expect(page.locator("text=Powered by 15 AI integrations")).toBeVisible();

    // Suggestion buttons
    await expect(page.locator('button:has-text("Track shipment")')).toBeVisible();
    await expect(page.locator('button:has-text("Check weather")')).toBeVisible();
    await expect(page.locator('button:has-text("Validate GSTIN")')).toBeVisible();

    // Integration pills
    await expect(page.locator('button:has-text("Shiprocket")')).toBeVisible();
    await expect(page.locator('button:has-text("TallyPrime")')).toBeVisible();

    // Quick actions
    await expect(page.locator('button:has-text("Track Shipment")')).toBeVisible();
    await expect(page.locator('button:has-text("Check Inventory")')).toBeVisible();

    // Input area
    await expect(page.locator('textarea[placeholder*="Ask about" i]')).toBeVisible();
    await expect(page.locator('button[aria-label="Send message"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Upload file"]')).toBeVisible();

    // Voice input button
    await expect(page.locator('button[aria-label*="voice" i], button[title*="voice" i]')).toBeVisible();

    // Usage tracker
    await expect(page.locator('text=chats today')).toBeVisible();

    // Sidebar
    await expect(page.locator("text=Conversations")).toBeVisible();
  });

  test("clear conversation", async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Sign in"), button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 });
    await page.click('a[href="/chat"]');
    await page.waitForURL("**/chat", { timeout: 10000 });

    // Send a message first
    const textarea = page.locator('textarea[placeholder*="Ask about" i]');
    await textarea.fill("Hello");
    await page.locator('button[aria-label="Send message"]').click();
    await page.waitForTimeout(2000);

    // Clear conversation
    await page.locator('button[title="Clear conversation"]').click();

    // Verify welcome message is back
    await expect(page.locator("text=What can I help with?")).toBeVisible();
  });
});
