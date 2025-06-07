import React, { useEffect, useState } from 'react';
import { JobRoleConfigService } from '../services/job-role-config-service';
import type { JobRoleConfig } from '../types/job-role-types';
import type { FilterOptions } from '../types/ui-types';

interface JobRoleFilterPanelProps {
  filterOptions: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
}

/**
 * JobRoleFilterPanel component allows users to filter tools based on job roles and priority levels
 */
export const JobRoleFilterPanel: React.FC<JobRoleFilterPanelProps> = ({
  filterOptions,
  onFilterChange,
}) => {
  const [jobRoles, setJobRoles] = useState<JobRoleConfig[]>([]);
  const [selectedRole, setSelectedRole] = useState<string | undefined>(filterOptions.selectedJobRole);
  const [currentRoleName, setCurrentRoleName] = useState<string>('');

  // Load job roles on component mount
  useEffect(() => {
    const jobRoleService = new JobRoleConfigService();
    const roles = jobRoleService.getAllConfigs();
    setJobRoles(roles);
    
    // Update current role name if there's a selected role
    if (filterOptions.selectedJobRole) {
      const role = roles.find(r => r.id === filterOptions.selectedJobRole);
      if (role) {
        setCurrentRoleName(role.name);
      }
    }
  }, [filterOptions.selectedJobRole]);

  // Handle toggle of job role filtering
  const handleToggleJobRoleFilter = () => {
    onFilterChange({
      ...filterOptions,
      filterByJobRole: !filterOptions.filterByJobRole,
      // If enabling, make sure we have a selected role
      selectedJobRole: !filterOptions.filterByJobRole 
        ? selectedRole || (jobRoles.length > 0 ? jobRoles[0].id : undefined)
        : filterOptions.selectedJobRole,
    });
  };

  // Handle role selection change
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;
    setSelectedRole(roleId);
    
    // Update the role name for display
    const role = jobRoles.find(r => r.id === roleId);
    if (role) {
      setCurrentRoleName(role.name);
    }
    
    onFilterChange({
      ...filterOptions,
      selectedJobRole: roleId,
    });
  };

  // Handle priority level change
  const handlePriorityChange = (priorityLevel?: 'essential' | 'recommended' | 'all') => {
    onFilterChange({
      ...filterOptions,
      priorityLevel,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-secondary-200 p-4 mb-4" aria-label="Job Role Filter Panel">
      <h3 className="text-lg font-semibold text-secondary-900 mb-2">Job Role Filters</h3>
      
      <div className="space-y-4">
        {/* Enable Job Role Filtering */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="filterByJobRole"
            checked={filterOptions.filterByJobRole}
            onChange={handleToggleJobRoleFilter}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            aria-label="Filter by job role"
          />
          <label htmlFor="filterByJobRole" className="ml-2 block text-secondary-700">
            Filter by job role
          </label>
        </div>
        
        {filterOptions.filterByJobRole && (
          <>
            {/* Job Role Selection */}
            <div className="mt-2">
              <label htmlFor="jobRoleSelect" className="block text-sm font-medium text-secondary-700">
                Select your job role:
              </label>
              <select
                id="jobRoleSelect"
                value={filterOptions.selectedJobRole}
                onChange={handleRoleChange}
                className="mt-1 block w-full py-2 px-3 border border-secondary-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                aria-label="Select job role"
              >
                {jobRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              
              {currentRoleName && (
                <p className="mt-1 text-sm text-secondary-500">
                  Showing tools recommended for {currentRoleName}
                </p>
              )}
            </div>
            
            {/* Priority Level Selection */}
            <div className="mt-3">
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Tool Priority:
              </label>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="priorityEssential"
                    name="priorityLevel"
                    checked={filterOptions.priorityLevel === 'essential'}
                    onChange={() => handlePriorityChange('essential')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    aria-label="Show only essential tools"
                  />
                  <label htmlFor="priorityEssential" className="ml-2 block text-sm text-secondary-700">
                    Essential tools only
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="priorityRecommended"
                    name="priorityLevel"
                    checked={filterOptions.priorityLevel === 'recommended'}
                    onChange={() => handlePriorityChange('recommended')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    aria-label="Show essential and recommended tools"
                  />
                  <label htmlFor="priorityRecommended" className="ml-2 block text-sm text-secondary-700">
                    Essential & Recommended tools
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="priorityAll"
                    name="priorityLevel"
                    checked={!filterOptions.priorityLevel || filterOptions.priorityLevel === 'all'}
                    onChange={() => handlePriorityChange('all')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300"
                    aria-label="Show all tools for this role"
                  />
                  <label htmlFor="priorityAll" className="ml-2 block text-sm text-secondary-700">
                    All tools for this role
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 