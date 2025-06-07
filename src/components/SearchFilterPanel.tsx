import React from 'react';
import type { FilterOptions } from '../types/ui-types';
import { JobRoleFilterPanel } from './JobRoleFilterPanel';

interface SearchFilterPanelProps {
  filterOptions: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
}

/**
 * SearchFilterPanel component contains all the filtering options for tools
 * Including search, category filters, and job role filters
 */
export const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({
  filterOptions,
  onFilterChange,
}) => {
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filterOptions,
      searchQuery: e.target.value,
    });
  };

  // Handle checkbox changes
  const handleCheckboxChange = (field: keyof FilterOptions) => {
    onFilterChange({
      ...filterOptions,
      [field]: !filterOptions[field],
    });
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Search Box */}
      <div className="bg-white rounded-lg border border-secondary-200 p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg 
              className="w-5 h-5 text-secondary-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search tools by name, description, or tags..."
            value={filterOptions.searchQuery}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-3 py-2 border border-secondary-300 rounded-md leading-5 bg-white placeholder-secondary-500 focus:outline-none focus:placeholder-secondary-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            aria-label="Search tools"
          />
        </div>
      </div>

      {/* Quick Filters */}
      <div className="bg-white rounded-lg border border-secondary-200 p-4">
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">Quick Filters</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showOnlyRecommended"
              checked={filterOptions.showOnlyRecommended}
              onChange={() => handleCheckboxChange('showOnlyRecommended')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              aria-label="Show only recommended tools"
            />
            <label htmlFor="showOnlyRecommended" className="ml-2 block text-secondary-700">
              Show only recommended tools
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showOnlyNotInstalled"
              checked={filterOptions.showOnlyNotInstalled}
              onChange={() => handleCheckboxChange('showOnlyNotInstalled')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              aria-label="Show only not installed tools"
            />
            <label htmlFor="showOnlyNotInstalled" className="ml-2 block text-secondary-700">
              Show only not installed tools
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showRoleRecommendations"
              checked={filterOptions.showRoleRecommendations}
              onChange={() => handleCheckboxChange('showRoleRecommendations')}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
              aria-label="Show role-specific recommendations"
            />
            <label htmlFor="showRoleRecommendations" className="ml-2 block text-secondary-700">
              Show role-specific recommendations
            </label>
          </div>
        </div>
      </div>

      {/* Job Role Filter Panel */}
      <JobRoleFilterPanel
        filterOptions={filterOptions}
        onFilterChange={onFilterChange}
      />

      {/* Future filter panels could be added here */}
    </div>
  );
}; 