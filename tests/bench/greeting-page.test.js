// WS-BENCH-1B: Greeting page E2E tests
// Order: MISUSE -> BOUNDARY -> GOLDEN PATH
// Target: pure HTML/CSS/JS single-file greeting page

const { test, expect } = require('@playwright/test');
const path = require('path');

const PAGE_URL = `file://${path.resolve(__dirname, '../../src/bench/greeting.html')}`;

// ─── MISUSE CASES ────────────────────────────────────────────────────────────

test('misuse: submitting with both fields empty shows no greeting', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.click('[type="submit"]');
  const greeting = await page.locator('#greeting');
  await expect(greeting).not.toContainText('hi');
});

test('misuse: submitting with only first name empty shows no greeting', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.fill('#last-name', 'Smith');
  await page.click('[type="submit"]');
  const greeting = await page.locator('#greeting');
  await expect(greeting).not.toContainText('hi Smith');
});

test('misuse: submitting with only last name empty shows no greeting', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.fill('#first-name', 'Alice');
  await page.click('[type="submit"]');
  const greeting = await page.locator('#greeting');
  await expect(greeting).not.toContainText('hi Alice');
});

test('misuse: XSS attempt in first name is rendered as text, not executed', async ({ page }) => {
  await page.goto(PAGE_URL);
  // Track if any alert fires (would indicate XSS vulnerability)
  let alertFired = false;
  page.on('dialog', () => { alertFired = true; });

  await page.fill('#first-name', '<script>alert("xss")</script>');
  await page.fill('#last-name', 'Smith');
  await page.click('[type="submit"]');

  expect(alertFired).toBe(false);
  // The raw script tag text should not appear as executed HTML
  const html = await page.locator('#greeting').innerHTML();
  expect(html).not.toContain('<script>');
});

test('misuse: HTML injection in last name is rendered as text, not HTML', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.fill('#first-name', 'Alice');
  await page.fill('#last-name', '<b>Bold</b>');
  await page.click('[type="submit"]');

  // The greeting text should contain the literal angle brackets, not render a <b> tag
  const text = await page.locator('#greeting').textContent();
  expect(text).toContain('<b>Bold</b>');
  const html = await page.locator('#greeting').innerHTML();
  expect(html).not.toMatch(/<b>Bold<\/b>/);
});

// ─── BOUNDARY CASES ──────────────────────────────────────────────────────────

test('boundary: very long name (100 chars) displays without truncation', async ({ page }) => {
  await page.goto(PAGE_URL);
  const longFirst = 'A'.repeat(50);
  const longLast = 'B'.repeat(50);
  await page.fill('#first-name', longFirst);
  await page.fill('#last-name', longLast);
  await page.click('[type="submit"]');

  const text = await page.locator('#greeting').textContent();
  expect(text).toContain(`hi ${longFirst} ${longLast}`);
});

test('boundary: names with hyphens and apostrophes display correctly', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.fill('#first-name', "Mary-Jane");
  await page.fill('#last-name', "O'Brien");
  await page.click('[type="submit"]');

  const text = await page.locator('#greeting').textContent();
  expect(text).toContain("hi Mary-Jane O'Brien");
});

test('boundary: unicode characters in name display correctly', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.fill('#first-name', 'Zoë');
  await page.fill('#last-name', 'Müller');
  await page.click('[type="submit"]');

  const text = await page.locator('#greeting').textContent();
  expect(text).toContain('hi Zoë Müller');
});

// ─── GOLDEN PATH ─────────────────────────────────────────────────────────────

test('golden path: greeting displays "hi {first} {last}" on submit', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.fill('#first-name', 'Alice');
  await page.fill('#last-name', 'Smith');
  await page.click('[type="submit"]');

  const text = await page.locator('#greeting').textContent();
  expect(text).toContain('hi Alice Smith');
});

test('golden path: page loads with visible form fields and submit button', async ({ page }) => {
  await page.goto(PAGE_URL);
  await expect(page.locator('#first-name')).toBeVisible();
  await expect(page.locator('#last-name')).toBeVisible();
  await expect(page.locator('[type="submit"]')).toBeVisible();
});

test('golden path: greeting appears on the page, not in a browser alert', async ({ page }) => {
  await page.goto(PAGE_URL);
  let alertFired = false;
  page.on('dialog', () => { alertFired = true; });

  await page.fill('#first-name', 'Bob');
  await page.fill('#last-name', 'Jones');
  await page.click('[type="submit"]');

  expect(alertFired).toBe(false);
  const greeting = await page.locator('#greeting');
  await expect(greeting).toBeVisible();
  await expect(greeting).toContainText('hi Bob Jones');
});

test('golden path: submitting again with different names updates the greeting', async ({ page }) => {
  await page.goto(PAGE_URL);
  await page.fill('#first-name', 'Alice');
  await page.fill('#last-name', 'Smith');
  await page.click('[type="submit"]');
  await expect(page.locator('#greeting')).toContainText('hi Alice Smith');

  await page.fill('#first-name', 'Carlos');
  await page.fill('#last-name', 'Rivera');
  await page.click('[type="submit"]');
  await expect(page.locator('#greeting')).toContainText('hi Carlos Rivera');
});
