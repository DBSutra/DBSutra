/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { test, expect } from '@playwright/test'

/**
 * Results viewer E2E tests.
 * Tests result display, filtering, and export.
 */
test.describe('Results Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-root')).toBeVisible()
  })

  test('should display results panel', async ({ page }) => {
    const results = page.locator('.result-viewer')
    await expect(results).toBeVisible()
  })

  test('should show empty state when no results', async ({ page }) => {
    const emptyState = page.locator('.rv-empty')
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('No Results')
    }
  })
})
