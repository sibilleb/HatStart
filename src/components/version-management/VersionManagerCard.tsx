import React, { useState } from 'react';
import type { VersionManagerCardProps } from '../../types/version-management-ui-types';

/**
 * VersionManagerCard component displays an individual version manager
 * with selection functionality, status indicators, and action buttons
 */
export const VersionManagerCard: React.FC<VersionManagerCardProps> = ({
  manager,
  isSelected,
  onToggle,
  onInstall,
  onConfigure,
  disabled = false,
  operationStatus,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleToggle = () => {
    if (!disabled && manager.status !== 'not_installed') {
      onToggle(manager.type, !isSelected);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      handleToggle();
    }
  };

  const handleInstall = (event: React.MouseEvent) => {
    event.stopPropagation();
    onInstall(manager.type);
  };

  const handleConfigure = (event: React.MouseEvent) => {
    event.stopPropagation();
    onConfigure(manager.type);
  };

  // Get status badge info
  const getStatusBadgeInfo = () => {
    switch (manager.status) {
      case 'not_installed':
        return {
          text: 'Not Installed',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
      case 'installed':
        return {
          text: 'Installed',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'configured':
        return {
          text: 'Configured',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'active':
        return {
          text: 'Active',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          text: 'Error',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      default:
        return {
          text: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusBadge = getStatusBadgeInfo();
  const canSelect = manager.status !== 'not_installed' && !disabled;
  const isOperationRunning = operationStatus?.status === 'running';

  return (
    <div 
      className={`relative flex items-start p-4 rounded-lg border ${
        isSelected ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 bg-white'
      } ${canSelect ? 'hover:border-primary-300 cursor-pointer' : 'cursor-default'} transition-colors duration-150 mb-2`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      tabIndex={canSelect ? 0 : -1}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${manager.name} - ${manager.description} - ${statusBadge.text}`}
      data-testid={`version-manager-card-${manager.type}`}
    >
      {/* Selection Checkbox */}
      {canSelect && (
        <div className="mr-4 mt-1">
          <div className={`h-5 w-5 rounded border ${
            isSelected 
              ? 'bg-primary-500 border-primary-500' 
              : 'border-secondary-300'
          } flex items-center justify-center`}
          >
            {isSelected && (
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Manager Icon */}
      <div className="mr-4 mt-1">
        <div className="h-10 w-10 rounded-lg bg-secondary-100 flex items-center justify-center">
          {manager.icon ? (
            <img src={manager.icon} alt={manager.name} className="h-6 w-6" />
          ) : (
            <svg className="h-6 w-6 text-secondary-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Manager Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-medium text-secondary-900 truncate pr-2">
            {manager.name}
          </h3>
          <div className="flex items-center space-x-2">
            {/* Recommended Badge */}
            {manager.isRecommended && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                Recommended
              </span>
            )}

            {/* Status Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge.bgColor} ${statusBadge.textColor} border ${statusBadge.borderColor}`}>
              {statusBadge.text}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-secondary-600 mb-2 line-clamp-2">
          {manager.description}
        </p>
        
        {/* Supported Tools */}
        <div className="mb-3">
          <p className="text-xs text-secondary-500 mb-1">Supported Tools:</p>
          <div className="flex flex-wrap gap-1">
            {manager.supportedTools.slice(0, 6).map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700"
              >
                {tool}
              </span>
            ))}
            {manager.supportedTools.length > 6 && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                +{manager.supportedTools.length - 6} more
              </span>
            )}
          </div>
          
          {/* Tooltip for additional tools */}
          {showTooltip && manager.supportedTools.length > 6 && (
            <div className="absolute z-10 w-64 px-3 py-2 text-sm bg-white border border-secondary-200 rounded-md shadow-lg -top-1 right-0 transform translate-y-full">
              <p className="font-medium text-secondary-900 mb-1">All Supported Tools:</p>
              <div className="flex flex-wrap gap-1">
                {manager.supportedTools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operation Status */}
        {isOperationRunning && operationStatus && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-900">
                {operationStatus.currentStep}
              </span>
              <span className="text-xs text-blue-700">
                {operationStatus.progress}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${operationStatus.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between text-xs text-secondary-500">
          <div className="flex items-center space-x-3">
            {manager.supportedPlatforms && (
              <span className="inline-flex items-center">
                <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
                {manager.supportedPlatforms.join(', ')}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {manager.status === 'not_installed' && (
              <button
                onClick={handleInstall}
                disabled={isOperationRunning}
                className="text-primary-600 hover:text-primary-700 focus:outline-none focus:underline text-xs font-medium disabled:opacity-50"
                aria-label={`Install ${manager.name}`}
              >
                {isOperationRunning ? 'Installing...' : 'Install'}
              </button>
            )}
            
            {(manager.status === 'installed' || manager.status === 'configured' || manager.status === 'active') && (
              <button
                onClick={handleConfigure}
                disabled={isOperationRunning}
                className="text-secondary-600 hover:text-secondary-700 focus:outline-none focus:underline text-xs font-medium disabled:opacity-50"
                aria-label={`Configure ${manager.name}`}
              >
                Configure
              </button>
            )}

            {manager.documentationUrl && (
              <a
                href={manager.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary-600 hover:text-secondary-700 focus:outline-none focus:underline text-xs font-medium"
                aria-label={`View ${manager.name} documentation`}
              >
                Docs
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 