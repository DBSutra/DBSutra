/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useEffect, useRef, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { Events } from '@core/events/EventBus'
import { useEventBus } from '@shared/hooks'
import { createEditorExtensions } from './extensions'
import './CodeMirrorEditor.css'

export interface CodeMirrorEditorProps {
  value: string
  onChange: (value: string) => void
  language?: 'sql' | 'javascript'
  readOnly?: boolean
  className?: string
  onKeyDown?: (e: KeyboardEvent, view: EditorView) => boolean
}

/**
 * CodeMirror 6 editor component.
 * Lightweight, themeable alternative to Monaco Editor.
 */
export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language = 'sql',
  readOnly = false,
  className = '',
  onKeyDown,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onKeyDownRef = useRef(onKeyDown)
  const [themeVersion, setThemeVersion] = useState(0)

  onChangeRef.current = onChange
  onKeyDownRef.current = onKeyDown

  useEventBus(Events.THEME_CHANGED, () => setThemeVersion((v) => v + 1))

  // Mount editor
  useEffect(() => {
    if (!containerRef.current) return
    const state = EditorState.create({
      doc: value,
      extensions: createEditorExtensions(language, readOnly, themeVersion, onKeyDownRef, viewRef, onChangeRef),
    })
    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update value from outside (when tab changes)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentContent = view.state.doc.toString()
    if (currentContent !== value) {
      view.dispatch({ changes: { from: 0, to: currentContent.length, insert: value } })
    }
  }, [value])

  // Rebuild editor when theme or language changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    const newState = EditorState.create({
      doc: currentDoc,
      extensions: createEditorExtensions(language, readOnly, themeVersion, onKeyDownRef, viewRef, onChangeRef),
    })
    view.setState(newState)
  }, [language, readOnly, themeVersion])

  return <div ref={containerRef} className={`cm-editor-wrap ${className}`} />
}

export { EditorView } from '@codemirror/view'
export type { Extension } from '@codemirror/state'
