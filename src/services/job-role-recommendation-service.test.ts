import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToolCategory, ToolWithStatus } from '../types/ui-types';
import { JobRoleRecommendationService } from './job-role-recommendation-service';

// Create a real mock manually instead of using vi.mock
const mockGetConfig = vi.fn();
const mockGetAllConfigs = vi.fn();

// Mock implementation of JobRoleConfigService
vi.mock('./job-role-config-service', () => {
  return {
    JobRoleConfigService: vi.fn().mockImplementation(() => {
      return {
        getConfig: mockGetConfig,
        getAllConfigs: mockGetAllConfigs
      };
    })
  };
});

describe('JobRoleRecommendationService', () => {
  let service: JobRoleRecommendationService;
  
  // Sample tools for testing
  const sampleTools: ToolWithStatus[] = [
    {
      id: 'tool1',
      name: 'Tool 1',
      description: 'Description for tool 1',
      category: 'code-editors' as ToolCategory,
      platforms: ['windows', 'macos'],
      isInstalled: false,
      isRecommended: false,
      installationStatus: 'not-installed'
    },
    {
      id: 'tool2',
      name: 'Tool 2',
      description: 'Description for tool 2',
      category: 'dev-utilities' as ToolCategory,
      platforms: ['macos'],
      isInstalled: true,
      isRecommended: true,
      installationStatus: 'installed'
    }
  ];
  
  // Sample job role config
  const frontendDevConfig = {
    id: 'frontend-developer',
    name: 'Frontend Developer',
    description: 'Builds user interfaces',
    icon: '🎨',
    color: '#EF4444',
    primaryTools: ['tool1'],
    recommendedTools: ['tool2'],
    optionalTools: [],
    categories: ['code-editors', 'dev-utilities'],
    skillAreas: ['UI', 'JavaScript'],
    workflowTypes: ['web-development']
  };
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup mock return value
    mockGetConfig.mockReturnValue(frontendDevConfig);
    
    // Create a new instance of the service
    service = new JobRoleRecommendationService();
  });
  
  it('should apply job role recommendations to tools', () => {
    const result = service.applyRoleRecommendations(sampleTools, 'frontend-developer');
    
    // Verify the service called getConfig
    expect(mockGetConfig).toHaveBeenCalledWith('frontend-developer');
    
    // Check that the results include the correct recommendations
    expect(result).toHaveLength(2);
    
    // Tool1 should be marked as essential
    expect(result[0].jobRoleRecommendation).toBeDefined();
    expect(result[0].jobRoleRecommendation?.priority).toBe('essential');
    expect(result[0].jobRoleRecommendation?.roleId).toBe('frontend-developer');
    
    // Tool2 should be marked as recommended
    expect(result[1].jobRoleRecommendation).toBeDefined();
    expect(result[1].jobRoleRecommendation?.priority).toBe('recommended');
  });
  
  it('should not modify tools when job role does not exist', () => {
    // Setup mock to return null for non-existent role
    mockGetConfig.mockReturnValue(null);
    
    const result = service.applyRoleRecommendations(sampleTools, 'nonexistent-role');
    
    // Verify the service called getConfig
    expect(mockGetConfig).toHaveBeenCalledWith('nonexistent-role');
    
    // Check that the tools were not modified
    expect(result).toHaveLength(2);
    expect(result[0].jobRoleRecommendation).toBeUndefined();
    expect(result[1].jobRoleRecommendation).toBeUndefined();
  });
  
  it('should filter tools by role', () => {
    // Now test the filter function with spy
    const spy = vi.spyOn(service, 'applyRoleRecommendations');
    const result = service.getToolsForRole(sampleTools, 'frontend-developer');
    
    // Verify applyRoleRecommendations was called
    expect(spy).toHaveBeenCalledWith(sampleTools, 'frontend-developer');
    
    // Check that all returned tools have recommendations
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(tool => tool.jobRoleRecommendation !== undefined)).toBe(true);
  });
  
  it('should get essential tools for role', () => {
    const result = service.getEssentialToolsForRole(sampleTools, 'frontend-developer');
    
    // Check that only essential tools are returned
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tool1');
    expect(result[0].jobRoleRecommendation?.priority).toBe('essential');
  });
}); 