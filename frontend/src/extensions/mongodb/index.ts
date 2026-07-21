/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import type { ExtensionContextAPI } from '@core/extensions'
import mongodbManifest from './manifest.json'
import { CollectionBrowser } from './components/CollectionBrowser'
import { QueryEditor } from './components/QueryEditor'
import { ResultViewer } from './components/ResultViewer'

export const manifest = mongodbManifest

export function activate(ctx: ExtensionContextAPI): void {
  console.info('[mongodb] MongoDB extension activating...')

  ctx.registerDatabase({
    type: 'mongodb',
    label: 'MongoDB',
    icon: 'mongodb',
    defaultPort: 27017,
    queryLanguage: 'mongodb',
    supportsSSH: true,
    supportsSSL: true,
    connectionForm: (() => null) as any,
  })

  ctx.registerView('collection-browser', { title: 'Collections', icon: 'database', location: 'sidebar', group: 'database', order: 4, component: CollectionBrowser as any })
  ctx.registerView('query-editor', { title: 'Query Editor', icon: 'code', location: 'editor', component: QueryEditor as any })
  ctx.registerView('results-viewer', { title: 'Results', icon: 'table', location: 'panel', order: 4, component: ResultViewer as any })

  ctx.registerCommand('newQuery', () => {}, { title: 'New MongoDB Query', category: 'MongoDB' })
  ctx.registerCommand('refreshSchema', () => {}, { title: 'Refresh Collections', category: 'MongoDB' })

  console.info('[mongodb] MongoDB extension activated')
}
