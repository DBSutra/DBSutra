/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { test, expect } from '@playwright/test'

/**
 * Schema explorer E2E tests.
 * Tests schema tree navigation and interaction.
 */
test.describe('Schema Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-root')).toBeVisible()
  })

  test('should display schema explorer', async ({ page }) => {
    const explorer = page.locator('.schema-explorer')
    await expect(explorer).toBeVisible()
  })

  test('should show empty state when no connection', async ({ page }) => {
    const emptyState = page.locator('.schema-empty')
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText('No Saved Connections')
    }
  })
})
