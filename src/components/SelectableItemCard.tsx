import React from 'react';
import type { SelectableItemCardProps } from '../types/ui-types';

/**
 * SelectableItemCard component displays an individual tool with selection functionality
 * Supports keyboard navigation and shows installation status
 */
export const SelectableItemCard: React.FC<SelectableItemCardProps> = ({
  tool,
  isSelected,
  onToggle,
  onInstall,
  disabled = false,
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onToggle(tool.id, !isSelected);
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
    if (onInstall && !disabled) {
      onInstall(tool.id);
    }
  };

  const getStatusColor = () => {
    switch (tool.installationStatus) {
      case 'installed':
        return 'text-green-600';
      case 'installing':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      case 'updating':
        return 'text-yellow-600';
      default:
        return 'text-secondary-500';
    }
  };

  const getStatusText = () => {
    switch (tool.installationStatus) {
      case 'installed':
        return 'Installed';
      case 'installing':
        return 'Installing...';
      case 'failed':
        return 'Failed';
      case 'updating':
        return 'Updating...';
      default:
        return 'Not installed';
    }
  };

  return (
    <div
      className={`selection-item ${isSelected ? 'selection-item-selected' : ''} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={isSelected ? "true" : "false"}
      aria-disabled={disabled ? "true" : "false"}
      aria-label={`${tool.name}. ${getStatusText()}. ${tool.description}. ${isSelected ? 'Selected' : 'Not selected'}.`}
      data-testid={`tool-card-${tool.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Tool Header */}
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="text-sm font-medium text-secondary-900 truncate">
              {tool.name}
            </h4>
            {tool.isRecommended && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                Recommended
              </span>
            )}
          </div>

          {/* Tool Description */}
          <p className="text-xs text-secondary-600 line-clamp-2 mb-2">
            {tool.description}
          </p>

          {/* Tool Metadata */}
          <div className="flex items-center justify-between text-xs text-secondary-500">
            <div className="flex items-center space-x-2">
              {tool.version && (
                <span>v{tool.version}</span>
              )}
              {tool.size && (
                <span>• {tool.size}</span>
              )}
              {tool.installationTime && (
                <span>• {tool.installationTime}</span>
              )}
            </div>
            <div className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>

          {/* Progress Bar for Installing */}
          {tool.installationStatus === 'installing' && tool.installationProgress !== undefined && (
            <div className="mt-2">
              <div className="w-full bg-secondary-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${tool.installationProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {tool.installationStatus === 'failed' && tool.installationError && (
            <div className="mt-2 text-xs text-red-600">
              {tool.installationError}
            </div>
          )}

          {/* Tags */}
          {tool.tags && tool.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tool.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-secondary-100 text-secondary-700"
                >
                  {tag}
                </span>
              ))}
              {tool.tags.length > 3 && (
                <span className="text-xs text-secondary-500">
                  +{tool.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Selection Indicator */}
        <div className="ml-3 flex-shrink-0">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
              isSelected
                ? 'bg-primary-600 border-primary-600'
                : 'border-secondary-300 hover:border-primary-400'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {(onInstall && tool.installationStatus === 'not-installed') && (
        <div className="mt-3 pt-3 border-t border-secondary-100">
          <button
            onClick={handleInstall}
            disabled={disabled}
            className="w-full btn-secondary text-xs py-1.5"
            aria-label={`Install ${tool.name}`}
          >
            Install Now
          </button>
        </div>
      )}
    </div>
  );
}; 