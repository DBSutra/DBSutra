/*
 * Copyright (C) 2024-2026 DBSutra. All rights reserved.
 * Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).
 * See LICENSE file in the project root for full license information.
 */
import React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { Icon } from '../Icon/Icon';
import './ContextMenu.css';

export interface ContextMenuItemProps {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  onSelect?: () => void;
  shortcut?: string;
}

export interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItemProps[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ children, items }) => {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        {children}
      </ContextMenuPrimitive.Trigger>

      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="context-menu-content">
          {items.map((item) => (
            <ContextMenuPrimitive.Item
              key={item.id}
              className="context-menu-item"
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              <div className="context-menu-item-left">
                {item.icon && <Icon name={item.icon} size={14} className="context-menu-item-icon" />}
                <span className="context-menu-item-label">{item.label}</span>
              </div>
              {item.shortcut && (
                <div className="context-menu-item-shortcut">{item.shortcut}</div>
              )}
            </ContextMenuPrimitive.Item>
          ))}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
};
