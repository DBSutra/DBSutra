/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionContextAPI } from '@core/extensions'
import postgresManifest from './manifest.json'
import { SchemaExplorer } from './components/SchemaExplorer'
import { QueryEditor } from './components/QueryEditor'
import { ResultViewer } from './components/ResultViewer'

export const manifest = postgresManifest

export function activate(ctx: ExtensionContextAPI): void {
  console.info('[postgres] PostgreSQL extension activating...')

  ctx.registerDatabase({
    type: 'postgres',
    label: 'PostgreSQL',
    icon: 'postgres',
    defaultPort: 5432,
    queryLanguage: 'sql',
    supportsSSH: true,
    supportsSSL: true,
    connectionForm: (() => null) as any,
  })

  ctx.registerView('schema-explorer', {
    title: 'Schema Explorer',
    icon: 'database',
    location: 'sidebar',
    group: 'database',
    order: 2,
    component: SchemaExplorer as any,
  })

  ctx.registerView('query-editor', {
    title: 'Query Editor',
    icon: 'code',
    location: 'editor',
    component: QueryEditor as any,
  })

  ctx.registerView('results-viewer', {
    title: 'Results',
    icon: 'table',
    location: 'panel',
    order: 2,
    component: ResultViewer as any,
  })

  ctx.registerCommand('newQuery', () => {}, { title: 'New PostgreSQL Query', category: 'PostgreSQL' })
  ctx.registerCommand('refreshSchema', () => {}, { title: 'Refresh Schema', category: 'PostgreSQL' })

  console.info('[postgres] PostgreSQL extension activated')
}
