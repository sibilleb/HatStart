import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilterOptions } from '../types/ui-types';
import { SearchFilterPanel } from './SearchFilterPanel';

// Mock the child components
vi.mock('./JobRoleFilterPanel', () => ({
  JobRoleFilterPanel: vi.fn().mockImplementation(({ filterOptions, onFilterChange }) => (
    <div data-testid="job-role-filter">
      <button 
        data-testid="mock-job-role-change"
        onClick={() => onFilterChange({ ...filterOptions, filterByJobRole: true, selectedJobRole: 'frontend-developer' })}
      >
        Select Role
      </button>
    </div>
  ))
}));

describe('SearchFilterPanel', () => {
  const mockOnFilterChange = vi.fn();
  const defaultFilterOptions: FilterOptions = {
    searchQuery: '',
    showOnlyRecommended: false,
    showOnlyNotInstalled: false,
    selectedCategories: new Set(),
    selectedPlatforms: new Set(),
    filterByJobRole: false,
    showRoleRecommendations: true,
    priorityLevel: 'all'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default values', () => {
    render(
      <SearchFilterPanel
        filterOptions={defaultFilterOptions}
        onFilterChange={mockOnFilterChange}
      />
    );
    
    // Check if the component renders with correct title
    expect(screen.getByText(/filters/i)).toBeInTheDocument();
    
    // Check if search input is present
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    
    // Check if JobRoleFilterPanel is rendered
    expect(screen.getByTestId('job-role-filter')).toBeInTheDocument();
  });

  it('calls onFilterChange when search text is entered', () => {
    render(
      <SearchFilterPanel
        filterOptions={defaultFilterOptions}
        onFilterChange={mockOnFilterChange}
      />
    );
    
    // Enter search text
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'vscode' } });
    
    // Check if onFilterChange was called with correct params
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQuery: 'vscode'
      })
    );
  });

  it('calls onFilterChange when a checkbox is toggled', () => {
    render(
      <SearchFilterPanel
        filterOptions={defaultFilterOptions}
        onFilterChange={mockOnFilterChange}
      />
    );
    
    // Find and toggle the "Show only recommended" checkbox
    const recommendedCheckbox = screen.getByLabelText(/show only recommended/i);
    fireEvent.click(recommendedCheckbox);
    
    // Check if onFilterChange was called with correct params
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        showOnlyRecommended: true
      })
    );
  });

  it('propagates filter changes from JobRoleFilterPanel', () => {
    render(
      <SearchFilterPanel
        filterOptions={defaultFilterOptions}
        onFilterChange={mockOnFilterChange}
      />
    );
    
    // Click the mock button that simulates JobRoleFilterPanel changing the filter
    fireEvent.click(screen.getByTestId('mock-job-role-change'));
    
    // Check if onFilterChange was called with correct params
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        filterByJobRole: true,
        selectedJobRole: 'frontend-developer'
      })
    );
  });
}); 