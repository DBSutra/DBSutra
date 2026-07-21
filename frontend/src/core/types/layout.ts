/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
// ── Layout Types ─────────────────────────────────────────────────────
export type LayoutNode =
  | { type: 'row';    children: LayoutNode[]; sizes?: number[] }
  | { type: 'column'; children: LayoutNode[]; sizes?: number[] }
  | { type: 'panel';  id: string; title?: string; icon?: string; visible?: boolean }
