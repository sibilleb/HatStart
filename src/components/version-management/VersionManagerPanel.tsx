import React, { useState } from 'react';
import type { VersionManagerPanelProps } from '../../types/version-management-ui-types.js';
import { VersionManagerCard } from './VersionManagerCard.js';
import { VersionSelector } from './VersionSelector.js';

/**
 * VersionManagerPanel component provides the main interface for version management
 * Includes manager selection, tool selection, and version management capabilities
 */
export const VersionManagerPanel: React.FC<VersionManagerPanelProps> = ({
  managers,
  tools,
  toolVersions,
  selectedTool,
  onToolSelect,
  onManagerOperation,
  onVersionOperation,
  operationStatuses,
  isVisible,
  onClose,
}) => {
  const [selectedManagers, setSelectedManagers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'managers' | 'versions'>('managers');
  const [versionFilters, setVersionFilters] = useState({
    showOnlyInstalled: false,
    showOnlyLTS: false,
    showPrerelease: false,
    searchQuery: '',
  });

  if (!isVisible) {
    return null;
  }

  const handleManagerToggle = (managerType: string, selected: boolean) => {
    const newSelection = new Set(selectedManagers);
    if (selected) {
      newSelection.add(managerType);
    } else {
      newSelection.delete(managerType);
    }
    setSelectedManagers(newSelection);
  };

  const handleManagerInstall = (managerType: string) => {
    onManagerOperation('install-manager', managerType as any);
  };

  const handleManagerConfigure = (managerType: string) => {
    onManagerOperation('configure-manager', managerType as any);
  };

  const handleVersionSelect = (tool: string, version: string) => {
    onVersionOperation('switch-version', tool as any, version);
  };

  const handleVersionInstall = (tool: string, version: string) => {
    onVersionOperation('install-version', tool as any, version);
  };

  const handleVersionUninstall = (tool: string, version: string) => {
    onVersionOperation('uninstall-version', tool as any, version);
  };

  const getSelectedVersionForTool = (tool: string) => {
    const versions = toolVersions[tool as keyof typeof toolVersions];
    return versions?.find(v => v.isActive)?.version;
  };

  const installedManagers = managers.filter(m => m.status !== 'not_installed');
  const availableManagers = managers.filter(m => m.status === 'not_installed');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
            <div>
              <h2 className="text-xl font-semibold text-secondary-900">Version Management</h2>
              <p className="text-sm text-secondary-600 mt-1">
                Manage programming language versions and version managers
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-secondary-400 hover:text-secondary-600 focus:outline-none"
              aria-label="Close version management panel"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-secondary-200">
            <button
              onClick={() => setActiveTab('managers')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'managers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700'
              }`}
            >
              Version Managers
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700">
                {installedManagers.length}/{managers.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('versions')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'versions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700'
              }`}
            >
              Tool Versions
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700">
                {tools.length}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'managers' ? (
              <div className="h-full flex flex-col">
                {/* Managers Header */}
                <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-secondary-900">Version Managers</h3>
                      <p className="text-sm text-secondary-600 mt-1">
                        Install and configure version managers for different programming languages
                      </p>
                    </div>
                    {selectedManagers.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-secondary-600">
                          {selectedManagers.size} selected
                        </span>
                        <button
                          onClick={() => setSelectedManagers(new Set())}
                          className="text-sm text-secondary-500 hover:text-secondary-700 focus:outline-none focus:underline"
                        >
                          Clear selection
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Managers List */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Installed Managers */}
                  {installedManagers.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-md font-medium text-secondary-900 mb-4">
                        Installed Managers ({installedManagers.length})
                      </h4>
                      <div className="space-y-3">
                        {installedManagers.map((manager) => (
                          <VersionManagerCard
                            key={manager.type}
                            manager={manager}
                            isSelected={selectedManagers.has(manager.type)}
                            onToggle={handleManagerToggle}
                            onInstall={handleManagerInstall}
                            onConfigure={handleManagerConfigure}
                            operationStatus={operationStatuses[`manager-${manager.type}`]}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Managers */}
                  {availableManagers.length > 0 && (
                    <div>
                      <h4 className="text-md font-medium text-secondary-900 mb-4">
                        Available Managers ({availableManagers.length})
                      </h4>
                      <div className="space-y-3">
                        {availableManagers.map((manager) => (
                          <VersionManagerCard
                            key={manager.type}
                            manager={manager}
                            isSelected={false}
                            onToggle={handleManagerToggle}
                            onInstall={handleManagerInstall}
                            onConfigure={handleManagerConfigure}
                            operationStatus={operationStatuses[`manager-${manager.type}`]}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {managers.length === 0 && (
                    <div className="text-center py-12">
                      <svg className="mx-auto h-12 w-12 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-secondary-900">No version managers found</h3>
                      <p className="mt-1 text-sm text-secondary-500">
                        Version managers will appear here once detected or installed.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex">
                {/* Tool Selection Sidebar */}
                <div className="w-64 border-r border-secondary-200 bg-secondary-50">
                  <div className="p-4 border-b border-secondary-200">
                    <h3 className="text-md font-medium text-secondary-900">Tools</h3>
                    <p className="text-sm text-secondary-600 mt-1">
                      Select a tool to manage versions
                    </p>
                  </div>
                  <div className="overflow-y-auto">
                    {tools.map((tool) => {
                      const versions = toolVersions[tool];
                      const installedCount = versions?.filter(v => v.isInstalled).length || 0;
                      const activeVersion = versions?.find(v => v.isActive);
                      
                      return (
                        <button
                          key={tool}
                          onClick={() => onToolSelect(tool)}
                          className={`w-full text-left px-4 py-3 border-b border-secondary-200 hover:bg-white transition-colors ${
                            selectedTool === tool ? 'bg-white border-l-4 border-primary-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium text-secondary-900 capitalize">
                                {tool}
                              </h4>
                              {activeVersion && (
                                <p className="text-xs text-secondary-600 mt-1">
                                  Active: {activeVersion.version}
                                </p>
                              )}
                            </div>
                            {installedCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                {installedCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Version Management Content */}
                <div className="flex-1 overflow-hidden">
                  {selectedTool ? (
                    <VersionSelector
                      tool={selectedTool}
                      versions={toolVersions[selectedTool] || []}
                      selectedVersion={getSelectedVersionForTool(selectedTool)}
                      onVersionSelect={handleVersionSelect}
                      onVersionInstall={handleVersionInstall}
                      onVersionUninstall={handleVersionUninstall}
                      filters={versionFilters}
                      onFiltersChange={setVersionFilters}
                      isLoading={operationStatuses[`versions-${selectedTool}`]?.status === 'running'}
                      error={operationStatuses[`versions-${selectedTool}`]?.error}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-secondary-900">Select a tool</h3>
                        <p className="mt-1 text-sm text-secondary-500">
                          Choose a programming language or tool from the sidebar to manage its versions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 