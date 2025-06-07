/**
 * Tests for Job Role Assessment Service
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { JobRole, JobRoleResponse } from '../../types/job-role-types';
import { DEFAULT_CONFIDENCE_THRESHOLD, JOB_ROLE_QUESTIONS, JobRoleAssessmentService } from '../job-role-assessment';

// Create mock for the JobRoleConfigService
jest.mock('../job-role-config-service', () => {
  return {
    JobRoleConfigService: jest.fn().mockImplementation(() => {
      return {
        getConfig: (roleId: string | JobRole) => {
          if (roleId === 'frontend-developer') {
            return {
              id: 'frontend-developer',
              name: 'Frontend Developer',
              description: 'Build user interfaces and client-side applications',
              icon: '🎨',
              color: '#EF4444',
              primaryTools: ['vscode', 'chrome-devtools', 'npm'],
              recommendedTools: ['react-devtools', 'figma', 'storybook'],
              optionalTools: ['webpack', 'sass', 'tailwind'],
              categories: ['ui', 'web', 'javascript'],
              skillAreas: ['UI/UX', 'JavaScript', 'CSS'],
              workflowTypes: ['component-based', 'responsive-design']
            };
          } else if (roleId === 'backend-developer') {
            return {
              id: 'backend-developer',
              name: 'Backend Developer',
              description: 'Develop server-side logic and APIs',
              icon: '⚡',
              color: '#6366F1',
              primaryTools: ['vscode', 'docker', 'git'],
              recommendedTools: ['postman', 'dbeaver', 'insomnia'],
              optionalTools: ['pgadmin', 'kubectx', 'redis-cli'],
              categories: ['api', 'database', 'server'],
              skillAreas: ['Databases', 'APIs', 'Server Architecture'],
              workflowTypes: ['api-development', 'data-persistence']
            };
          }
          
          // Return a default for any other role
          return {
            id: roleId as JobRole,
            name: String(roleId).replace('-', ' '),
            description: 'Generic role description',
            icon: '💻',
            color: '#666666',
            primaryTools: ['vscode', 'git'],
            recommendedTools: [],
            optionalTools: [],
            categories: [],
            skillAreas: [],
            workflowTypes: []
          };
        },
        getAllConfigs: () => [
          {
            id: 'frontend-developer',
            name: 'Frontend Developer',
            description: 'Build user interfaces and client-side applications',
            icon: '🎨',
            color: '#EF4444',
            primaryTools: ['vscode', 'chrome-devtools', 'npm'],
            recommendedTools: ['react-devtools', 'figma', 'storybook'],
            optionalTools: ['webpack', 'sass', 'tailwind'],
            categories: ['ui', 'web', 'javascript'],
            skillAreas: ['UI/UX', 'JavaScript', 'CSS'],
            workflowTypes: ['component-based', 'responsive-design']
          },
          {
            id: 'backend-developer',
            name: 'Backend Developer',
            description: 'Develop server-side logic and APIs',
            icon: '⚡',
            color: '#6366F1',
            primaryTools: ['vscode', 'docker', 'git'],
            recommendedTools: ['postman', 'dbeaver', 'insomnia'],
            optionalTools: ['pgadmin', 'kubectx', 'redis-cli'],
            categories: ['api', 'database', 'server'],
            skillAreas: ['Databases', 'APIs', 'Server Architecture'],
            workflowTypes: ['api-development', 'data-persistence']
          }
        ]
      };
    })
  };
});

describe('JobRoleAssessmentService', () => {
  let service: JobRoleAssessmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new JobRoleAssessmentService();
  });

  describe('getQuestions', () => {
    it('should return all job role questions', () => {
      const questions = service.getQuestions();
      expect(questions).toEqual(JOB_ROLE_QUESTIONS);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should have valid question structure', () => {
      const questions = service.getQuestions();
      questions.forEach(question => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('text');
        expect(question).toHaveProperty('type');
        expect(question).toHaveProperty('category');
        expect(question).toHaveProperty('options');
        expect(question.options.length).toBeGreaterThan(0);

        question.options.forEach(option => {
          expect(option).toHaveProperty('id');
          expect(option).toHaveProperty('text');
          expect(option).toHaveProperty('roleIndicators');
          expect(option.roleIndicators.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('detectJobRole', () => {
    it('should detect frontend developer role from frontend-focused answers', () => {
      const response: JobRoleResponse = {
        answers: [
          {
            questionId: 'tech-stack',
            selectedOptionIds: ['frontend-tech'],
            timestamp: new Date()
          },
          {
            questionId: 'primary-responsibility',
            selectedOptionIds: ['building-ui'],
            timestamp: new Date()
          },
          {
            questionId: 'daily-tools',
            selectedOptionIds: ['code-editors', 'project-management'],
            timestamp: new Date()
          },
          {
            questionId: 'work-focus',
            selectedOptionIds: ['building-features'],
            timestamp: new Date()
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 300000), // 5 minutes
        completionRate: 80,
        skipped: false
      };

      const result = service.detectJobRole(response);
      
      expect(result.primaryRole).toBe('frontend-developer');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.alternativeRoles.some(r => r.role === 'fullstack-developer')).toBe(true);
      expect(result.recommendations).toContain('Explore Frontend Developer specific tools and workflows');
      expect(result.recommendations).toContain('Install vscode - an essential tool for Frontend Developer roles');
    });

    it('should detect backend developer role from backend-focused answers', () => {
      const response: JobRoleResponse = {
        answers: [
          {
            questionId: 'tech-stack',
            selectedOptionIds: ['backend-tech', 'cloud-tech'],
            timestamp: new Date()
          },
          {
            questionId: 'primary-responsibility',
            selectedOptionIds: ['server-apis'],
            timestamp: new Date()
          },
          {
            questionId: 'daily-tools',
            selectedOptionIds: ['code-editors', 'terminal-cli', 'docker-containers'],
            timestamp: new Date()
          },
          {
            questionId: 'work-focus',
            selectedOptionIds: ['building-features', 'optimizing-performance'],
            timestamp: new Date()
          },
          {
            questionId: 'career-goals',
            selectedOptionIds: ['technical-depth'],
            timestamp: new Date()
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 400000), // 6.7 minutes
        completionRate: 100,
        skipped: false
      };

      const result = service.detectJobRole(response);
      
      expect(result.primaryRole).toBe('backend-developer');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.recommendations).toContain('Install vscode - an essential tool for Backend Developer roles');
    });

    it('should handle mixed signals with appropriate alternative roles', () => {
      const response: JobRoleResponse = {
        answers: [
          {
            questionId: 'tech-stack',
            selectedOptionIds: ['frontend-tech', 'backend-tech', 'cloud-tech'],
            timestamp: new Date()
          },
          {
            questionId: 'primary-responsibility',
            selectedOptionIds: ['building-ui'],
            timestamp: new Date()
          },
          {
            questionId: 'daily-tools',
            selectedOptionIds: ['code-editors', 'terminal-cli', 'docker-containers'],
            timestamp: new Date()
          },
          {
            questionId: 'work-focus',
            selectedOptionIds: ['building-features'],
            timestamp: new Date()
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 300000),
        completionRate: 80,
        skipped: false
      };

      const result = service.detectJobRole(response);
      
      // Expect a primary role with some alternatives
      expect(result.primaryRole).toBeDefined();
      expect(result.alternativeRoles.length).toBeGreaterThan(0);
      
      // In this mixed case, confidence should be relatively lower
      expect(result.confidence).toBeLessThan(0.9);
    });

    it('should throw error for insufficient answers', () => {
      const response: JobRoleResponse = {
        answers: [
          {
            questionId: 'tech-stack',
            selectedOptionIds: ['frontend-tech'],
            timestamp: new Date()
          }
        ],
        startTime: new Date(),
        completionRate: 20,
        skipped: false
      };

      expect(() => service.detectJobRole(response)).toThrow('Insufficient answers');
    });

    it('should have lower confidence for skipped questionnaires', () => {
      const response: JobRoleResponse = {
        answers: [
          {
            questionId: 'tech-stack',
            selectedOptionIds: ['frontend-tech'],
            timestamp: new Date()
          },
          {
            questionId: 'primary-responsibility',
            selectedOptionIds: ['building-ui'],
            timestamp: new Date()
          },
          {
            questionId: 'daily-tools',
            selectedOptionIds: ['code-editors'],
            timestamp: new Date()
          },
          {
            questionId: 'work-focus',
            selectedOptionIds: ['building-features'],
            timestamp: new Date()
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 60000), // Just 1 minute
        completionRate: 80,
        skipped: true
      };

      const normalResponse = {
        ...response,
        skipped: false
      };

      const skippedResult = service.detectJobRole(response);
      const normalResult = service.detectJobRole(normalResponse);

      expect(skippedResult.confidence).toBeLessThan(normalResult.confidence);
    });

    it('should adjust confidence based on completion rate', () => {
      const lowCompletionResponse: JobRoleResponse = {
        answers: [
          {
            questionId: 'tech-stack',
            selectedOptionIds: ['frontend-tech'],
            timestamp: new Date()
          },
          {
            questionId: 'primary-responsibility',
            selectedOptionIds: ['building-ui'],
            timestamp: new Date()
          },
          {
            questionId: 'daily-tools',
            selectedOptionIds: ['code-editors'],
            timestamp: new Date()
          },
          {
            questionId: 'work-focus',
            selectedOptionIds: ['building-features'],
            timestamp: new Date()
          }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 300000),
        completionRate: 40, // Lower completion rate
        skipped: false
      };

      const highCompletionResponse: JobRoleResponse = {
        ...lowCompletionResponse,
        completionRate: 100 // Higher completion rate
      };

      const lowResult = service.detectJobRole(lowCompletionResponse);
      const highResult = service.detectJobRole(highCompletionResponse);

      expect(lowResult.confidence).toBeLessThan(highResult.confidence);
    });
  });

  describe('getRoleConfigs', () => {
    it('should return all role configurations', () => {
      const configs = service.getRoleConfigs();
      expect(configs).toHaveLength(2);
      expect(configs[0].id).toBe('frontend-developer');
      expect(configs[1].id).toBe('backend-developer');
    });
  });

  describe('isConfidenceSufficient', () => {
    it('should return true for confidence above threshold', () => {
      expect(service.isConfidenceSufficient(DEFAULT_CONFIDENCE_THRESHOLD + 0.1)).toBe(true);
    });

    it('should return false for confidence below threshold', () => {
      expect(service.isConfidenceSufficient(DEFAULT_CONFIDENCE_THRESHOLD - 0.1)).toBe(false);
    });
  });
}); 