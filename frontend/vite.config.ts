/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.WAILS_VITE_PORT) || 9245,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@primitives': path.resolve(__dirname, 'src/components/primitives'),
      '@base': path.resolve(__dirname, 'src/components/base'),
      '@chrome': path.resolve(__dirname, 'src/components/chrome'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@editor': path.resolve(__dirname, 'src/features/editor'),
      '@panels': path.resolve(__dirname, 'src/features/panels'),
      '@extensions': path.resolve(__dirname, 'src/features/extensions'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@bindings': path.resolve(__dirname, 'bindings'),
      '@wails': path.resolve(__dirname, 'wailsjs'),
    },
  },
})
