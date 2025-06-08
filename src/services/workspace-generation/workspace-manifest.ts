/**
 * Workspace Manifest Types
 * Extends the manifest system to support workspace-specific configurations
 */

import type { JobRole } from '../../types/job-role-types';
import type { IDEWorkspaceTemplate } from '../../shared/manifest-types';

/**
 * Workspace manifest that extends a tool manifest with workspace-specific configuration
 */
export interface WorkspaceManifest {
  /** ID for this workspace manifest */
  id: string;
  /** Display name for the workspace */
  name: string;
  /** Description of the workspace */
  description: string;
  /** Tool ID this workspace extends */
  toolId: string;
  /** Language/stack this workspace is for */
  stack: string;
  /** Template type (basic, fullstack, library, etc.) */
  templateType: 'basic' | 'fullstack' | 'library' | 'microservice' | 'desktop' | 'mobile' | 'data-science' | 'devops' | 'testing' | 'documentation';
  /** Workspace templates by IDE */
  ideWorkspaces: {
    vscode?: IDEWorkspaceTemplate;
    cursor?: IDEWorkspaceTemplate;
    jetbrains?: IDEWorkspaceTemplate;
    vim?: IDEWorkspaceTemplate;
  };
  /** Related tool IDs that enhance this workspace */
  relatedTools?: string[];
  /** Job roles that benefit from this workspace */
  targetJobRoles?: JobRole[];
  /** Tags for categorization */
  tags?: string[];
  /** Version of this workspace manifest */
  version: string;
  /** Author information */
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
}

/**
 * Collection of workspace manifests
 */
export interface WorkspaceManifestCollection {
  /** Version of the manifest schema */
  schemaVersion: string;
  /** Collection metadata */
  metadata: {
    name: string;
    description: string;
    lastUpdated: string;
    maintainer?: string;
  };
  /** Workspace manifests */
  workspaces: WorkspaceManifest[];
}

/**
 * Workspace template reference for job roles
 */
export interface WorkspaceTemplateReference {
  /** Template ID */
  id: string;
  /** Priority for this template (higher = more important) */
  priority: number;
  /** Conditions for when to use this template */
  conditions?: {
    /** Required tools that must be selected */
    requiredTools?: string[];
    /** Required categories */
    requiredCategories?: string[];
    /** Minimum experience level */
    minExperience?: string;
  };
}

/**
 * Extended job role config with workspace templates
 */
export interface JobRoleWorkspaceConfig {
  /** Job role ID */
  roleId: JobRole;
  /** Workspace templates for this role */
  workspaceTemplates: {
    vscode?: WorkspaceTemplateReference[];
    cursor?: WorkspaceTemplateReference[];
    jetbrains?: WorkspaceTemplateReference[];
  };
}