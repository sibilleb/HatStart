/**
 * Tests for Job Role Assessment Service
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JobRole, JobRoleResponse } from '../../types/job-role-types';
import { DEFAULT_CONFIDENCE_THRESHOLD, JOB_ROLE_QUESTIONS, JobRoleAssessmentService } from '../job-role-assessment';

// Create mock for the JobRoleConfigService
vi.mock('../job-role-config-service', () => ({
  JobRoleConfigService: vi.fn().mockImplementation(() => {
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
          categories: ['ui', 'web', 'javascript']
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
          categories: ['api', 'database', 'server']
        }
      ]
    };
  })
}));

describe('JobRoleAssessmentService', () => {
  let service: JobRoleAssessmentService;

  beforeEach(() => {
    service = new JobRoleAssessmentService();
  });

  describe('Role Questions', () => {
    it('should have questions for all roles', () => {
      expect(JOB_ROLE_QUESTIONS).toBeDefined();
      expect(Object.keys(JOB_ROLE_QUESTIONS).length).toBeGreaterThan(0);
    });

    it('should have valid questions for frontend developer role', () => {
      const questions = JOB_ROLE_QUESTIONS['frontend-developer'];
      expect(questions).toBeDefined();
      expect(questions.length).toBeGreaterThan(0);
      
      // Verify question structure
      questions.forEach(question => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('question');
        expect(question).toHaveProperty('answers');
        expect(question.answers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Role Matching', () => {
    it('should match frontend developer role based on responses', () => {
      const responses: JobRoleResponse[] = [
        {
          questionId: 'project-type',
          answer: 'web-frontend'
        },
        {
          questionId: 'primary-focus',
          answer: 'ui-ux'
        },
        {
          questionId: 'team-size',
          answer: 'small'
        },
        {
          questionId: 'tech-preference',
          answer: 'javascript'
        },
        {
          questionId: 'deployment-target',
          answer: 'browser'
        }
      ];

      const result = service.assessJobRole(responses);
      
      expect(result).toBeDefined();
      expect(result.recommendedRole).toBe('frontend-developer');
      expect(result.confidence).toBeGreaterThan(DEFAULT_CONFIDENCE_THRESHOLD);
      expect(result.roleScores).toHaveProperty('frontend-developer');
      expect(result.roleScores['frontend-developer']).toBeGreaterThan(0);
    });

    it('should match backend developer role based on responses', () => {
      const responses: JobRoleResponse[] = [
        {
          questionId: 'project-type',
          answer: 'web-backend'
        },
        {
          questionId: 'primary-focus',
          answer: 'api-development'
        },
        {
          questionId: 'team-size',
          answer: 'medium'
        },
        {
          questionId: 'tech-preference',
          answer: 'nodejs'
        },
        {
          questionId: 'deployment-target',
          answer: 'server'
        }
      ];

      const result = service.assessJobRole(responses);
      
      expect(result).toBeDefined();
      expect(result.recommendedRole).toBe('backend-developer');
      expect(result.confidence).toBeGreaterThan(DEFAULT_CONFIDENCE_THRESHOLD);
    });

    it('should return null recommendation when confidence is too low', () => {
      const responses: JobRoleResponse[] = [
        {
          questionId: 'project-type',
          answer: 'mobile'
        },
        {
          questionId: 'primary-focus',
          answer: 'data-analysis'
        },
        {
          questionId: 'team-size',
          answer: 'large'
        }
      ];

      const result = service.assessJobRole(responses);
      
      expect(result).toBeDefined();
      expect(result.recommendedRole).toBeNull();
      expect(result.confidence).toBeLessThan(DEFAULT_CONFIDENCE_THRESHOLD);
    });

    it('should rank multiple roles by match score', () => {
      const responses: JobRoleResponse[] = [
        {
          questionId: 'project-type',
          answer: 'web-fullstack'
        },
        {
          questionId: 'primary-focus',
          answer: 'ui-ux'
        },
        {
          questionId: 'team-size',
          answer: 'small'
        },
        {
          questionId: 'tech-preference',
          answer: 'javascript'
        },
        {
          questionId: 'deployment-target',
          answer: 'browser'
        }
      ];

      const result = service.assessJobRole(responses);
      
      expect(result).toBeDefined();
      expect(result.roleScores).toBeDefined();
      
      // Should have scores for multiple roles
      const roleScoreEntries = Object.entries(result.roleScores);
      expect(roleScoreEntries.length).toBeGreaterThan(1);
      
      // Scores should be sorted in descending order
      for (let i = 1; i < roleScoreEntries.length; i++) {
        expect(roleScoreEntries[i - 1][1]).toBeGreaterThanOrEqual(roleScoreEntries[i][1]);
      }
    });
  });

  describe('Question Handling', () => {
    it('should handle empty responses gracefully', () => {
      const responses: JobRoleResponse[] = [];
      const result = service.assessJobRole(responses);
      
      expect(result).toBeDefined();
      expect(result.recommendedRole).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('should handle invalid question IDs', () => {
      const responses: JobRoleResponse[] = [
        {
          questionId: 'invalid-question-id',
          answer: 'some-answer'
        }
      ];
      
      // Should not throw and should return low confidence
      const result = service.assessJobRole(responses);
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(DEFAULT_CONFIDENCE_THRESHOLD);
    });

    it('should get questions for a specific role', () => {
      const questions = service.getQuestionsForRole('frontend-developer' as JobRole);
      expect(questions).toBeDefined();
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid role', () => {
      const questions = service.getQuestionsForRole('invalid-role' as JobRole);
      expect(questions).toBeDefined();
      expect(questions).toEqual([]);
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate higher confidence with more matching answers', () => {
      const manyMatchingResponses: JobRoleResponse[] = [
        { questionId: 'project-type', answer: 'web-frontend' },
        { questionId: 'primary-focus', answer: 'ui-ux' },
        { questionId: 'team-size', answer: 'small' },
        { questionId: 'tech-preference', answer: 'javascript' },
        { questionId: 'deployment-target', answer: 'browser' }
      ];

      const fewMatchingResponses: JobRoleResponse[] = [
        { questionId: 'project-type', answer: 'web-frontend' },
        { questionId: 'primary-focus', answer: 'data-analysis' }
      ];

      const result1 = service.assessJobRole(manyMatchingResponses);
      const result2 = service.assessJobRole(fewMatchingResponses);

      expect(result1.confidence).toBeGreaterThan(result2.confidence);
    });

    it('should have confidence between 0 and 1', () => {
      const responses: JobRoleResponse[] = [
        { questionId: 'project-type', answer: 'web-frontend' },
        { questionId: 'primary-focus', answer: 'ui-ux' }
      ];

      const result = service.assessJobRole(responses);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});