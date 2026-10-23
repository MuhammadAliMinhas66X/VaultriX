import { test, expect } from '@playwright/test';
import { waitForSubmitReady } from '../fixtures/testUser.js';

// Signup can't be driven all the way to a real account here - the last
// step needs an emailed OTP and Playwright has no inbox to read it from -
// so this file covers everything up to and including "the OTP step
// appeared", which is still most of the surface that can actually break.

test.describe('Signup page', () => {
  test('renders the form and the Google button', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await waitForSubmitReady(page, 'Create account');
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });

  test('blocks submit when required fields are empty', async ({ page }) => {
    await page.goto('/signup');
    const createAccount = await waitForSubmitReady(page, 'Create account');
    await createAccount.click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('shows the password strength indicator while typing', async ({ page }) => {
    await page.goto('/signup');
    // Signup shows a PasswordStrength bar + hint (not a rules list) once
    // the field has any content - this was asserting against a <ul><li>
    // that never existed on this page, which is why it kept "failing" at
    // close to the default 8s expect timeout no matter what was typed.
    const password = page.getByLabel('Password', { exact: true });
    await expect(page.getByText('Use more than 8 characters', { exact: false })).toBeHidden();
    await password.fill('a');
    await expect(page.getByText('Use more than 8 characters', { exact: false })).toBeVisible();
  });

  test('toggling password visibility actually changes the input type', async ({ page }) => {
    await page.goto('/signup');
    const password = page.getByLabel('Password', { exact: true });
    await password.fill('Sup3r!Secret');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('a valid submission reaches the "enter the code" step', async ({ page }) => {
    await page.goto('/signup');
    const uniqueEmail = `e2e.signup.${Date.now()}@gmail.com`;
    await page.getByLabel('Full name').fill('E2E Playwright Test');
    await page.getByLabel('Email').fill(uniqueEmail);
    await page.getByLabel('Password', { exact: true }).fill('Sup3r!Secret123');
    const createAccount = await waitForSubmitReady(page, 'Create account');
    await createAccount.click();

    // Waiting for the real-time email validity check + captcha + request to settle.
    await expect(page.getByText(/enter the code|verification code|check your email/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('Forgot password page', () => {
  test('renders and accepts an email', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});
