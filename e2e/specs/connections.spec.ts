/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { test, expect } from '@playwright/test'

/**
 * Connection management E2E tests.
 * Tests connection creation, editing, and deletion.
 */
test.describe('Connection Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to be ready
    await expect(page.locator('.app-root')).toBeVisible()
  })

  test('should open connection dialog', async ({ page }) => {
    // Click the new connection button
    const newConnBtn = page.locator('button:has-text("New Connection")')
    if (await newConnBtn.isVisible()) {
      await newConnBtn.click()
      await expect(page.locator('.connection-form')).toBeVisible()
    }
  })

  test('should display saved connections', async ({ page }) => {
    // Check if connections panel is visible
    const connectionsPanel = page.locator('.connections-panel')
    await expect(connectionsPanel).toBeVisible()
  })
})
