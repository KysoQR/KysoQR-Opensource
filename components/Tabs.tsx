'use client';

import type { KeyboardEventHandler } from 'react';

/** Element id of a tab button — use for a panel's aria-labelledby. */
const tabId = (idPrefix: string, id: string) => `${idPrefix}-tab-${id}`;

/**
 * Ported verbatim from x-sign-web/src/components/Tabs.tsx.
 *
 * Accessible tab strip (pill style). Implements the roving-tabindex pattern:
 * only the selected tab is focusable, and Arrow Left/Right move between tabs
 * with wraparound.
 *
 * Renders the tab strip only — pair each panel with `role="tabpanel"`,
 * `id={tab.panelId}` and `aria-labelledby={tabId(...)}`.
 */

export type TabItem<TId extends string> = {
  id: TId;
  label: string;
  /** id of the element holding this tab's content, for aria-controls */
  panelId: string;
};

export type TabsProps<TId extends string> = {
  tabs: TabItem<TId>[];
  value: TId;
  onChange: (id: TId) => void;
  /** Namespace for generated tab element ids, so multiple strips can coexist. */
  idPrefix: string;
  ariaLabel: string;
  className?: string;
};

export function Tabs<TId extends string>({
  tabs,
  value,
  onChange,
  idPrefix,
  ariaLabel,
  className = '',
}: TabsProps<TId>) {
  const handleKeyDown: KeyboardEventHandler<HTMLButtonElement> = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();

    const currentIndex = tabs.findIndex((tab) => tab.id === value);
    if (currentIndex === -1) return;

    const direction = e.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
    onChange(tabs[nextIndex]!.id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex rounded-full bg-gray-200 p-1 text-xs sm:text-sm ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={selected}
            aria-controls={tab.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={handleKeyDown}
            className={`relative min-w-24 rounded-full px-4 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              selected ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
