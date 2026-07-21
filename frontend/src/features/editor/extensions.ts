/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { lintKeymap } from '@codemirror/lint'
import { sql } from '@codemirror/lang-sql'
import { javascript } from '@codemirror/lang-javascript'
import { createThemeExtensions } from './theme'
import { sqlAutocompletion } from './sqlSupport'
import { jsAutocompletion } from './jsSupport'

/** Creates the language extension for the given language. */
export function createLanguageExtension(language: 'sql' | 'javascript'): Extension {
  return language === 'sql' ? sql() : javascript()
}

/** Creates the autocompletion extension for the given language. */
export function createAutocompletion(language: 'sql' | 'javascript'): Extension {
  return language === 'sql' ? sqlAutocompletion() : jsAutocompletion()
}

/** Creates all CodeMirror extensions for the editor. */
export function createEditorExtensions(
  language: 'sql' | 'javascript',
  readOnly: boolean,
  _themeVersion: number,
  onKeyDownRef: React.MutableRefObject<((e: KeyboardEvent, view: EditorView) => boolean) | undefined>,
  viewRef: React.MutableRefObject<EditorView | null>,
  onChangeRef: React.MutableRefObject<(value: string) => void>
): Extension[] {
  return [
    ...createThemeExtensions(),
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    createLanguageExtension(language),
    createAutocompletion(language),
    autocompletion(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]),
    EditorView.domEventHandlers({
      keydown: (e) => {
        if (onKeyDownRef.current) return onKeyDownRef.current(e, viewRef.current!)
        return false
      },
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChangeRef.current(update.state.doc.toString())
    }),
    ...(readOnly ? [EditorState.readOnly.of(true)] : []),
  ]
}
