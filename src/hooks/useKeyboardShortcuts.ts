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
        // Check each modifier explicitly - if undefined, it must NOT be pressed
        const ctrlMatch = shortcut.ctrlKey === undefined 
          ? !event.ctrlKey && !event.metaKey  // If not specified, Ctrl/Meta must NOT be pressed
          : (event.ctrlKey || event.metaKey) === shortcut.ctrlKey;
        
        const shiftMatch = shortcut.shiftKey === undefined 
          ? !event.shiftKey  // If not specified, Shift must NOT be pressed
          : event.shiftKey === shortcut.shiftKey;
        
        const altMatch = shortcut.altKey === undefined 
          ? !event.altKey  // If not specified, Alt must NOT be pressed
          : event.altKey === shortcut.altKey;
        
        const metaMatch = shortcut.metaKey === undefined 
          ? true  // Meta is optional, handle via ctrlKey for cross-platform
          : event.metaKey === shortcut.metaKey;
        
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
