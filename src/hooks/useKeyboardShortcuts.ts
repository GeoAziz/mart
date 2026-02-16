'use client';

import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook to register keyboard shortcuts
 * Usage:
 * useKeyboardShortcuts([
 *   { key: 'n', ctrlKey: true, action: () => router.push('/vendor/products/add'), description: 'Add new product' },
 *   { key: 'k', ctrlKey: true, action: () => setSearchOpen(true), description: 'Open search' },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === event.ctrlKey;
        const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === event.shiftKey;
        const altMatch = shortcut.altKey === undefined || shortcut.altKey === event.altKey;
        const metaMatch = shortcut.metaKey === undefined || shortcut.metaKey === event.metaKey;
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts for vendor dashboard
 */
export const VENDOR_SHORTCUTS = {
  ADD_PRODUCT: { key: 'n', ctrlKey: true, description: 'Add new product' },
  SEARCH: { key: 'k', ctrlKey: true, description: 'Open search' },
  CLOSE_MODAL: { key: 'Escape', description: 'Close dialog/modal' },
  HELP: { key: '?', shiftKey: true, description: 'Show keyboard shortcuts' },
} as const;
