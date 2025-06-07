/**
 * Job Role Recommendation Service
 * Applies job role recommendations to tools based on selected job role
 */

import type { JobRole, JobRoleConfig } from '../types/job-role-types';
import type { ToolWithStatus } from '../types/ui-types';
import { JobRoleConfigService } from './job-role-config-service';

/**
 * Service for applying job role recommendations to tools
 */
export class JobRoleRecommendationService {
  private jobRoleService: JobRoleConfigService;

  constructor() {
    this.jobRoleService = new JobRoleConfigService();
  }

  /**
   * Apply job role recommendations to a list of tools
   * @param tools The tools to apply recommendations to
   * @param roleId The job role ID to use for recommendations
   * @returns Tools with job role recommendations applied
   */
  applyRoleRecommendations(
    tools: ToolWithStatus[],
    roleId: string | JobRole
  ): ToolWithStatus[] {
    const roleConfig = this.jobRoleService.getConfig(roleId);
    if (!roleConfig) {
      console.warn(`Job role with ID '${roleId}' not found`);
      return tools;
    }

    return tools.map(tool => this.applyRoleRecommendationToTool(tool, roleConfig));
  }

  /**
   * Apply job role recommendation to a single tool
   * @param tool The tool to apply recommendation to
   * @param roleConfig The job role configuration
   * @returns Tool with job role recommendation applied
   */
  private applyRoleRecommendationToTool(
    tool: ToolWithStatus,
    roleConfig: JobRoleConfig
  ): ToolWithStatus {
    // Create a copy of the tool to avoid modifying the original
    const updatedTool = { ...tool };

    // Check if this tool is in the primary tools list
    if (roleConfig.primaryTools.includes(tool.id)) {
      updatedTool.jobRoleRecommendation = {
        roleId: roleConfig.id,
        roleName: roleConfig.name,
        priority: 'essential',
        rationale: `Essential tool for ${roleConfig.name} roles.`
      };
      return updatedTool;
    }

    // Check if this tool is in the recommended tools list
    if (roleConfig.recommendedTools.includes(tool.id)) {
      updatedTool.jobRoleRecommendation = {
        roleId: roleConfig.id,
        roleName: roleConfig.name,
        priority: 'recommended',
        rationale: `Recommended for ${roleConfig.name} roles to enhance productivity.`
      };
      return updatedTool;
    }

    // Check if this tool is in the optional tools list
    if (roleConfig.optionalTools?.includes(tool.id)) {
      updatedTool.jobRoleRecommendation = {
        roleId: roleConfig.id,
        roleName: roleConfig.name,
        priority: 'optional',
        rationale: `Optional tool that may be useful for ${roleConfig.name} roles.`
      };
      return updatedTool;
    }

    // If the role has specific categories and this tool is in one of them
    if (roleConfig.categories && tool.category) {
      const matchesCategory = roleConfig.categories.includes(tool.category);
      if (matchesCategory) {
        updatedTool.jobRoleRecommendation = {
          roleId: roleConfig.id,
          roleName: roleConfig.name,
          priority: 'optional',
          rationale: `Tool in the ${tool.category} category which is relevant for ${roleConfig.name} roles.`
        };
        return updatedTool;
      }
    }

    // For tools that don't match any of the above criteria
    return updatedTool;
  }

  /**
   * Get all tools that are recommended for a specific job role
   * @param tools The complete list of tools
   * @param roleId The job role ID
   * @returns Filtered list of tools recommended for the role
   */
  getToolsForRole(
    tools: ToolWithStatus[],
    roleId: string | JobRole
  ): ToolWithStatus[] {
    const toolsWithRecommendations = this.applyRoleRecommendations(tools, roleId);
    return toolsWithRecommendations.filter(tool => tool.jobRoleRecommendation !== undefined);
  }

  /**
   * Get essential tools for a specific job role
   * @param tools The complete list of tools
   * @param roleId The job role ID
   * @returns Filtered list of essential tools for the role
   */
  getEssentialToolsForRole(
    tools: ToolWithStatus[],
    roleId: string | JobRole
  ): ToolWithStatus[] {
    const toolsWithRecommendations = this.applyRoleRecommendations(tools, roleId);
    return toolsWithRecommendations.filter(
      tool => tool.jobRoleRecommendation?.priority === 'essential'
    );
  }

  /**
   * Get the priority of a tool for a specific job role
   * @param toolId The tool ID
   * @param roleId The job role ID
   * @returns The priority of the tool for the role, or undefined if not found
   */
  getToolPriorityForRole(
    toolId: string,
    roleId: string | JobRole
  ): 'essential' | 'recommended' | 'optional' | undefined {
    const roleConfig = this.jobRoleService.getConfig(roleId);
    if (!roleConfig) return undefined;

    if (roleConfig.primaryTools.includes(toolId)) {
      return 'essential';
    }

    if (roleConfig.recommendedTools.includes(toolId)) {
      return 'recommended';
    }

    if (roleConfig.optionalTools?.includes(toolId)) {
      return 'optional';
    }

    return undefined;
  }
} 