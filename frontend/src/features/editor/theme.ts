/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { ThemeEngine } from '@core/theme/ThemeEngine'

/**
 * Theme adapter: ThemeEngine colors → CodeMirror 6 extensions.
 *
 * Two parts:
 * 1. EditorView.theme() — hardcoded hex values for editor chrome
 *    (CM6 theme API only accepts primitives, no CSS variables)
 * 2. HighlightStyle — syntax highlighting token colors
 *
 * Both are regenerated when the app theme changes.
 */

function getColors(): Record<string, string> {
  const theme = ThemeEngine.getCurrentTheme()
  return theme?.colors ?? {}
}

/**
 * EditorView.theme() — editor chrome styling with hardcoded values.
 * CSS-variable-based styling is in CodeMirrorEditor.css (takes precedence).
 */
export function createEditorViewTheme() {
  const c = getColors()

  return EditorView.theme({
    '&': {
      color: c['--color-text-primary'] || '#eff1f6',
    },
    '.cm-content': {
      caretColor: c['--color-accent'] || '#2cbb5d',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: c['--color-accent'] || '#2cbb5d',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: (c['--color-bg-active'] || '#333333') + 'cc',
    },
    '.cm-selectionBackground': {
      backgroundColor: (c['--color-bg-active'] || '#333333') + '99',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
    },
    '.cm-gutters': {
      color: c['--color-text-muted'] || '#5c5c5c',
      backgroundColor: 'transparent',
      border: 'none',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-matchingBracket': {
      backgroundColor: (c['--color-accent'] || '#2cbb5d') + '20',
      outline: 'none',
    },
    '.cm-tooltip': {
      backgroundColor: c['--color-bg-panel'] || '#282828',
      border: `1px solid ${c['--color-border'] || '#3a3a3a'}`,
    },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: c['--color-bg-active'] || '#333333',
      color: c['--color-text-primary'] || '#eff1f6',
    },
    '.cm-searchMatch': {
      backgroundColor: (c['--color-accent'] || '#2cbb5d') + '30',
    },
    '.cm-searchMatch-selected': {
      backgroundColor: (c['--color-accent'] || '#2cbb5d') + '60',
    },
  })
}

/**
 * Syntax highlighting — token colors from current theme.
 */
export function createSyntaxHighlighting() {
  const c = getColors()

  return syntaxHighlighting(
    HighlightStyle.define([
      // SQL keywords: SELECT, FROM, WHERE, INSERT, etc.
      { tag: tags.keyword, color: c['--color-accent-blue'] || '#4d90fe', fontWeight: 'bold' },
      { tag: tags.operatorKeyword, color: c['--color-accent-blue'] || '#4d90fe', fontWeight: 'bold' },
      { tag: tags.controlKeyword, color: c['--color-accent-blue'] || '#4d90fe', fontWeight: 'bold' },

      // Strings
      { tag: tags.string, color: c['--color-accent-orange'] || '#ffa116' },
      { tag: tags.special(tags.string), color: c['--color-accent-orange'] || '#ffa116' },
      { tag: tags.character, color: c['--color-accent-orange'] || '#ffa116' },

      // Numbers and booleans
      { tag: tags.number, color: c['--color-accent'] || '#2cbb5d' },
      { tag: tags.integer, color: c['--color-accent'] || '#2cbb5d' },
      { tag: tags.float, color: c['--color-accent'] || '#2cbb5d' },
      { tag: tags.bool, color: c['--color-accent'] || '#2cbb5d' },

      // Null
      { tag: tags.null, color: c['--color-text-muted'] || '#5c5c5c', fontStyle: 'italic' },

      // Comments
      { tag: tags.comment, color: c['--color-text-muted'] || '#5c5c5c', fontStyle: 'italic' },
      { tag: tags.lineComment, color: c['--color-text-muted'] || '#5c5c5c', fontStyle: 'italic' },
      { tag: tags.blockComment, color: c['--color-text-muted'] || '#5c5c5c', fontStyle: 'italic' },

      // Identifiers
      { tag: tags.variableName, color: c['--color-text-primary'] || '#eff1f6' },
      { tag: tags.definition(tags.variableName), color: c['--color-text-primary'] || '#eff1f6' },

      // Types and classes
      { tag: tags.typeName, color: c['--color-accent-blue'] || '#4d90fe' },
      { tag: tags.className, color: c['--color-accent-blue'] || '#4d90fe' },
      { tag: tags.namespace, color: c['--color-accent-blue'] || '#4d90fe' },

      // Properties and fields
      { tag: tags.propertyName, color: c['--color-text-primary'] || '#eff1f6' },
      { tag: tags.definition(tags.propertyName), color: c['--color-text-primary'] || '#eff1f6' },

      // Functions
      { tag: tags.function(tags.variableName), color: c['--color-accent'] || '#2cbb5d' },
      { tag: tags.function(tags.propertyName), color: c['--color-accent'] || '#2cbb5d' },

      // Operators and punctuation
      { tag: tags.operator, color: c['--color-text-secondary'] || '#a3a3a3' },
      { tag: tags.punctuation, color: c['--color-text-secondary'] || '#a3a3a3' },
      { tag: tags.bracket, color: c['--color-text-secondary'] || '#a3a3a3' },
      { tag: tags.separator, color: c['--color-text-secondary'] || '#a3a3a3' },

      // Constants
      { tag: tags.constant(tags.variableName), color: c['--color-accent-orange'] || '#ffa116' },

      // Labels (e.g., SQL aliases)
      { tag: tags.labelName, color: c['--color-text-secondary'] || '#a3a3a3' },

      // Meta (e.g., pragmas)
      { tag: tags.meta, color: c['--color-text-muted'] || '#5c5c5c' },
    ])
  )
}

/**
 * Creates all theme-related extensions.
 * Called once at mount and again whenever the app theme changes.
 */
export function createThemeExtensions() {
  return [createEditorViewTheme(), createSyntaxHighlighting()]
}
