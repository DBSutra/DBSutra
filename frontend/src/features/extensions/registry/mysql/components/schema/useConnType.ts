/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useAppStore } from '@core/state/store'
import { getConnectionType } from '@shared/utils'
import type { DatabaseType } from '@core/types'

/**
 * Hook to get the connection type for a given connection ID.
 * Returns 'mysql' as default if the connection type cannot be determined.
 */
export function useConnType(connId: string): DatabaseType {
  const activeConnections = useAppStore((s) => s.activeConnections)
  return getConnectionType(activeConnections, connId)
}
