/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React, { useRef, useEffect } from 'react'
import { useAppStore } from '@core/state/store'
import { DEFAULT_QUERY_CONTENT } from '@shared/constants/defaults'
import { Icon, IconButton } from '@primitives'
import './VirtualTabList.css'

export const VirtualTabList: React.FC = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null)

  const tabList = useAppStore(s => s.tabs)
  const activeTabId = useAppStore(s => s.activeTabId)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const closeTab = useAppStore(s => s.closeTab)
  const openTab = useAppStore(s => s.openTab)
  const renameTab = useAppStore(s => s.renameTab)

  const [editingTabId, setEditingTabId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState('')

  // Scroll to active tab when it changes
  useEffect(() => {
    if (!containerRef.current || !activeTabId) return
    const activeTabEl = containerRef.current.querySelector('.qe-tab-active') as HTMLElement
    if (!activeTabEl) return

    const container = containerRef.current
    const scrollLeft = container.scrollLeft
    const scrollRight = scrollLeft + container.clientWidth
    const tabLeft = activeTabEl.offsetLeft
    const tabRight = tabLeft + activeTabEl.offsetWidth

    if (tabLeft < scrollLeft) {
      container.scrollTo({ left: tabLeft, behavior: 'smooth' })
    } else if (tabRight > scrollRight) {
      container.scrollTo({ left: tabRight - container.clientWidth, behavior: 'smooth' })
    }
  }, [activeTabId, tabList])

  // Translate vertical scroll (mouse wheel) to horizontal scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // If the scroll is predominantly horizontal (like a trackpad swipe), 
      // do nothing and let the browser handle it natively for buttery smoothness!
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return
      }

      // Only intercept and translate predominantly vertical scrolling (like a standard mouse wheel)
      e.preventDefault()
      container.scrollBy({ left: e.deltaY, behavior: 'auto' })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const openNewTab = () => {
    openTab({
      title: 'Query',
      language: 'sql',
      content: DEFAULT_QUERY_CONTENT,
      isDirty: false,
    })
  }

  return (
    <div className="qe-tabbar">
      <div 
        className="qe-tabs-scroll" 
        ref={containerRef}
      >
        <div className="qe-tabs-inner">
          {tabList.map(tab => {
            const isEditing = editingTabId === tab.id
            return (
              <div
                key={tab.id}
                className={`qe-tab ${tab.id === activeTabId ? 'qe-tab-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onDoubleClick={() => {
                  setEditingTabId(tab.id)
                  setEditTitle(tab.title)
                }}
              >
                <Icon name={tab.language === 'sql' ? 'file' : 'code'} size={13} className="qe-tab-icon" />
                {isEditing ? (
                  <input
                    autoFocus
                    className="qe-tab-rename-input"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onBlur={() => {
                      renameTab(tab.id, editTitle.trim() || 'Query')
                      setEditingTabId(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') {
                        setEditingTabId(null)
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="qe-tab-title" title={tab.title}>{tab.title}</span>
                )}
                {tab.isDirty && !isEditing && <span className="qe-tab-dirty" />}
                <IconButton
                  icon="close"
                  size={12}
                  className="qe-tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <IconButton icon="plus" size={14} className="qe-new-tab" title="New Query Tab" onClick={openNewTab} />
    </div>
  )
})
