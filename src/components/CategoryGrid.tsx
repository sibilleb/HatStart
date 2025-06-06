import React from 'react';
import type { CategoryGridProps } from '../types/ui-types';
import { CategoryCard } from './CategoryCard';

/**
 * CategoryGrid component displays all tool categories in a grid layout
 * Manages category expansion and applies global filters
 */
export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  expandedCategories,
  onCategoryToggle,
  selection,
  onSelectionChange,
  filterOptions,
  // onFilterChange, // Currently not used in this component
}) => {
  // Filter categories to only show those with matching tools
  const visibleCategories = categories.filter(category => {
    const hasMatchingTools = category.tools.some(tool => {
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

    return hasMatchingTools;
  });

  const handleSelectAll = () => {
    const newSelection = { ...selection };
    const allVisibleTools = visibleCategories.flatMap(category => category.tools);
    
    allVisibleTools.forEach(tool => {
      newSelection.selectedTools.add(tool.id);
      newSelection.deselectedRecommendations.delete(tool.id);
    });
    
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection = { ...selection };
    const allVisibleTools = visibleCategories.flatMap(category => category.tools);
    
    allVisibleTools.forEach(tool => {
      newSelection.selectedTools.delete(tool.id);
      if (tool.isRecommended) {
        newSelection.deselectedRecommendations.add(tool.id);
      }
    });
    
    onSelectionChange(newSelection);
  };

  const handleSelectRecommended = () => {
    const newSelection = { ...selection };
    const allVisibleTools = visibleCategories.flatMap(category => category.tools);
    const recommendedTools = allVisibleTools.filter(tool => tool.isRecommended);
    
    recommendedTools.forEach(tool => {
      newSelection.selectedTools.add(tool.id);
      newSelection.deselectedRecommendations.delete(tool.id);
    });
    
    onSelectionChange(newSelection);
  };

  const totalTools = visibleCategories.reduce((sum, category) => sum + category.tools.length, 0);
  const selectedTools = visibleCategories.reduce((sum, category) => 
    sum + category.tools.filter(tool => selection.selectedTools.has(tool.id)).length, 0
  );
  const recommendedTools = visibleCategories.reduce((sum, category) => 
    sum + category.tools.filter(tool => tool.isRecommended).length, 0
  );

  if (visibleCategories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-secondary-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-secondary-900 mb-2">No tools found</h3>
        <p className="text-secondary-500 max-w-md mx-auto">
          No tools match your current filters. Try adjusting your search criteria or clearing some filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary and Actions Bar */}
      <div className="bg-white rounded-lg border border-secondary-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="text-sm text-secondary-600">
            <span className="font-medium text-secondary-900">{selectedTools}</span> of{' '}
            <span className="font-medium text-secondary-900">{totalTools}</span> tools selected
            {recommendedTools > 0 && (
              <span className="ml-2 text-primary-600">
                ({recommendedTools} recommended)
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSelectRecommended}
              disabled={recommendedTools === 0}
              className="btn-secondary text-sm"
              aria-label="Select all recommended tools"
            >
              Select Recommended
            </button>
            <button
              onClick={handleSelectAll}
              className="btn-secondary text-sm"
              aria-label="Select all visible tools"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              disabled={selectedTools === 0}
              className="btn-secondary text-sm"
              aria-label="Deselect all tools"
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="space-y-6" role="main" aria-label="Tool categories">
        {visibleCategories.map(category => (
          <CategoryCard
            key={category.id}
            category={category}
            isExpanded={expandedCategories.has(category.id)}
            onToggle={onCategoryToggle}
            selection={selection}
            onSelectionChange={onSelectionChange}
            filterOptions={filterOptions}
          />
        ))}
      </div>

      {/* Expand/Collapse All */}
      {visibleCategories.length > 1 && (
        <div className="text-center">
          <button
            onClick={() => {
              const allExpanded = visibleCategories.every(cat => expandedCategories.has(cat.id));
              if (allExpanded) {
                // Collapse all
                visibleCategories.forEach(cat => onCategoryToggle(cat.id));
              } else {
                // Expand all
                visibleCategories.forEach(cat => {
                  if (!expandedCategories.has(cat.id)) {
                    onCategoryToggle(cat.id);
                  }
                });
              }
            }}
            className="btn-secondary"
            aria-label={
              visibleCategories.every(cat => expandedCategories.has(cat.id))
                ? "Collapse all categories"
                : "Expand all categories"
            }
          >
            {visibleCategories.every(cat => expandedCategories.has(cat.id))
              ? "Collapse All Categories"
              : "Expand All Categories"
            }
          </button>
        </div>
      )}
    </div>
  );
}; 