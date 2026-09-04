import React from 'react';

export interface ViewSwitcherTab<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface AdwViewSwitcherProps<T extends string = string> {
  tabs: ViewSwitcherTab<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export const AdwViewSwitcher = <T extends string>({
  tabs,
  activeTab,
  onChange,
  className = ''
}: AdwViewSwitcherProps<T>) => {
  return (
    <div className={`adw-view-switcher ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`adw-view-switcher-item ${isActive ? 'active' : ''}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
