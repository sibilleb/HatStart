import React from 'react';
import type { SelectionSummaryProps } from '../types/ui-types';

/**
 * SelectionSummary component displays a floating action panel
 * Shows selection summary and installation controls
 */
export const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  selection,
  tools,
  onInstallSelected,
  onClearSelection,
  onExportSelection,
  installationProgress,
  estimatedTime,
  estimatedSize,
  isVisible = true,
  position = 'bottom',
}) => {
  // Get selected tools data
  const selectedTools = tools.filter(tool => 
    selection.selectedTools.has(tool.id)
  );

  const selectedCount = selectedTools.length;
  const recommendedCount = selectedTools.filter(tool => tool.isRecommended).length;
  const alreadyInstalledCount = selectedTools.filter(tool => tool.isInstalled).length;
  const toInstallCount = selectedCount - alreadyInstalledCount;

  // Calculate totals
  const totalSize = selectedTools.reduce((total, tool) => {
    if (tool.isInstalled) return total;
    const sizeMatch = tool.size?.match(/(\d+(\.\d+)?)\s*(MB|GB)/i);
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[3].toUpperCase();
      return total + (unit === 'GB' ? value * 1024 : value);
    }
    return total;
  }, 0);

  const totalTime = selectedTools.reduce((total, tool) => {
    if (tool.isInstalled) return total;
    const timeMatch = tool.installationTime?.match(/(\d+)\s*min/i);
    if (timeMatch) {
      return total + parseInt(timeMatch[1]);
    }
    return total;
  }, 0);

  const formatSize = (sizeInMB: number): string => {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(sizeInMB)} MB`;
  };

  const formatTime = (timeInMin: number): string => {
    if (timeInMin >= 60) {
      const hours = Math.floor(timeInMin / 60);
      const minutes = timeInMin % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${timeInMin}m`;
  };

  if (!isVisible || selectedCount === 0) {
    return null;
  }

  const positionClasses = {
    bottom: 'fixed bottom-6 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    floating: 'sticky bottom-6 mx-auto',
  };

  return (
    <div 
      className={`${positionClasses[position]} z-50 max-w-md w-full mx-4 sm:mx-0`}
      role="region"
      aria-label="Selection summary and installation controls"
    >
      <div className="bg-white rounded-lg shadow-xl border border-secondary-200 overflow-hidden">
        {/* Installation Progress (if active) */}
        {installationProgress && installationProgress.isInstalling && (
          <div className="bg-primary-50 px-4 py-3 border-b border-primary-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-primary-900 font-medium">
                Installing {installationProgress.currentTool}...
              </span>
              <span className="text-primary-700">
                {installationProgress.completed} / {installationProgress.total}
              </span>
            </div>
            <div className="mt-2 w-full bg-primary-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(installationProgress.completed / installationProgress.total) * 100}%` 
                }}
                role="progressbar"
                aria-valuenow={installationProgress.completed}
                aria-valuemin={0}
                aria-valuemax={installationProgress.total}
                aria-label={`Installation progress: ${installationProgress.completed} of ${installationProgress.total} tools`}
              />
            </div>
          </div>
        )}

        {/* Summary Header */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-secondary-900">
              Selection Summary
            </h3>
            <button
              onClick={onClearSelection}
              className="text-secondary-400 hover:text-secondary-600 transition-colors"
              aria-label="Clear all selections"
              disabled={installationProgress?.isInstalling}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-secondary-50 rounded-lg">
              <div className="text-2xl font-bold text-secondary-900">{selectedCount}</div>
              <div className="text-xs text-secondary-600">Tools Selected</div>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded-lg">
              <div className="text-2xl font-bold text-primary-900">{recommendedCount}</div>
              <div className="text-xs text-primary-600">Recommended</div>
            </div>
          </div>

          {/* Installation Info */}
          {toInstallCount > 0 && (
            <div className="space-y-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex justify-between text-sm">
                <span className="text-amber-900">To install:</span>
                <span className="font-medium text-amber-900">{toInstallCount} tools</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-900">Total size:</span>
                <span className="font-medium text-amber-900">
                  {estimatedSize || formatSize(totalSize)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-900">Estimated time:</span>
                <span className="font-medium text-amber-900">
                  {estimatedTime || formatTime(totalTime)}
                </span>
              </div>
            </div>
          )}

          {/* Already Installed Info */}
          {alreadyInstalledCount > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center text-sm text-green-800">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {alreadyInstalledCount} tool{alreadyInstalledCount === 1 ? '' : 's'} already installed
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action */}
            <button
              onClick={() => onInstallSelected(Array.from(selection.selectedTools))}
              disabled={toInstallCount === 0 || installationProgress?.isInstalling}
              className={`w-full btn-primary ${
                toInstallCount === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-label={`Install ${toInstallCount} selected tools`}
            >
              {installationProgress?.isInstalling ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Installing...
                </div>
              ) : toInstallCount === 0 ? (
                'All Selected Tools Installed'
              ) : (
                `Install ${toInstallCount} Tool${toInstallCount === 1 ? '' : 's'}`
              )}
            </button>

            {/* Secondary Actions */}
            <div className="flex space-x-2">
              <button
                onClick={onExportSelection}
                disabled={installationProgress?.isInstalling}
                className="flex-1 btn-secondary text-sm"
                aria-label="Export selection to file"
              >
                Export List
              </button>
              
              {/* View Selected Tools */}
              <details className="flex-1">
                <summary className="btn-secondary text-sm cursor-pointer list-none text-center w-full">
                  View Selected
                </summary>
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-secondary-900 mb-2">Selected Tools:</h4>
                    <div className="space-y-1">
                      {selectedTools.map(tool => (
                        <div key={tool.id} className="flex items-center justify-between text-xs">
                          <span className="text-secondary-700">{tool.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            tool.isInstalled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {tool.isInstalled ? 'Installed' : 'To Install'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 