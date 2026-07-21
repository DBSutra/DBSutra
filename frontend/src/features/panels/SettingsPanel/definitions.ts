/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { SettingSection } from './types'

export const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'appearance',
    title: 'Appearance',
    icon: 'palette',
    description: 'Theme, spacing, and visual settings',
    table: 'appearance',
    settings: [
      { key: 'theme_id', label: 'Color Theme', description: 'Controls the overall color scheme of the application', type: 'select', group: 'Theme', options: [] },

      { key: 'panel_radius', label: 'Panel Corner Radius', description: 'Border radius of dock panels (0 = square, 8 = rounded)', type: 'number', group: 'Panel Chrome', min: 0, max: 16, step: 1, unit: 'px' },
      { key: 'panel_gap', label: 'Panel Gap', description: 'Spacing between panels in the dock layout', type: 'number', group: 'Panel Chrome', min: 0, max: 8, step: 1, unit: 'px' },
      { key: 'divider_size', label: 'Divider Thickness', description: 'Width of panel resize handles', type: 'number', group: 'Panel Chrome', min: 1, max: 8, step: 1, unit: 'px' },
      { key: 'border_width', label: 'Border Width', description: 'Thickness of standard UI element borders', type: 'number', group: 'Panel Chrome', min: 0, max: 4, step: 1, unit: 'px' },

      { key: 'activity_bar_width', label: 'Activity Bar Width', description: 'Width of the side activity bar', type: 'number', group: 'Component Sizes', min: 32, max: 64, step: 2, unit: 'px' },
      { key: 'tabbar_height', label: 'Tab Bar Height', description: 'Height of the panel tab header', type: 'number', group: 'Component Sizes', min: 28, max: 48, step: 2, unit: 'px' },
      { key: 'tab_height', label: 'Individual Tab Height', description: 'Height of individual tabs', type: 'number', group: 'Component Sizes', min: 20, max: 48, step: 1, unit: 'px' },
      { key: 'tab_padding_left', label: 'Tab Padding Left', description: 'Left padding for individual tabs', type: 'number', group: 'Component Sizes', min: 0, max: 32, step: 1, unit: 'px' },
      { key: 'tab_padding_right', label: 'Tab Padding Right', description: 'Right padding (safe area for close button)', type: 'number', group: 'Component Sizes', min: 0, max: 48, step: 1, unit: 'px' },
      { key: 'statusbar_height', label: 'Status Bar Height', description: 'Height of the bottom status bar', type: 'number', group: 'Component Sizes', min: 20, max: 32, step: 2, unit: 'px' },
      { key: 'scrollbar_width', label: 'Scrollbar Width', description: 'Width of scrollbars throughout the app', type: 'number', group: 'Component Sizes', min: 2, max: 12, step: 1, unit: 'px' },
      { key: 'tab_min_width', label: 'Tab Minimum Width', description: 'Minimum width for editor tabs', type: 'number', group: 'Component Sizes', min: 30, max: 100, step: 5, unit: 'px' },
      { key: 'tab_max_width', label: 'Tab Maximum Width', description: 'Maximum width for editor tabs', type: 'number', group: 'Component Sizes', min: 100, max: 400, step: 10, unit: 'px' },

      { key: 'layout_left_weight', label: 'Left Panel Size', description: 'Relative width percentage of the left panel', type: 'number', group: 'Layout Weights', min: 10, max: 50, step: 1, unit: '%' },
      { key: 'layout_right_weight', label: 'Right Panel Size', description: 'Relative width percentage of the right panel', type: 'number', group: 'Layout Weights', min: 10, max: 50, step: 1, unit: '%' },
      { key: 'layout_top_weight', label: 'Top Panel Size', description: 'Relative height percentage of the top middle panel', type: 'number', group: 'Layout Weights', min: 10, max: 90, step: 1, unit: '%' },

      { key: 'radius_xs', label: 'Extra Small Radius', description: 'Border radius for tiny elements (scrollbar thumbs, badges)', type: 'number', group: 'Border Radius', min: 0, max: 8, step: 1, unit: 'px' },
      { key: 'radius_sm', label: 'Small Radius', description: 'Border radius for small elements (inputs, buttons, tabs)', type: 'number', group: 'Border Radius', min: 0, max: 16, step: 1, unit: 'px' },
      { key: 'radius_md', label: 'Medium Radius', description: 'Border radius for medium elements (cards, dropdowns)', type: 'number', group: 'Border Radius', min: 0, max: 16, step: 1, unit: 'px' },
      { key: 'radius_lg', label: 'Large Radius', description: 'Border radius for large elements (floating panels)', type: 'number', group: 'Border Radius', min: 0, max: 24, step: 1, unit: 'px' },
      { key: 'radius_xl', label: 'Extra Large Radius', description: 'Border radius for extra large elements (command palette, dialogs)', type: 'number', group: 'Border Radius', min: 0, max: 24, step: 1, unit: 'px' },

      { key: 'transition_fast', label: 'Fast Transition Speed', description: 'Duration for fast animations like hover states', type: 'number', group: 'Transitions', min: 0, max: 300, step: 10, unit: 'ms' },
      { key: 'transition_normal', label: 'Normal Transition Speed', description: 'Duration for standard animations like panel slides', type: 'number', group: 'Transitions', min: 0, max: 500, step: 10, unit: 'ms' },
      { key: 'transition_slow', label: 'Slow Transition Speed', description: 'Duration for slower animations', type: 'number', group: 'Transitions', min: 0, max: 1000, step: 50, unit: 'ms' },
    ],
  },
  {
    id: 'fonts',
    title: 'Typography',
    icon: 'type',
    description: 'Font families and sizes',
    table: 'fonts',
    settings: [
      { key: 'ui_family', label: 'UI Font Family', description: 'Font used for menus, panels, and general UI', type: 'font', group: 'UI Font', placeholder: "'Inter', system-ui, sans-serif" },
      { key: 'ui_size', label: 'UI Font Size', description: 'Base font size for the interface', type: 'number', group: 'UI Font', min: 10, max: 20, step: 1, unit: 'px' },
      { key: 'ui_size_sm', label: 'UI Font Size (Small)', description: 'Small font size for secondary text', type: 'number', group: 'UI Font', min: 8, max: 16, step: 1, unit: 'px' },

      { key: 'editor_family', label: 'Editor Font Family', description: 'Monospace font used in the query editor', type: 'font', group: 'Editor Font', placeholder: "'JetBrains Mono', monospace" },
      { key: 'editor_size', label: 'Editor Font Size', description: 'Font size in the query editor', type: 'number', group: 'Editor Font', min: 10, max: 24, step: 1, unit: 'px' },

      { key: 'mono_family', label: 'Monospace Font', description: 'Monospace font used for results and data tables', type: 'font', group: 'Monospace Font', placeholder: "'JetBrains Mono', monospace" },
    ],
  },
  {
    id: 'panelConfig',
    title: 'Layout',
    icon: 'layout',
    description: 'Panel positions and visibility',
    table: 'panelConfig',
    settings: [
      { key: 'activity_bar_position', label: 'Activity Bar Position', description: 'Side of the window where the activity bar is displayed', type: 'select', group: 'Bar Positions', options: [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }, { value: 'top', label: 'Top' }, { value: 'bottom', label: 'Bottom' }] },
      { key: 'activity_bar_visible', label: 'Show Activity Bar', description: 'Toggle the side activity bar visibility', type: 'boolean', group: 'Bar Positions' },
      { key: 'status_bar_position', label: 'Status Bar Position', description: 'Position of the status bar (outermost wrapper)', type: 'select', group: 'Bar Positions', options: [{ value: 'bottom', label: 'Bottom' }, { value: 'top', label: 'Top' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }] },
      { key: 'status_bar_visible', label: 'Show Status Bar', description: 'Toggle the status bar visibility', type: 'boolean', group: 'Bar Positions' },

      { key: 'focus_ring_enabled', label: 'Focus Ring', description: 'Show a visual ring around the currently focused panel', type: 'boolean', group: 'Focus Ring' },
      { key: 'focus_ring_width', label: 'Focus Ring Width', description: 'Thickness of the focus ring border (0 = hidden)', type: 'number', group: 'Focus Ring', min: 0, max: 6, step: 1, unit: 'px' },
      { key: 'focus_ring_color', label: 'Focus Ring Color', description: 'Color of the focus ring (CSS color value)', type: 'color', group: 'Focus Ring' },
      { key: 'focus_ring_offset', label: 'Focus Ring Offset', description: 'Space between the panel edge and the focus ring', type: 'number', group: 'Focus Ring', min: 0, max: 8, step: 1, unit: 'px' },
    ],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    icon: 'keyboard',
    description: 'Custom key bindings for commands',
    table: 'shortcuts',
    settings: [],
  },
  {
    id: 'colorOverrides',
    title: 'Color Overrides',
    icon: 'paintbrush',
    description: 'Override individual theme colors',
    table: 'colorOverrides',
    settings: [],
  },
]
