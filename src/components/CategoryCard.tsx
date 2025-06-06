import React from 'react';
import type { CategoryCardProps } from '../types/ui-types';
import { SelectableItemCard } from './SelectableItemCard';

/**
 * CategoryCard component displays a tool category with expandable content
 * Supports keyboard navigation and screen reader accessibility
 */
export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  isExpanded,
  onToggle,
  selection,
  onSelectionChange,
  filterOptions,
}) => {
  // Filter tools based on current filter options
  const filteredTools = category.tools.filter(tool => {
    // Search query filter
    if (filterOptions.searchQuery) {
      const query = filterOptions.searchQuery.toLowerCase();
      const matchesSearch = 
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Recommended filter
    if (filterOptions.showOnlyRecommended && !tool.isRecommended) {
      return false;
    }

    // Not installed filter
    if (filterOptions.showOnlyNotInstalled && tool.isInstalled) {
      return false;
    }

    return true;
  });

  // Don't render if no tools match filters
  if (filteredTools.length === 0) {
    return null;
  }

  const handleToggle = () => {
    onToggle(category.id);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  const handleToolToggle = (toolId: string, selected: boolean) => {
    const newSelection = { ...selection };
    
    if (selected) {
      newSelection.selectedTools.add(toolId);
      newSelection.deselectedRecommendations.delete(toolId);
    } else {
      newSelection.selectedTools.delete(toolId);
      // If this was a recommended tool, mark it as deselected
      const tool = category.tools.find(t => t.id === toolId);
      if (tool?.isRecommended) {
        newSelection.deselectedRecommendations.add(toolId);
      }
    }
    
    onSelectionChange(newSelection);
  };

  const selectedCount = filteredTools.filter(tool => 
    selection.selectedTools.has(tool.id)
  ).length;

  const recommendedCount = filteredTools.filter(tool => 
    tool.isRecommended
  ).length;

  const installedCount = filteredTools.filter(tool => 
    tool.isInstalled
  ).length;

  return (
    <div 
      className={`category-card ${isExpanded ? 'category-card-expanded' : ''}`}
      data-testid={`category-card-${category.id}`}
    >
      {/* Category Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`category-content-${category.id}`}
        aria-label={`${category.name} category. ${isExpanded ? 'Collapse' : 'Expand'} to ${isExpanded ? 'hide' : 'show'} tools.`}
      >
        <div className="flex items-center space-x-4">
          <div 
            className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}
            style={{ backgroundColor: category.color + '20', color: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-secondary-900">
              {category.name}
            </h3>
            <p className="text-sm text-secondary-600">
              {category.description}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Stats */}
          <div className="text-right text-sm text-secondary-600">
            <div>
              {selectedCount}/{filteredTools.length} selected
            </div>
            {recommendedCount > 0 && (
              <div className="text-primary-600">
                {recommendedCount} recommended
              </div>
            )}
            {installedCount > 0 && (
              <div className="text-green-600">
                {installedCount} installed
              </div>
            )}
          </div>

          {/* Expand/Collapse Arrow */}
          <div 
            className={`transform transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            <svg 
              className="w-5 h-5 text-secondary-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div 
          id={`category-content-${category.id}`}
          className="mt-6 animate-slide-in"
          role="region"
          aria-label={`${category.name} tools`}
        >
          <div className="grid-responsive-3 gap-3 sm:gap-4">
            {filteredTools.map(tool => (
              <SelectableItemCard
                key={tool.id}
                tool={{
                  ...tool,
                  installationStatus: tool.isInstalled ? 'installed' : 'not-installed',
                }}
                isSelected={selection.selectedTools.has(tool.id)}
                onToggle={handleToolToggle}
                data-testid={`tool-card-${tool.id}`}
              />
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-8 text-secondary-500">
              <p>No tools match the current filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 