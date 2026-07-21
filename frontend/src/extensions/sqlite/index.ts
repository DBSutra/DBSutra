/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionContextAPI } from '@core/extensions'
import sqliteManifest from './manifest.json'
import { SchemaExplorer } from './components/SchemaExplorer'
import { QueryEditor } from './components/QueryEditor'
import { ResultViewer } from './components/ResultViewer'

export const manifest = sqliteManifest

export function activate(ctx: ExtensionContextAPI): void {
  console.info('[sqlite] SQLite extension activating...')

  ctx.registerDatabase({
    type: 'sqlite',
    label: 'SQLite',
    icon: 'sqlite',
    defaultPort: 0,
    queryLanguage: 'sql',
    supportsSSH: false,
    supportsSSL: false,
    connectionForm: (() => null) as any,
  })

  ctx.registerView('schema-explorer', { title: 'Schema Explorer', icon: 'database', location: 'sidebar', group: 'database', order: 3, component: SchemaExplorer as any })
  ctx.registerView('query-editor', { title: 'Query Editor', icon: 'code', location: 'editor', component: QueryEditor as any })
  ctx.registerView('results-viewer', { title: 'Results', icon: 'table', location: 'panel', order: 3, component: ResultViewer as any })

  ctx.registerCommand('newQuery', () => {}, { title: 'New SQLite Query', category: 'SQLite' })
  ctx.registerCommand('refreshSchema', () => {}, { title: 'Refresh Schema', category: 'SQLite' })

  console.info('[sqlite] SQLite extension activated')
}
