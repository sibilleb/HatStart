/**
 * Tabbed Layout Component
 * Provides tab navigation for different sections of the application
 */

import React, { useState } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface TabbedLayoutProps {
  tabs: Tab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  children: Record<string, React.ReactNode>;
}

export const TabbedLayout: React.FC<TabbedLayoutProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  children
}) => {
  const [localActiveTab, setLocalActiveTab] = useState(activeTabId || tabs[0]?.id || '');
  const activeTab = activeTabId || localActiveTab;

  const handleTabClick = (tabId: string) => {
    setLocalActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                transition-colors duration-200
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon && (
                <span className="mr-2 text-lg">{tab.icon}</span>
              )}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`
                    ml-2 py-0.5 px-2 rounded-full text-xs font-medium
                    ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                    }
                  `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {children[activeTab] || (
          <div className="text-center py-12 text-gray-500">
            No content available for this tab
          </div>
        )}
      </div>
    </div>
  );
};