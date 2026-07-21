/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'

/**
 * Custom render function that wraps components with common providers.
 * Use this instead of @testing-library/react's render.
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, {
    ...options,
  })
}

export { customRender as render }
export { screen, fireEvent, waitFor, within, act } from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
