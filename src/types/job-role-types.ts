/**
 * Job Role Detection Types for HatStart Application
 * Defines interfaces and types for user job role identification and tool recommendations
 */

/**
 * Supported job roles for tool recommendations
 */
export type JobRole = 
  // Infrastructure & Platform Engineers
  | 'cloud-infrastructure-architect'
  | 'platform-engineer'
  | 'devops-engineer'
  | 'site-reliability-engineer'
  // Application Developers
  | 'frontend-developer'
  | 'backend-developer'
  | 'fullstack-developer'
  | 'mobile-developer'
  // Data & Analytics
  | 'data-engineer'
  | 'data-scientist'
  | 'ml-engineer'
  // Security & QA
  | 'security-engineer'
  | 'qa-engineer'
  // Leadership & Management
  | 'engineering-manager'
  | 'tech-lead'
  // Custom roles
  | 'custom';

/**
 * Question types for job role identification
 */
export type JobRoleQuestionType = 
  | 'single-choice'
  | 'multi-select'
  | 'technology-preferences'
  | 'work-focus'
  | 'responsibilities';

/**
 * Option for job role questions
 */
export interface JobRoleQuestionOption {
  id: string;
  text: string;
  icon?: string;
  roleIndicators: {
    role: JobRole;
    weight: number; // 0-1, how strongly this option indicates this role
  }[];
  description?: string;
}

/**
 * Structure for a job role questionnaire question
 */
export interface JobRoleQuestion {
  id: string;
  text: string;
  type: JobRoleQuestionType;
  category: 'responsibilities' | 'technologies' | 'workflows' | 'preferences' | 'experience';
  options: JobRoleQuestionOption[];
  helpText?: string;
  required?: boolean;
  allowCustomAnswer?: boolean; // For adding custom roles
}

/**
 * User's answer to a job role question
 */
export interface JobRoleAnswer {
  questionId: string;
  selectedOptionIds: string[];
  customAnswer?: string;
  timestamp: Date;
}

/**
 * Complete job role questionnaire response
 */
export interface JobRoleResponse {
  answers: JobRoleAnswer[];
  startTime: Date;
  endTime?: Date;
  completionRate: number;
  skipped: boolean;
}

/**
 * Job role detection result with confidence
 */
export interface JobRoleDetectionResult {
  primaryRole: JobRole;
  confidence: number; // 0-1
  alternativeRoles: {
    role: JobRole;
    confidence: number;
  }[];
  customRoleName?: string; // If user selected custom role
  recommendations: string[]; // Recommended tools for this role
  timestamp: Date;
}

/**
 * Job role configuration for tool recommendations
 */
export interface JobRoleConfig {
  id: JobRole;
  name: string;
  description: string;
  icon: string;
  color: string;
  primaryTools: string[]; // Tool IDs that are essential for this role
  recommendedTools: string[]; // Tool IDs that are recommended
  optionalTools: string[]; // Tool IDs that might be useful
  categories: string[]; // Tool categories this role typically uses
  skillAreas: string[]; // Areas of expertise
  workflowTypes: string[]; // Types of work this role does
}

/**
 * Props for JobRoleQuestionnaire component
 */
export interface JobRoleQuestionnaireProps {
  questions: JobRoleQuestion[];
  roleConfigs: JobRoleConfig[];
  onComplete: (result: JobRoleDetectionResult) => void;
  onSkip: () => void;
  isVisible: boolean;
  allowSkip?: boolean;
  showProgress?: boolean;
  showRolePreview?: boolean;
  animationDuration?: number;
}

/**
 * Props for QuestionStep component
 */
