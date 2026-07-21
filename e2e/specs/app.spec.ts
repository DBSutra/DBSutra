/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { test, expect } from '@playwright/test'

/**
 * App-level E2E tests.
 * Tests the basic application shell and navigation.
 */
test.describe('Application Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the application', async ({ page }) => {
    // Wait for the app to be ready
    await expect(page.locator('.app-root')).toBeVisible()
  })

  test('should display the activity bar', async ({ page }) => {
    await expect(page.locator('.activity-bar')).toBeVisible()
  })

  test('should display the status bar', async ({ page }) => {
    await expect(page.locator('.status-bar')).toBeVisible()
  })

  test('should have the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/DBSutra/)
  })
})
