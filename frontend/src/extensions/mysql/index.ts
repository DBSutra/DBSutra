/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionContextAPI } from '@core/extensions'
import mysqlManifest from './manifest.json'
import { SchemaExplorer } from './components/SchemaExplorer'
import { QueryEditor } from './components/QueryEditor'
import { ResultViewer } from './components/ResultViewer'

export const manifest = mysqlManifest

export function activate(ctx: ExtensionContextAPI): void {
  console.info('[mysql] MySQL extension activating...')

  // Register database type
  ctx.registerDatabase({
    type: 'mysql',
    label: 'MySQL',
    icon: 'mysql',
    defaultPort: 3306,
    queryLanguage: 'sql',
    supportsSSH: true,
    supportsSSL: true,
    connectionForm: (() => null) as any, // Will be replaced with actual component
  })

  // Register views
  ctx.registerView('schema-explorer', {
    title: 'Schema Explorer',
    icon: 'database',
    location: 'sidebar',
    group: 'database',
    order: 1,
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
    order: 1,
    component: ResultViewer as any,
  })

  // Register commands
  ctx.registerCommand('newQuery', () => {
    console.debug('[mysql] New query command')
  }, { title: 'New MySQL Query', category: 'MySQL' })

  ctx.registerCommand('refreshSchema', () => {
    console.debug('[mysql] Refresh schema command')
  }, { title: 'Refresh Schema', category: 'MySQL' })

  console.info('[mysql] MySQL extension activated — 3 views, 2 commands registered')
}
