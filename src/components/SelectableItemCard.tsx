import React, { useState } from 'react';
import type { SelectableItemCardProps } from '../types/ui-types';

/**
 * SelectableItemCard component displays an individual tool with selection functionality
 * Supports keyboard navigation, installation status, and job role recommendations
 */
export const SelectableItemCard: React.FC<SelectableItemCardProps> = ({
  tool,
  isSelected,
  onToggle,
  onInstall,
  disabled = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleToggle = () => {
    if (!disabled) {
      console.log('SelectableItemCard: Toggling tool', tool.id, tool.name, !isSelected);
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
    if (onInstall) {
      onInstall(tool.id);
    }
  };

  // Check if this tool has job role recommendations
  const hasRoleRecommendation = 'jobRoleRecommendation' in tool && tool.jobRoleRecommendation;
  
  // Get priority badge info
  const getPriorityBadgeInfo = () => {
    if (!hasRoleRecommendation) return null;
    
    switch (tool.jobRoleRecommendation?.priority) {
      case 'essential':
        return {
          text: 'Essential',
          bgColor: 'bg-indigo-100',
          textColor: 'text-indigo-800',
          borderColor: 'border-indigo-200'
        };
      case 'recommended':
        return {
          text: 'Recommended',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200'
        };
      case 'optional':
        return {
          text: 'Optional',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
      default:
        return null;
    }
  };

  const priorityBadge = getPriorityBadgeInfo();

  return (
    <div 
      className={`relative flex items-start p-4 rounded-lg border ${
        isSelected ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 bg-white'
      } hover:border-primary-300 cursor-pointer transition-colors duration-150 mb-2`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`${tool.name} - ${tool.isRecommended ? 'Recommended' : ''} ${tool.isInstalled ? 'Already installed' : ''}`}
      data-testid={`tool-card-${tool.id}`}
    >
      {/* Selection Checkbox */}
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

      {/* Tool Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-medium text-secondary-900 truncate pr-2">
            {tool.name}
          </h3>
          <div className="flex items-center space-x-2">
            {/* Installation Status */}
            {tool.isInstalled && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Installed
              </span>
            )}
            
            {/* Recommended Badge */}
            {tool.isRecommended && !hasRoleRecommendation && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                Recommended
              </span>
            )}

            {/* Job Role Priority Badge */}
            {priorityBadge && (
              <div 
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityBadge.bgColor} ${priorityBadge.textColor} border ${priorityBadge.borderColor}`}>
                  {priorityBadge.text}
                </span>
                
                {/* Role Recommendation Tooltip */}
                {showTooltip && tool.jobRoleRecommendation && (
                  <div className="absolute z-10 w-64 px-3 py-2 text-sm bg-white border border-secondary-200 rounded-md shadow-lg -top-1 right-0 transform translate-y-full">
                    <p className="font-medium text-secondary-900 mb-1">
                      {priorityBadge.text} for {tool.jobRoleRecommendation.roleName}
                    </p>
                    {tool.jobRoleRecommendation.rationale && (
                      <p className="text-secondary-600 text-xs">
                        {tool.jobRoleRecommendation.rationale}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <p className="text-sm text-secondary-600 mb-2 line-clamp-2">
          {tool.description}
        </p>
        
        <div className="flex flex-wrap items-center text-xs text-secondary-500 space-x-3">
          {tool.version && (
            <span className="inline-flex items-center">
              <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Version {tool.version}
            </span>
          )}
          
          {tool.size && (
            <span>{tool.size}</span>
          )}
          
          {tool.installationTime && (
            <span>~{tool.installationTime} to install</span>
          )}
          
          {!tool.isInstalled && onInstall && (
            <button
              onClick={handleInstall}
              className="ml-auto text-primary-600 hover:text-primary-700 focus:outline-none focus:underline text-xs font-medium"
              aria-label={`Install ${tool.name}`}
            >
              Install separately
            </button>
          )}
        </div>
      </div>
    </div>
  );
}; 