import React, { useMemo, useState } from 'react';
import type { VersionSelectorProps } from '../../types/version-management-ui-types.js';

/**
 * VersionSelector component for browsing and selecting tool versions
 * Provides filtering, installation, and version management capabilities
 */
export const VersionSelector: React.FC<VersionSelectorProps> = ({
  tool,
  versions,
  selectedVersion,
  onVersionSelect,
  onVersionInstall,
  onVersionUninstall,
  filters,
  onFiltersChange,
  disabled = false,
  isLoading = false,
  error,
}) => {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  // Filter versions based on current filters
  const filteredVersions = useMemo(() => {
    return versions.filter((version) => {
      // Search query filter
      if (filters.searchQuery && !version.version.toLowerCase().includes(filters.searchQuery.toLowerCase())) {
        return false;
      }

      // Installed filter
      if (filters.showOnlyInstalled && !version.isInstalled) {
        return false;
      }

      // LTS filter
      if (filters.showOnlyLTS && !version.isLTS) {
        return false;
      }

      // Prerelease filter
      if (!filters.showPrerelease && version.isPrerelease) {
        return false;
      }

      // Version range filter
      if (filters.versionRange) {
        const versionNumber = version.version.replace(/[^\d.]/g, '');
        if (filters.versionRange.min && versionNumber < filters.versionRange.min) {
          return false;
        }
        if (filters.versionRange.max && versionNumber > filters.versionRange.max) {
          return false;
        }
      }

      return true;
    });
  }, [versions, filters]);

  const handleVersionClick = (version: string) => {
    if (!disabled) {
      onVersionSelect(tool, version);
    }
  };

  const handleInstallClick = (event: React.MouseEvent, version: string) => {
    event.stopPropagation();
    onVersionInstall(tool, version);
  };

  const handleUninstallClick = (event: React.MouseEvent, version: string) => {
    event.stopPropagation();
    onVersionUninstall(tool, version);
  };

  const handleExpandClick = (event: React.MouseEvent, version: string) => {
    event.stopPropagation();
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  const handleFilterChange = (key: keyof typeof filters, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 font-medium">Error loading versions</span>
        </div>
        <p className="text-red-700 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-secondary-200 rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-secondary-200">
        <h3 className="text-lg font-medium text-secondary-900">
          {tool.charAt(0).toUpperCase() + tool.slice(1)} Versions
        </h3>
        <p className="text-sm text-secondary-600 mt-1">
          Select a version to use for {tool}
        </p>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-secondary-200 bg-secondary-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="version-search" className="block text-xs font-medium text-secondary-700 mb-1">
              Search Versions
            </label>
            <input
              id="version-search"
              type="text"
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              placeholder="e.g., 18.17"
              className="w-full px-3 py-1.5 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Filter Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showOnlyInstalled}
                onChange={(e) => handleFilterChange('showOnlyInstalled', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <span className="ml-2 text-sm text-secondary-700">Only installed</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showOnlyLTS}
                onChange={(e) => handleFilterChange('showOnlyLTS', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <span className="ml-2 text-sm text-secondary-700">LTS only</span>
            </label>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showPrerelease}
                onChange={(e) => handleFilterChange('showPrerelease', e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              />
              <span className="ml-2 text-sm text-secondary-700">Include pre-release</span>
            </label>
          </div>

          {/* Results count */}
          <div className="flex items-end">
            <span className="text-sm text-secondary-600">
              {filteredVersions.length} of {versions.length} versions
            </span>
          </div>
        </div>
      </div>

      {/* Version List */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-secondary-600 mt-2">Loading versions...</p>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-secondary-600 mt-2">No versions found</p>
            <p className="text-secondary-500 text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-200">
            {filteredVersions.map((version) => (
              <div
                key={version.version}
                className={`p-4 hover:bg-secondary-50 cursor-pointer transition-colors ${
                  selectedVersion === version.version ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleVersionClick(version.version)}
                data-testid={`version-${version.version}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* Version Info */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-secondary-900">
                          {version.displayName || version.version}
                        </span>
                        
                        {/* Badges */}
                        <div className="flex items-center space-x-1">
                          {version.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                          {version.isLTS && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              LTS
                            </span>
                          )}
                          {version.isPrerelease && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pre-release
                            </span>
                          )}
                          {version.isRecommended && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                              Recommended
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Additional Info */}
                      <div className="flex items-center space-x-4 text-xs text-secondary-500 mt-1">
                        {version.releaseDate && (
                          <span>Released {version.releaseDate.toLocaleDateString()}</span>
                        )}
                        {version.size && <span>{version.size}</span>}
                        {version.estimatedInstallTime && <span>~{version.estimatedInstallTime} to install</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Installation Progress */}
                    {version.installationStatus === 'installing' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-blue-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${version.installationProgress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-blue-600">
                          {version.installationProgress || 0}%
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {version.isInstalled ? (
                      <button
                        onClick={(e) => handleUninstallClick(e, version.version)}
                        disabled={disabled || version.installationStatus === 'installing'}
                        className="text-red-600 hover:text-red-700 focus:outline-none focus:underline text-xs font-medium disabled:opacity-50"
                      >
                        Uninstall
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleInstallClick(e, version.version)}
                        disabled={disabled || version.installationStatus === 'installing'}
                        className="text-primary-600 hover:text-primary-700 focus:outline-none focus:underline text-xs font-medium disabled:opacity-50"
                      >
                        {version.installationStatus === 'installing' ? 'Installing...' : 'Install'}
                      </button>
                    )}

                    {/* Expand Button */}
                    <button
                      onClick={(e) => handleExpandClick(e, version.version)}
                      className="text-secondary-400 hover:text-secondary-600 focus:outline-none"
                      aria-label={`${expandedVersion === version.version ? 'Collapse' : 'Expand'} details for ${version.version}`}
                    >
                      <svg 
                        className={`h-4 w-4 transform transition-transform ${expandedVersion === version.version ? 'rotate-180' : ''}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedVersion === version.version && (
                  <div className="mt-3 pt-3 border-t border-secondary-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-secondary-900 mb-2">Version Details</h4>
                        <dl className="space-y-1">
                          <div className="flex justify-between">
                            <dt className="text-secondary-500">Manager:</dt>
                            <dd className="text-secondary-900">{version.manager}</dd>
                          </div>
                          {version.installationPath && (
                            <div className="flex justify-between">
                              <dt className="text-secondary-500">Path:</dt>
                              <dd className="text-secondary-900 font-mono text-xs truncate">{version.installationPath}</dd>
                            </div>
                          )}
                          {version.endOfLife && (
                            <div className="flex justify-between">
                              <dt className="text-secondary-500">End of Life:</dt>
                              <dd className="text-secondary-900">{version.endOfLife.toLocaleDateString()}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                      
                      {version.installationError && (
                        <div>
                          <h4 className="font-medium text-red-900 mb-2">Installation Error</h4>
                          <p className="text-red-700 text-xs bg-red-50 p-2 rounded">
                            {version.installationError}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 