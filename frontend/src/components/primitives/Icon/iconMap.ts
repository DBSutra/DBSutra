/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import {
  Database, Search, Settings, History, Puzzle, Plus, X,
  ChevronRight, ChevronDown, ChevronLeft, ChevronUp, ChevronsLeft, ChevronsRight,
  Play, Square, FileText, FilePlus, Table2, Columns3, Key, Circle,
  AlertTriangle, AlertCircle, Check, CheckCircle, Loader2, Command, Palette,
  Sun, Moon, Monitor, Plug, PlugZap, Server, HardDrive, RefreshCw,
  Trash2, Copy, Download, Filter, SortAsc, SortDesc,
  PanelLeft, PanelBottom, LayoutGrid, Code2, Terminal,
  Pencil, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown,
  Maximize2, Minimize2, MoreHorizontal, Zap, Type, Layout,
  Keyboard, Paintbrush, Rows3, MousePointerClick, Workflow,
  type LucideIcon,
} from 'lucide-react'

/** Map of icon names to Lucide components. */
export const ICON_MAP: Record<string, LucideIcon> = {
  database: Database, search: Search, settings: Settings, history: History,
  puzzle: Puzzle, plus: Plus, x: X, close: X,
  'chevron-right': ChevronRight, 'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft, 'chevron-up': ChevronUp,
  'chevrons-left': ChevronsLeft, 'chevrons-right': ChevronsRight,
  play: Play, stop: Square, file: FileText, 'file-plus': FilePlus,
  table: Table2, columns: Columns3, key: Key, circle: Circle,
  warning: AlertTriangle, check: Check, 'check-circle': CheckCircle,
  loader: Loader2, command: Command, palette: Palette,
  sun: Sun, moon: Moon, monitor: Monitor, plug: Plug, 'plug-zap': PlugZap,
  server: Server, 'hard-drive': HardDrive, refresh: RefreshCw,
  trash: Trash2, save: Plus, copy: Copy, download: Download,
  filter: Filter, 'sort-asc': SortAsc, 'sort-desc': SortDesc,
  'panel-left': PanelLeft, 'panel-bottom': PanelBottom,
  'layout-grid': LayoutGrid, code: Code2, terminal: Terminal,
  edit: Pencil, pencil: Pencil, eye: Eye, 'eye-off': EyeOff,
  lock: Lock, unlock: Unlock, 'arrow-up': ArrowUp, 'arrow-down': ArrowDown,
  maximize: Maximize2, minimize: Minimize2, more: MoreHorizontal,
  zap: Zap, type: Type, layout: Layout, keyboard: Keyboard,
  paintbrush: Paintbrush, 'rows-3': Rows3,
  'alert-circle': AlertCircle, 'mouse-pointer-click': MousePointerClick,
  'trash-2': Trash2, workflow: Workflow,
}
