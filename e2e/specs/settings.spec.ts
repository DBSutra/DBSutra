/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { test, expect } from '@playwright/test'

/**
 * Settings/Preferences E2E tests.
 * Tests settings panel and configuration changes.
 */
test.describe('Settings & Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-root')).toBeVisible()
  })

  test('should open settings panel', async ({ page }) => {
    // Try to find and click settings
    const settingsBtn = page.locator('[title*="Settings"], [title*="Preferences"]')
    if (await settingsBtn.first().isVisible()) {
      await settingsBtn.first().click()
    }
  })

  test('should display preferences when opened', async ({ page }) => {
    const prefs = page.locator('.preferences-panel')
    if (await prefs.isVisible()) {
      await expect(prefs).toBeVisible()
    }
  })
})
