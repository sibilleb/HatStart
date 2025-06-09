import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilterOptions } from '../types/ui-types';
import { JobRoleFilterPanel } from './JobRoleFilterPanel';

// Create mock for JobRoleConfigService
const mockGetAllConfigs = vi.fn();

// Mock implementation of JobRoleConfigService
vi.mock('../services/job-role-config-service', () => {
  return {
    JobRoleConfigService: vi.fn().mockImplementation(() => {
      return {
        getAllConfigs: mockGetAllConfigs
      };
    })
  };
});

describe('JobRoleFilterPanel', () => {
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
  
  // Sample job role configs
  const sampleRoleConfigs = [
    {
      id: 'frontend-developer',
      name: 'Frontend Developer',
      description: 'Builds user interfaces',
      icon: '🎨',
      color: '#EF4444',
      primaryTools: ['vscode', 'chrome'],
      recommendedTools: ['react-devtools', 'figma'],
      optionalTools: ['sketch', 'photoshop'],
      categories: ['code-editors', 'browsers', 'design-tools']
    },
    {
      id: 'backend-developer',
      name: 'Backend Developer',
      description: 'Develops server-side logic',
      icon: '⚙️',
      color: '#3B82F6',
      primaryTools: ['vscode', 'postman'],
      recommendedTools: ['docker', 'mysql-workbench'],
      optionalTools: ['redis-commander'],
      categories: ['code-editors', 'databases', 'containerization']
    }
  ];
  
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockGetAllConfigs.mockReturnValue(sampleRoleConfigs);
    mockOnFilterChange.mockClear();
  });
  
  it('renders correctly with job roles loaded', () => {
    render(
      <JobRoleFilterPanel 
        filterOptions={defaultFilterOptions} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Should have a title
    expect(screen.getByText('Job Role Filters')).toBeInTheDocument();
    
    // Should have the checkbox for enabling job role filtering
    expect(screen.getByLabelText('Filter by job role')).toBeInTheDocument();
    
    // Should call getAllConfigs
    expect(mockGetAllConfigs).toHaveBeenCalled();
  });
  
  it('allows selecting a job role', () => {
    render(
      <JobRoleFilterPanel 
        filterOptions={defaultFilterOptions} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // First enable job role filtering
    const checkbox = screen.getByLabelText('Filter by job role');
    fireEvent.click(checkbox);
    
    // Should call onFilterChange with updated filters
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ 
        filterByJobRole: true,
        selectedJobRole: 'frontend-developer' // First role in the list
      })
    );
    
    // Re-render with the filter enabled to see the select
    render(
      <JobRoleFilterPanel 
        filterOptions={{
          ...defaultFilterOptions,
          filterByJobRole: true,
          selectedJobRole: 'frontend-developer'
        }} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Now the select should be visible
    const select = screen.getByLabelText('Select job role');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('frontend-developer');
  });
  
  it('allows changing priority level filter', () => {
    // Render with job role already selected
    const filterOptions = {
      ...defaultFilterOptions,
      filterByJobRole: true,
      selectedJobRole: 'frontend-developer'
    };
    
    render(
      <JobRoleFilterPanel 
        filterOptions={filterOptions} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Find and click the "Essential tools only" option
    const essentialOption = screen.getByLabelText('Show only essential tools');
    fireEvent.click(essentialOption);
    
    // Should call onFilterChange with updated priority level
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ 
        priorityLevel: 'essential'
      })
    );
  });
  
  it('allows disabling job role filtering', () => {
    // Render with job role already selected
    const filterOptions = {
      ...defaultFilterOptions,
      filterByJobRole: true,
      selectedJobRole: 'frontend-developer'
    };
    
    render(
      <JobRoleFilterPanel 
        filterOptions={filterOptions} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Find and uncheck the checkbox to disable filtering
    const checkbox = screen.getByLabelText('Filter by job role');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    
    // Should call onFilterChange with filterByJobRole set to false
    expect(mockOnFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ 
        filterByJobRole: false,
        selectedJobRole: 'frontend-developer' // Keeps the previous selection
      })
    );
  });
}); 