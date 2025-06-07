/**
 * Job Role Assessment Service
 * Provides questionnaire content and scoring algorithm for determining user job role
 */

import type {
    JobRole,
    JobRoleAnswer,
    JobRoleConfig,
    JobRoleDetectionResult,
    JobRoleQuestion,
    JobRoleResponse,
} from '../types/job-role-types';
import { JobRoleConfigService } from './job-role-config-service';

/**
 * Comprehensive questionnaire for assessing developer job role
 * Questions are designed to gauge both technical focus and workflow preferences
 */
export const JOB_ROLE_QUESTIONS: JobRoleQuestion[] = [
  {
    id: 'tech-stack',
    text: 'Which technologies do you work with most frequently?',
    type: 'multi-select',
    category: 'technologies',
    required: true,
    helpText: 'Select all that apply to your daily work',
    options: [
      {
        id: 'frontend-tech',
        text: 'Frontend (React, Vue, Angular, etc.)',
        roleIndicators: [
          { role: 'frontend-developer', weight: 0.9 },
          { role: 'fullstack-developer', weight: 0.6 },
          { role: 'mobile-developer', weight: 0.3 }
        ]
      },
      {
        id: 'backend-tech',
        text: 'Backend (Node.js, Spring, Django, etc.)',
        roleIndicators: [
          { role: 'backend-developer', weight: 0.9 },
          { role: 'fullstack-developer', weight: 0.6 },
          { role: 'data-engineer', weight: 0.2 }
        ]
      },
      {
        id: 'cloud-tech',
        text: 'Cloud Services (AWS, Azure, GCP)',
        roleIndicators: [
          { role: 'cloud-infrastructure-architect', weight: 0.9 },
          { role: 'platform-engineer', weight: 0.7 },
          { role: 'devops-engineer', weight: 0.8 },
          { role: 'site-reliability-engineer', weight: 0.6 }
        ]
      },
      {
        id: 'data-tech',
        text: 'Data Processing (Hadoop, Spark, SQL, etc.)',
        roleIndicators: [
          { role: 'data-engineer', weight: 0.9 },
          { role: 'data-scientist', weight: 0.6 },
          { role: 'ml-engineer', weight: 0.5 }
        ]
      },
      {
        id: 'mobile-tech',
        text: 'Mobile Development (Swift, Kotlin, React Native)',
        roleIndicators: [
          { role: 'mobile-developer', weight: 0.9 },
          { role: 'frontend-developer', weight: 0.3 },
          { role: 'fullstack-developer', weight: 0.2 }
        ]
      },
      {
        id: 'devops-tech',
        text: 'CI/CD and DevOps Tools (Jenkins, GitHub Actions)',
        roleIndicators: [
          { role: 'devops-engineer', weight: 0.9 },
          { role: 'platform-engineer', weight: 0.6 },
          { role: 'site-reliability-engineer', weight: 0.5 }
        ]
      },
      {
        id: 'security-tech',
        text: 'Security Tools and Frameworks',
        roleIndicators: [
          { role: 'security-engineer', weight: 0.9 },
          { role: 'devops-engineer', weight: 0.2 },
          { role: 'site-reliability-engineer', weight: 0.3 }
        ]
      },
      {
        id: 'qa-tech',
        text: 'Testing Frameworks and Tools',
        roleIndicators: [
          { role: 'qa-engineer', weight: 0.9 },
          { role: 'fullstack-developer', weight: 0.2 }
        ]
      }
    ]
  },
  {
    id: 'primary-responsibility',
    text: 'What is your primary responsibility?',
    type: 'single-choice',
    category: 'responsibilities',
    required: true,
    options: [
      {
        id: 'building-ui',
        text: 'Building user interfaces and experiences',
        roleIndicators: [
          { role: 'frontend-developer', weight: 0.9 },
          { role: 'mobile-developer', weight: 0.8 },
          { role: 'fullstack-developer', weight: 0.5 }
        ]
      },
      {
        id: 'server-apis',
        text: 'Creating APIs and server-side logic',
        roleIndicators: [
          { role: 'backend-developer', weight: 0.9 },
          { role: 'fullstack-developer', weight: 0.5 }
        ]
      },
      {
        id: 'infrastructure',
        text: 'Designing and maintaining infrastructure',
        roleIndicators: [
          { role: 'cloud-infrastructure-architect', weight: 0.9 },
          { role: 'platform-engineer', weight: 0.7 },
          { role: 'devops-engineer', weight: 0.5 },
          { role: 'site-reliability-engineer', weight: 0.6 }
        ]
      },
      {
        id: 'data-pipelines',
        text: 'Building data pipelines and analysis systems',
        roleIndicators: [
          { role: 'data-engineer', weight: 0.9 },
          { role: 'data-scientist', weight: 0.6 },
          { role: 'ml-engineer', weight: 0.5 }
        ]
      },
      {
        id: 'team-leadership',
        text: 'Leading teams and making technical decisions',
        roleIndicators: [
          { role: 'engineering-manager', weight: 0.9 },
          { role: 'tech-lead', weight: 0.9 }
        ]
      },
      {
        id: 'testing-qa',
        text: 'Ensuring software quality and testing',
        roleIndicators: [
          { role: 'qa-engineer', weight: 0.9 },
          { role: 'security-engineer', weight: 0.3 }
        ]
      },
      {
        id: 'security',
        text: 'Implementing security measures and testing',
        roleIndicators: [
          { role: 'security-engineer', weight: 0.9 },
          { role: 'devops-engineer', weight: 0.3 }
        ]
      }
    ]
  },
  {
    id: 'daily-tools',
    text: 'Which tools do you use on a daily basis?',
    type: 'multi-select',
    category: 'technologies',
    required: true,
    options: [
      {
        id: 'code-editors',
        text: 'Code editors and IDEs',
        roleIndicators: [
          { role: 'frontend-developer', weight: 0.8 },
          { role: 'backend-developer', weight: 0.8 },
          { role: 'fullstack-developer', weight: 0.8 },
          { role: 'mobile-developer', weight: 0.8 }
        ]
      },
      {
        id: 'terminal-cli',
        text: 'Terminal and command-line tools',
        roleIndicators: [
          { role: 'devops-engineer', weight: 0.8 },
          { role: 'backend-developer', weight: 0.6 },
          { role: 'site-reliability-engineer', weight: 0.7 },
          { role: 'cloud-infrastructure-architect', weight: 0.6 }
        ]
      },
      {
        id: 'docker-containers',
        text: 'Docker or container tools',
        roleIndicators: [
          { role: 'devops-engineer', weight: 0.9 },
          { role: 'platform-engineer', weight: 0.8 },
          { role: 'site-reliability-engineer', weight: 0.7 }
        ]
      },
      {
        id: 'cloud-consoles',
        text: 'Cloud provider consoles and tools',
        roleIndicators: [
          { role: 'cloud-infrastructure-architect', weight: 0.9 },
          { role: 'platform-engineer', weight: 0.6 },
          { role: 'devops-engineer', weight: 0.6 }
        ]
      },
      {
        id: 'data-tools',
        text: 'Data analysis and visualization tools',
        roleIndicators: [
          { role: 'data-scientist', weight: 0.9 },
          { role: 'data-engineer', weight: 0.7 },
          { role: 'ml-engineer', weight: 0.7 }
        ]
      },
      {
        id: 'testing-tools',
        text: 'Testing and QA tools',
        roleIndicators: [
          { role: 'qa-engineer', weight: 0.9 },
          { role: 'frontend-developer', weight: 0.3 },
          { role: 'backend-developer', weight: 0.3 }
        ]
      },
      {
        id: 'monitoring-tools',
        text: 'Monitoring and observability tools',
        roleIndicators: [
          { role: 'site-reliability-engineer', weight: 0.9 },
          { role: 'devops-engineer', weight: 0.7 },
          { role: 'platform-engineer', weight: 0.5 }
        ]
      },
      {
        id: 'project-management',
        text: 'Project management and issue tracking',
        roleIndicators: [
          { role: 'engineering-manager', weight: 0.9 },
          { role: 'tech-lead', weight: 0.8 },
          { role: 'fullstack-developer', weight: 0.3 }
        ]
      }
    ]
  },
  {
    id: 'work-focus',
    text: 'What best describes your work focus?',
    type: 'work-focus',
    category: 'workflows',
    required: true,
    options: [
      {
        id: 'building-features',
        text: 'Building new features and applications',
        roleIndicators: [
          { role: 'frontend-developer', weight: 0.8 },
          { role: 'backend-developer', weight: 0.8 },
          { role: 'fullstack-developer', weight: 0.9 },
          { role: 'mobile-developer', weight: 0.8 }
        ]
      },
      {
        id: 'maintaining-systems',
        text: 'Maintaining and scaling existing systems',
        roleIndicators: [
          { role: 'site-reliability-engineer', weight: 0.9 },
          { role: 'platform-engineer', weight: 0.7 },
          { role: 'devops-engineer', weight: 0.6 }
        ]
      },
      {
        id: 'optimizing-performance',
        text: 'Optimizing performance and efficiency',
        roleIndicators: [
          { role: 'site-reliability-engineer', weight: 0.8 },
          { role: 'backend-developer', weight: 0.6 },
          { role: 'data-engineer', weight: 0.7 }
        ]
      },
      {
        id: 'security-compliance',
        text: 'Security and compliance',
        roleIndicators: [
          { role: 'security-engineer', weight: 0.9 },
          { role: 'devops-engineer', weight: 0.3 }
        ]
      },
      {
        id: 'data-analysis',
        text: 'Data analysis and insights',
        roleIndicators: [
          { role: 'data-scientist', weight: 0.9 },
          { role: 'data-engineer', weight: 0.5 },
          { role: 'ml-engineer', weight: 0.6 }
        ]
      },
      {
        id: 'team-process',
        text: 'Team processes and productivity',
        roleIndicators: [
          { role: 'engineering-manager', weight: 0.9 },
          { role: 'tech-lead', weight: 0.8 },
          { role: 'qa-engineer', weight: 0.4 }
        ]
      }
    ]
  },
  {
    id: 'career-goals',
    text: 'What are your career development goals?',
    type: 'single-choice',
    category: 'preferences',
    required: false,
    options: [
      {
        id: 'technical-depth',
        text: 'Deeper technical expertise in my area',
        roleIndicators: [
          { role: 'frontend-developer', weight: 0.3 },
          { role: 'backend-developer', weight: 0.3 },
          { role: 'data-engineer', weight: 0.3 },
          { role: 'ml-engineer', weight: 0.3 },
          { role: 'security-engineer', weight: 0.3 }
        ]
      },
      {
        id: 'technical-breadth',
        text: 'Broader technical knowledge across areas',
        roleIndicators: [
          { role: 'fullstack-developer', weight: 0.5 },
          { role: 'devops-engineer', weight: 0.4 },
          { role: 'tech-lead', weight: 0.4 }
        ]
      },
      {
        id: 'architecture',
        text: 'System architecture and design',
        roleIndicators: [
          { role: 'cloud-infrastructure-architect', weight: 0.6 },
          { role: 'tech-lead', weight: 0.5 },
          { role: 'platform-engineer', weight: 0.4 }
        ]
      },
      {
        id: 'leadership',
        text: 'Leadership and people management',
        roleIndicators: [
          { role: 'engineering-manager', weight: 0.7 },
          { role: 'tech-lead', weight: 0.5 }
        ]
      },
      {
        id: 'innovation',
        text: 'Innovation and cutting-edge technologies',
        roleIndicators: [
          { role: 'ml-engineer', weight: 0.4 },
          { role: 'data-scientist', weight: 0.4 },
          { role: 'fullstack-developer', weight: 0.3 }
        ]
      }
    ]
  }
];

