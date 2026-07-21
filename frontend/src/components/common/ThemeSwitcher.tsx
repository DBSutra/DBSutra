/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react'
import { useAppStore } from '@core/state/store'
import { Icon } from '@primitives'

/**
 * Theme switcher component.
 * Follows DataGrip pattern for quick theme switching.
 */
export const ThemeSwitcher: React.FC = () => {
  const preferences = useAppStore((s) => s.preferences)
  const setPreference = useAppStore((s) => s.setPreference)

  const themes = [
    { id: 'dark', label: 'Dark', icon: 'moon' },
    { id: 'light', label: 'Light', icon: 'sun' },
    { id: 'auto', label: 'Auto', icon: 'monitor' },
  ] as const

  const currentTheme = preferences.general.theme

  return (
    <div className="theme-switcher">
      {themes.map((theme) => (
        <button
          key={theme.id}
          className={`theme-btn ${currentTheme === theme.id ? 'active' : ''}`}
          onClick={() => setPreference('general', 'theme', theme.id)}
          title={theme.label}
        >
          <Icon name={theme.icon} size={14} />
        </button>
      ))}
    </div>
  )
}
