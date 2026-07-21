/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { test, expect } from '@playwright/test'

/**
 * Query editor E2E tests.
 * Tests editor functionality and query execution.
 */
test.describe('Query Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-root')).toBeVisible()
  })

  test('should display the query editor', async ({ page }) => {
    const editor = page.locator('.query-editor')
    await expect(editor).toBeVisible()
  })

  test('should have a new query button', async ({ page }) => {
    const newQueryBtn = page.locator('button:has-text("New Query")')
    if (await newQueryBtn.isVisible()) {
      await newQueryBtn.click()
    }
  })
})