export interface QuestionStepProps {
  question: JobRoleQuestion;
  selectedOptionIds: string[];
  onAnswerChange: (optionIds: string[], customAnswer?: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
  showSkip: boolean;
  onSkip: () => void;
}

/**
 * Props for RolePreview component
 */
export interface RolePreviewProps {
  detectedRoles: {
    role: JobRole;
    confidence: number;
    config: JobRoleConfig;
  }[];
  isVisible: boolean;
  maxRolesToShow?: number;
}

/**
 * Props for ToolRecommendationPreview component
 */
export interface ToolRecommendationPreviewProps {
  recommendedTools: {
    id: string;
    name: string;
    icon?: string;
    category: string;
  }[];
  roleName: string;
  isVisible: boolean;
  maxToolsToShow?: number;
}

/**
 * Job role metadata for UI display
 */
export const JOB_ROLE_META: Record<JobRole, {
  label: string;
  description: string;
  color: string;
  icon: string;
  category: 'infrastructure' | 'development' | 'data' | 'security' | 'management' | 'custom';
}> = {
  'cloud-infrastructure-architect': {
    label: 'Cloud Infrastructure Architect',
    description: 'Design and implement cloud infrastructure solutions',
    color: '#3B82F6',
    icon: '☁️',
    category: 'infrastructure'
  },
  'platform-engineer': {
    label: 'Platform Engineer',
    description: 'Build and maintain development platforms and tooling',
    color: '#8B5CF6',
    icon: '🏗️',
    category: 'infrastructure'
  },
  'devops-engineer': {
    label: 'DevOps Engineer',
    description: 'Automate and optimize development and deployment processes',
    color: '#10B981',
    icon: '⚙️',
    category: 'infrastructure'
  },
  'site-reliability-engineer': {
    label: 'Site Reliability Engineer',
    description: 'Ensure system reliability, performance, and observability',
    color: '#F59E0B',
    icon: '📊',
    category: 'infrastructure'
  },
  'frontend-developer': {
    label: 'Frontend Developer',
    description: 'Build user interfaces and client-side applications',
    color: '#EF4444',
    icon: '🎨',
    category: 'development'
  },
  'backend-developer': {
    label: 'Backend Developer',
    description: 'Develop server-side logic and APIs',
    color: '#6366F1',
    icon: '⚡',
    category: 'development'
  },
  'fullstack-developer': {
    label: 'Full-Stack Developer',
    description: 'Work on both frontend and backend development',
    color: '#8B5CF6',
    icon: '🔄',
    category: 'development'
  },
  'mobile-developer': {
    label: 'Mobile Developer',
    description: 'Create mobile applications for iOS and Android',
    color: '#EC4899',
    icon: '📱',
    category: 'development'
  },
  'data-engineer': {
    label: 'Data Engineer',
    description: 'Build and maintain data pipelines and infrastructure',
    color: '#06B6D4',
    icon: '🔧',
    category: 'data'
  },
  'data-scientist': {
    label: 'Data Scientist',
    description: 'Analyze data and build machine learning models',
    color: '#84CC16',
    icon: '🔬',
    category: 'data'
  },
  'ml-engineer': {
    label: 'ML Engineer',
    description: 'Deploy and scale machine learning systems',
    color: '#F97316',
    icon: '🤖',
    category: 'data'
  },
  'security-engineer': {
    label: 'Security Engineer',
    description: 'Implement and maintain security measures',
    color: '#DC2626',
    icon: '🔒',
    category: 'security'
  },
  'qa-engineer': {
    label: 'QA Engineer',
    description: 'Test software quality and automate testing processes',
    color: '#059669',
    icon: '✅',
    category: 'security'
  },
  'engineering-manager': {
    label: 'Engineering Manager',
    description: 'Lead engineering teams and technical strategy',
    color: '#7C3AED',
    icon: '👥',
    category: 'management'
  },
  'tech-lead': {
    label: 'Tech Lead',
    description: 'Provide technical leadership and architectural guidance',
    color: '#0EA5E9',
    icon: '🎯',
    category: 'management'
  },
  'custom': {
    label: 'Custom Role',
    description: 'Define your own job role and tool preferences',
    color: '#6B7280',
    icon: '⚡',
    category: 'custom'
  }
}; 