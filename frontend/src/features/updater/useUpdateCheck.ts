/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE CHECK HOOK — checks for application updates with debounce
// ══════════════════════════════════════════════════════════════════════════════

export interface UpdateInfo {
  version: string
  releaseNotes: string
  downloadURL: string
  checksum: string
  publishedAt: string
}

export interface UseUpdateCheckResult {
  updateAvailable: boolean
  updateInfo: UpdateInfo | null
  isChecking: boolean
  error: string | null
  dismiss: () => void
  skipVersion: () => void
  checkNow: () => void
}

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour
const STORAGE_KEY_SKIP = 'updater_skipped_version'
const STORAGE_KEY_LAST_CHECK = 'updater_last_check'

function getLastCheckTime(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_LAST_CHECK)
    return val ? parseInt(val, 10) || 0 : 0
  } catch {
    return 0
  }
}

function setLastCheckTime(): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_CHECK, String(Date.now()))
  } catch {
    // ignore storage errors
  }
}

function getSkippedVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_SKIP)
  } catch {
    return null
  }
}

function setSkippedVersion(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_SKIP, version)
  } catch {
    // ignore storage errors
  }
}

/**
 * Custom hook that checks for application updates on mount.
 * Debounces checks to once per hour. Respects "skip version" preference.
 *
 * Uses the Wails-bound UpdateService on the Go backend.
 * Falls back to a direct GitHub API call if the backend is unavailable.
 */
export function useUpdateCheck(): UseUpdateCheckResult {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const dismiss = useCallback(() => {
    setUpdateAvailable(false)
  }, [])

  const skipVersion = useCallback(() => {
    if (updateInfo) {
      setSkippedVersion(updateInfo.version)
    }
    setUpdateAvailable(false)
    setUpdateInfo(null)
  }, [updateInfo])

  const doCheck = useCallback(async () => {
    // Debounce: don't check more than once per hour
    const lastCheck = getLastCheckTime()
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) {
      return
    }

    setIsChecking(true)
    setError(null)

    try {
      // Try Wails-bound service first
      const info = await checkViaWails()

      if (!mountedRef.current) return

      setLastCheckTime()

      if (!info) {
        // No update available
        setUpdateAvailable(false)
        setUpdateInfo(null)
        return
      }

      // Check if user skipped this version
      const skipped = getSkippedVersion()
      if (skipped === info.version) {
        setUpdateAvailable(false)
        setUpdateInfo(null)
        return
      }

      setUpdateInfo(info)
      setUpdateAvailable(true)
    } catch (err) {
      if (!mountedRef.current) return
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      console.warn('[Updater] Check failed:', message)
    } finally {
      if (mountedRef.current) {
        setIsChecking(false)
      }
    }
  }, [])

  const checkNow = useCallback(() => {
    // Force check by clearing last check time
    try {
      localStorage.removeItem(STORAGE_KEY_LAST_CHECK)
    } catch {
      // ignore
    }
    doCheck()
  }, [doCheck])

  useEffect(() => {
    mountedRef.current = true
    doCheck()
    return () => {
      mountedRef.current = false
    }
  }, [doCheck])

  return {
    updateAvailable,
    updateInfo,
    isChecking,
    error,
    dismiss,
    skipVersion,
    checkNow,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Backend communication
// ══════════════════════════════════════════════════════════════════════════════

const GITHUB_OWNER = 'DBSutra'
const GITHUB_REPO = 'DBSutra'

interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  prerelease: boolean
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
}

/**
 * Attempts to check for updates via the Wails-bound Go service.
 * Returns null if no update is available, or UpdateInfo if one is.
 * Throws on network/API errors.
 */
async function checkViaWails(): Promise<UpdateInfo | null> {
  // Check if Wails runtime is available
  const win = window as unknown as Record<string, unknown>
  const wails = win['go'] as Record<string, unknown> | undefined
  if (wails?.['update'] && typeof (wails['update'] as Record<string, unknown>)['CheckForUpdates'] === 'function') {
    try {
      const updateSvc = wails['update'] as Record<string, unknown>
      const result = await (updateSvc['CheckForUpdates'] as Function)()
      return result as UpdateInfo | null
    } catch {
      // Fall through to direct API call
    }
  }

  // Fallback: direct GitHub API call
  return checkViaGitHubAPI()
}

/**
 * Direct GitHub API fallback for environments where the Go backend
 * is not available (e.g., during development).
 */
async function checkViaGitHubAPI(): Promise<UpdateInfo | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`
  const resp = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  })

  if (!resp.ok) {
    throw new Error(`GitHub API returned ${resp.status}`)
  }

  const releases: GitHubRelease[] = await resp.json()
  if (!releases.length) {
    return null
  }

  // Find latest non-prerelease
  const release = releases.find((r) => !r.prerelease) ?? releases[0]

  // Get current version from the page or a known constant
  const currentVersion = getAppVersion()

  if (!isVersionNewer(currentVersion, release.tag_name)) {
    return null
  }

  // Pick platform-appropriate asset
  const asset = pickAsset(release.assets)

  return {
    version: release.tag_name,
    releaseNotes: release.body,
    downloadURL: asset?.browser_download_url ?? release.html_url,
    checksum: '',
    publishedAt: release.published_at,
  }
}

function getAppVersion(): string {
  // Try to get version from the page meta or a global
  const meta = document.querySelector('meta[name="app-version"]')
  if (meta) return meta.getAttribute('content') ?? '0.0.0'
  return '0.0.0'
}

/**
 * Simple semantic version comparison.
 * Returns true if latest > current.
 */
function isVersionNewer(current: string, latest: string): boolean {
  const parse = (v: string): [number, number, number] => {
    const cleaned = v.replace(/^v/i, '').split(/[+-]/)[0]
    const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0)
    while (parts.length < 3) parts.push(0)
    return [parts[0], parts[1], parts[2]]
  }

  const [cm, ci, cp] = parse(current)
  const [lm, li, lp] = parse(latest)

  if (lm !== cm) return lm > cm
  if (li !== ci) return li > ci
  return lp > cp
}

interface AssetPick {
  name: string
  browser_download_url: string
  size: number
}

function pickAsset(assets: AssetPick[]): AssetPick | null {
  if (!assets.length) return null

  const ua = navigator.userAgent.toLowerCase()
  const isMac = ua.includes('mac')
  const isWin = ua.includes('win')
  const isLinux = ua.includes('linux')

  // First pass: OS + arch match
  for (const asset of assets) {
    const name = asset.name.toLowerCase()
    const osMatch =
      (isMac && (name.includes('darwin') || name.includes('macos'))) ||
      (isWin && (name.includes('windows') || name.includes('win'))) ||
      (isLinux && name.includes('linux'))
    if (osMatch) return asset
  }

  // Fallback: first asset
  return assets[0]
}
