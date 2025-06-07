/**
 * Experience Level Types for HatStart Application
 * Defines interfaces and types for user experience assessment and tool filtering
 */

/**
 * User experience levels
 */
export const ExperienceLevel = {
  Beginner: 'beginner',
  Intermediate: 'intermediate',
  Advanced: 'advanced'
} as const;

export type ExperienceLevel = typeof ExperienceLevel[keyof typeof ExperienceLevel];

/**
 * Question types for the experience assessment questionnaire
 */
export type QuestionType = 
  | 'multiple-choice'
  | 'single-choice'
  | 'scale'
  | 'yes-no'
  | 'multi-select';

/**
 * Option for multiple choice and single choice questions
 */
export interface QuestionOption {
  id: string;
  text: string;
  value: number; // Score value for this option
  experienceIndicator?: ExperienceLevel; // Optional hint about what this answer indicates
}

/**
 * Structure for a questionnaire question
 */
export interface ExperienceQuestion {
  id: string;
  text: string;
  type: QuestionType;
  category?: string; // e.g., 'programming', 'tools', 'concepts'
  weight?: number; // Importance multiplier for scoring (default: 1)
  options?: QuestionOption[]; // For choice-based questions
  minValue?: number; // For scale questions
  maxValue?: number; // For scale questions
  minLabel?: string; // Label for minimum value on scale
  maxLabel?: string; // Label for maximum value on scale
  helpText?: string; // Additional context or examples
  required?: boolean; // Whether the question must be answered
}

/**
 * User's answer to a question
 */
export interface QuestionAnswer {
  questionId: string;
  value: string | number | string[] | boolean; // Depends on question type
  timestamp?: Date;
}

/**
 * Complete questionnaire response
 */
export interface QuestionnaireResponse {
  answers: QuestionAnswer[];
  startTime: Date;
  endTime?: Date;
  completionRate: number; // Percentage of questions answered
}

/**
 * Result of experience level assessment
 */
export interface ExperienceAssessment {
  level: ExperienceLevel;
  score: number; // Raw score
  confidence: number; // 0-1, how confident the assessment is
  breakdown?: {
    category: string;
    score: number;
    maxScore: number;
  }[];
  recommendations?: string[]; // Personalized recommendations based on assessment
  timestamp: Date;
}

/**
 * Experience level requirements for a tool
 */
export interface ToolExperienceRequirement {
  minimumLevel: ExperienceLevel;
  recommendedLevel?: ExperienceLevel;
  rationale?: string; // Why this experience level is required
  alternativesForBeginners?: string[]; // Tool IDs of simpler alternatives
}

/**
 * Extended Tool interface with experience requirements
 */
export interface ToolWithExperience {
  experienceRequirement?: ToolExperienceRequirement;
  learningResources?: {
    title: string;
    url: string;
    type: 'tutorial' | 'documentation' | 'video' | 'course';
    experienceLevel: ExperienceLevel;
  }[];
  difficultyIndicators?: string[]; // Features that make this tool challenging
}

/**
 * User's experience profile
 */
export interface UserExperienceProfile {
  assessment: ExperienceAssessment;
  preferences?: {
    showAdvancedTools: boolean;
    showLearningResources: boolean;
    autoFilterByExperience: boolean;
  };
  history?: ExperienceAssessment[]; // Previous assessments for tracking progress
}

/**
 * Props for ExperienceQuestionnaire component
 */
export interface ExperienceQuestionnaireProps {
  questions: ExperienceQuestion[];
  onComplete: (response: QuestionnaireResponse) => void;
  onSkip?: () => void;
  initialAnswers?: QuestionAnswer[];
  showProgress?: boolean;
  allowSkip?: boolean;
}

/**
 * Props for ExperienceLevelBadge component
 */
export interface ExperienceLevelBadgeProps {
  level: ExperienceLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}

/**
 * Experience-based filter options
 */
export interface ExperienceFilterOptions {
  filterByExperience: boolean;
  showOnlyAccessible: boolean; // Show only tools matching user's level
  includeNextLevel: boolean; // Also show tools one level above
  showAlternatives: boolean; // Show beginner alternatives for advanced tools
}

/**
 * Scoring configuration for the assessment algorithm
 */
export interface ScoringConfig {
  thresholds: {
    beginner: { min: 0; max: number };
    intermediate: { min: number; max: number };
    advanced: { min: number; max: number };
  };
  categoryWeights?: Record<string, number>;
  minimumAnswersRequired: number;
  confidenceThreshold: number; // Minimum confidence for a valid assessment
}

/**
 * Default scoring configuration
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  thresholds: {
    beginner: { min: 0, max: 30 },
    intermediate: { min: 31, max: 70 },
    advanced: { min: 71, max: 100 }
  },
  minimumAnswersRequired: 5,
  confidenceThreshold: 0.6
};

/**
 * Experience level metadata for UI display
 */
export const EXPERIENCE_LEVEL_META: Record<ExperienceLevel, {
  label: string;
  description: string;
  color: string;
  icon: string;
}> = {
  [ExperienceLevel.Beginner]: {
    label: 'Beginner',
    description: 'New to development or this technology',
    color: '#10B981', // Green
    icon: '🌱'
  },
  [ExperienceLevel.Intermediate]: {
    label: 'Intermediate',
    description: 'Comfortable with basics, learning advanced concepts',
    color: '#3B82F6', // Blue
    icon: '🚀'
  },
  [ExperienceLevel.Advanced]: {
    label: 'Advanced',
    description: 'Expert level, comfortable with complex tools',
    color: '#8B5CF6', // Purple
    icon: '⭐'
  }
}; 