/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import { useState, useEffect } from 'react'
import { Button } from '@primitives'

interface UpdateInfo {
  version: string
  releaseNotes: string
  downloadURL: string
}

interface UpdateDialogProps {
  currentVersion: string
  onClose: () => void
}

export function UpdateDialog({ currentVersion, onClose }: UpdateDialogProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkForUpdates()
  }, [])

  async function checkForUpdates() {
    setIsChecking(true)
    setError(null)
    try {
      const response = await fetch(
        'https://api.github.com/repos/DBSutra/DBSutra/releases/latest',
      )
      if (!response.ok) throw new Error('Failed to check for updates')
      const release = await response.json()
      const latestVersion = release.tag_name.replace('v', '')
      const current = currentVersion.replace('v', '')
      if (isNewerVersion(current, latestVersion)) {
        const platform = getPlatform()
        const asset = release.assets?.find((a: { name: string }) =>
          a.name.toLowerCase().includes(platform),
        )
        setUpdateInfo({
          version: latestVersion,
          releaseNotes: release.body || 'No release notes available.',
          downloadURL: asset?.browser_download_url || release.html_url,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsChecking(false)
    }
  }

  function isNewerVersion(current: string, latest: string): boolean {
    const parse = (v: string) => v.split('.').map(Number)
    const c = parse(current)
    const l = parse(latest)
    for (let i = 0; i < 3; i++) {
      if ((l[i] || 0) > (c[i] || 0)) return true
      if ((l[i] || 0) < (c[i] || 0)) return false
    }
    return false
  }

  function getPlatform(): string {
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('mac')) return 'macos'
    if (ua.includes('win')) return 'windows'
    return 'linux'
  }

  if (isChecking) {
    return (
      <div className="update-dialog">
        <div className="update-dialog-header">
          <h3>Checking for updates...</h3>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="update-dialog">
        <div className="update-dialog-header">
          <h3>Update Check Failed</h3>
        </div>
        <div className="update-dialog-body">
          <p>{error}</p>
          <div className="update-actions">
            <Button onClick={checkForUpdates}>Retry</Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!updateInfo) {
    return (
      <div className="update-dialog">
        <div className="update-dialog-header">
          <h3>You're up to date!</h3>
        </div>
        <div className="update-dialog-body">
          <p>DBSutra v{currentVersion} is the latest version.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="update-dialog">
      <div className="update-dialog-header">
        <h3>Update Available</h3>
        <span>v{updateInfo.version}</span>
      </div>
      <div className="update-dialog-body">
        <p>Current: v{currentVersion}</p>
        <div className="update-notes">
          <h4>Release Notes</h4>
          {updateInfo.releaseNotes.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <div className="update-actions">
          <Button onClick={() => window.open(updateInfo.downloadURL, '_blank')}>
            Download Update
          </Button>
          <Button variant="ghost" onClick={onClose}>Remind Me Later</Button>
        </div>
      </div>
    </div>
  )
}
