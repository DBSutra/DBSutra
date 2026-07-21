/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionContext } from '@extensions/host/ExtensionContext'
import { DEFAULT_QUERY_CONTENT } from '@shared/constants/defaults'
import { SchemaExplorer } from './components/schema'
import { QueryEditor } from './components/query'
import { ResultViewer } from './components/result'

export function activate(ctx: ExtensionContext): void {
  ctx.registerCommand('newQuery', () => {
    ctx.getState().openTab({
      title: 'Query',
      language: 'sql',
      content: DEFAULT_QUERY_CONTENT,
      isDirty: false,
    })
  }, { title: 'MySQL: New Query', category: 'MySQL', keybinding: 'Ctrl+N' })

  ctx.registerCommand('refreshSchema', async () => {
    const state = ctx.getState()
    const connections = Object.keys(state.activeConnections)
    for (const connId of connections) {
      ctx.emit('schema.refresh', { connId })
    }
  }, { title: 'MySQL: Refresh Schema', category: 'MySQL' })

  ctx.registerView('sidebar', { title: 'Explorer', icon: 'database', component: SchemaExplorer, location: 'sidebar' })
  ctx.registerView('editor', { title: 'Query Editor', icon: 'code', component: QueryEditor, location: 'editor' })
  ctx.registerView('results', { title: 'Results', icon: 'table', component: ResultViewer, location: 'bottom' })
}