/**
 * Default confidence threshold for role detection
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Job Role Assessment Service
 * Handles analyzing questionnaire responses to determine the user's job role
 */
export class JobRoleAssessmentService {
  private roleConfigService: JobRoleConfigService;
  private confidenceThreshold: number;

  constructor(confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD) {
    this.roleConfigService = new JobRoleConfigService();
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Get all questionnaire questions
   */
  getQuestions(): JobRoleQuestion[] {
    return JOB_ROLE_QUESTIONS;
  }

  /**
   * Calculate job role from questionnaire responses
   */
  detectJobRole(response: JobRoleResponse): JobRoleDetectionResult {
    const startTime = new Date();
    
    // Validate response has sufficient answers
    const requiredQuestionCount = JOB_ROLE_QUESTIONS.filter(q => q.required).length;
    const answeredRequiredQuestions = response.answers.filter(a => {
      const question = JOB_ROLE_QUESTIONS.find(q => q.id === a.questionId);
      return question?.required && this.isValidAnswer(a);
    });

    if (answeredRequiredQuestions.length < requiredQuestionCount) {
      throw new Error(`Insufficient answers. Required questions: ${requiredQuestionCount}, Answered: ${answeredRequiredQuestions.length}`);
    }

    // Calculate role scores
    const roleScores = this.calculateRoleScores(response.answers);
    
    // Sort roles by score
    const sortedRoles = Object.entries(roleScores)
      .map(([role, score]) => ({ role: role as JobRole, score }))
      .sort((a, b) => b.score - a.score);

    // Get primary role
    const primaryRole = sortedRoles[0].role;
    const primaryScore = sortedRoles[0].score;
    
    // Calculate confidence - normalized primary score relative to others
    const confidence = this.calculateConfidence(primaryScore, sortedRoles, response);
    
    // Get alternative roles (2nd and 3rd place if they have decent scores)
    const alternativeRoles = sortedRoles
      .slice(1, 4)
      .filter(r => r.score > 0.3) // Only include reasonable alternatives
      .map(r => ({
        role: r.role,
        confidence: r.score / primaryScore // Relative confidence
      }));

    // Generate recommendations based on detected role
    const recommendations = this.generateRecommendations(primaryRole);

    return {
      primaryRole,
      confidence,
      alternativeRoles,
      recommendations,
      timestamp: startTime
    };
  }

  /**
   * Calculate scores for each job role based on answers
   */
  private calculateRoleScores(answers: JobRoleAnswer[]): Record<JobRole, number> {
    // Initialize scores for all roles to 0
    const roleScores: Record<JobRole, number> = {
      'cloud-infrastructure-architect': 0,
      'platform-engineer': 0,
      'devops-engineer': 0,
      'site-reliability-engineer': 0,
      'frontend-developer': 0,
      'backend-developer': 0,
      'fullstack-developer': 0,
      'mobile-developer': 0,
      'data-engineer': 0,
      'data-scientist': 0,
      'ml-engineer': 0,
      'security-engineer': 0,
      'qa-engineer': 0,
      'engineering-manager': 0,
      'tech-lead': 0,
      'custom': 0
    };

    // Process each answer
    for (const answer of answers) {
      const question = JOB_ROLE_QUESTIONS.find(q => q.id === answer.questionId);
      if (!question) continue;

      // Process selected options
      for (const optionId of answer.selectedOptionIds) {
        const option = question.options.find(o => o.id === optionId);
        if (!option) continue;

        // Add role indicators to scores
        for (const indicator of option.roleIndicators) {
          roleScores[indicator.role] += indicator.weight;
        }
      }
    }

    // Normalize scores to 0-1 range
    const maxScore = Math.max(...Object.values(roleScores));
    if (maxScore > 0) {
      for (const role in roleScores) {
        roleScores[role as JobRole] = roleScores[role as JobRole] / maxScore;
      }
    }

    return roleScores;
  }

  /**
   * Calculate confidence level in the role detection
   */
  private calculateConfidence(
    primaryScore: number,
    sortedRoles: Array<{ role: JobRole; score: number }>,
    response: JobRoleResponse
  ): number {
    // Base confidence is the primary score (0-1)
    let confidence = primaryScore;

    // Adjust based on gap between primary and secondary roles
    // A larger gap means higher confidence
    if (sortedRoles.length > 1) {
      const gap = primaryScore - sortedRoles[1].score;
      confidence += gap * 0.2; // Boost confidence by up to 20% for clear winners
    }

    // Adjust based on completion rate
    confidence *= (0.5 + response.completionRate / 200); // Scales from 50% to 100% of original

    // If user skipped questionnaire, reduce confidence
    if (response.skipped) {
      confidence *= 0.6;
    }

    // Cap at 0.95 - never perfect confidence
    return Math.min(0.95, confidence);
  }

  /**
   * Generate tool recommendations based on detected role
   */
  private generateRecommendations(role: JobRole): string[] {
    const roleConfig = this.roleConfigService.getConfig(role);
    if (!roleConfig) return [];

    // Default recommendations
    const defaultRecommendations = [
      `Explore ${roleConfig.name} specific tools and workflows`,
      `Consider connecting with other ${roleConfig.name} professionals`,
      `Look for learning resources tailored to ${roleConfig.name} roles`
    ];

    // Add recommendations based on primary tools
    const toolRecommendations = roleConfig.primaryTools.map(toolId => 
      `Install ${toolId} - an essential tool for ${roleConfig.name} roles`
    );

    return [...defaultRecommendations, ...toolRecommendations.slice(0, 3)];
  }

  /**
   * Check if an answer is valid
   */
  private isValidAnswer(answer: JobRoleAnswer): boolean {
    return answer.selectedOptionIds.length > 0;
  }

  /**
   * Get role configs for all available roles
   */
  getRoleConfigs(): JobRoleConfig[] {
    return this.roleConfigService.getAllConfigs();
  }

  /**
   * Validate if the confidence meets the threshold
   */
  isConfidenceSufficient(confidence: number): boolean {
    return confidence >= this.confidenceThreshold;
  }
} 