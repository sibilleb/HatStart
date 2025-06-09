/**
 * Tests for Experience Assessment Service
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { QuestionnaireResponse, ScoringConfig } from '../../types/experience-types';
import { DEFAULT_SCORING_CONFIG, ExperienceLevel } from '../../types/experience-types';
import { EXPERIENCE_QUESTIONS, ExperienceAssessmentService } from '../experience-assessment';

describe('ExperienceAssessmentService', () => {
  let service: ExperienceAssessmentService;

  beforeEach(() => {
    service = new ExperienceAssessmentService();
  });

  describe('getQuestions', () => {
    it('should return all experience questions', () => {
      const questions = service.getQuestions();
      expect(questions).toEqual(EXPERIENCE_QUESTIONS);
      expect(questions.length).toBe(10);
    });

    it('should have valid question structure', () => {
      const questions = service.getQuestions();
      questions.forEach(question => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('text');
        expect(question).toHaveProperty('type');
        
        if (question.type === 'single-choice' || question.type === 'multiple-choice') {
          expect(question.options).toBeDefined();
          expect(question.options!.length).toBeGreaterThan(0);
        }
        
        if (question.type === 'scale') {
          expect(question.minValue).toBeDefined();
          expect(question.maxValue).toBeDefined();
        }
      });
    });
  });

  describe('calculateAssessment', () => {
    it('should calculate beginner level for low scores', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: 'less-1' },
          { questionId: 'languages-count', value: 'none-1' },
          { questionId: 'version-control', value: 'none' },
          { questionId: 'debugging-approach', value: 'print' },
          { questionId: 'project-complexity', value: 'small' },
          { questionId: 'testing-practices', value: 'none' },
          { questionId: 'deployment-experience', value: 'never' },
          { questionId: 'comfort-cli', value: 2 }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 300000), // 5 minutes
        completionRate: 80
      };

      const assessment = service.calculateAssessment(response);
      
      expect(assessment.level).toBe(ExperienceLevel.Beginner);
      expect(assessment.score).toBeLessThanOrEqual(30);
      expect(assessment.confidence).toBeGreaterThan(0.5);
      expect(assessment.recommendations).toContain('Focus on learning one programming language deeply before branching out');
    });

    it('should calculate intermediate level for medium scores', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: '3-5' },
          { questionId: 'languages-count', value: '2-3' },
          { questionId: 'version-control', value: 'branching' },
          { questionId: 'debugging-approach', value: 'debugger' },
          { questionId: 'project-complexity', value: 'medium' },
          { questionId: 'testing-practices', value: 'comprehensive' },
          { questionId: 'deployment-experience', value: 'independent' },
          { questionId: 'comfort-cli', value: 6 }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 400000), // 6.7 minutes
        completionRate: 80
      };

      const assessment = service.calculateAssessment(response);
      
      expect(assessment.level).toBe(ExperienceLevel.Intermediate);
      expect(assessment.score).toBeGreaterThan(30);
      expect(assessment.score).toBeLessThanOrEqual(70);
      expect(assessment.recommendations).toContain('Consider learning about CI/CD and automated testing');
    });

    it('should calculate advanced level for high scores', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: 'more-10' },
          { questionId: 'languages-count', value: 'more-5' },
          { questionId: 'version-control', value: 'advanced' },
          { questionId: 'debugging-approach', value: 'systematic' },
          { questionId: 'project-complexity', value: 'enterprise' },
          { questionId: 'testing-practices', value: 'tdd' },
          { questionId: 'deployment-experience', value: 'cicd' },
          { questionId: 'comfort-cli', value: 9 },
          { questionId: 'open-source', value: 'features' }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 600000), // 10 minutes
        completionRate: 90
      };

      const assessment = service.calculateAssessment(response);
      
      expect(assessment.level).toBe(ExperienceLevel.Advanced);
      expect(assessment.score).toBeGreaterThan(70);
      expect(assessment.recommendations).toContain('Explore cutting-edge tools and experimental technologies');
    });

    it('should throw error for insufficient answers', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: 'less-1' },
          { questionId: 'languages-count', value: 'none-1' }
        ],
        startTime: new Date(),
        completionRate: 20
      };

      expect(() => service.calculateAssessment(response)).toThrow('Insufficient answers');
    });

    it('should handle scale questions correctly', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: '3-5' },
          { questionId: 'languages-count', value: '2-3' },
          { questionId: 'version-control', value: 'branching' },
          { questionId: 'debugging-approach', value: 'debugger' },
          { questionId: 'project-complexity', value: 'medium' },
          { questionId: 'comfort-cli', value: 10 } // Max scale value
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 300000),
        completionRate: 60
      };

      const assessment = service.calculateAssessment(response);
      expect(assessment).toBeDefined();
      expect(assessment.breakdown).toBeDefined();
      
      const toolsCategory = assessment.breakdown?.find(b => b.category === 'tools');
      expect(toolsCategory).toBeDefined();
    });

    it('should calculate category breakdown correctly', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: '3-5' },
          { questionId: 'languages-count', value: '2-3' },
          { questionId: 'version-control', value: 'branching' },
          { questionId: 'debugging-approach', value: 'debugger' },
          { questionId: 'project-complexity', value: 'medium' },
          { questionId: 'testing-practices', value: 'basic' },
          { questionId: 'deployment-experience', value: 'never' },
          { questionId: 'comfort-cli', value: 5 }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 300000),
        completionRate: 80
      };

      const assessment = service.calculateAssessment(response);
      
      expect(assessment.breakdown).toBeDefined();
      expect(assessment.breakdown!.length).toBeGreaterThan(0);
      
      const categories = assessment.breakdown!.map(b => b.category);
      expect(categories).toContain('general');
      expect(categories).toContain('tools');
      expect(categories).toContain('deployment');
      
      // Check for weak category recommendations
      const deploymentCategory = assessment.breakdown!.find(b => b.category === 'deployment');
      if (deploymentCategory && (deploymentCategory.score / deploymentCategory.maxScore) < 0.5) {
        expect(assessment.recommendations).toContain('Learn about containerization with Docker and orchestration with Kubernetes');
      }
    });

    it('should handle optional questions correctly', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: '3-5' },
          { questionId: 'languages-count', value: '2-3' },
          { questionId: 'version-control', value: 'branching' },
          { questionId: 'debugging-approach', value: 'debugger' },
          { questionId: 'project-complexity', value: 'medium' },
          { questionId: 'testing-practices', value: 'comprehensive' },
          { questionId: 'deployment-experience', value: 'independent' },
          { questionId: 'comfort-cli', value: 6 },
          // Optional questions
          { questionId: 'learning-style', value: 'docs' },
          { questionId: 'open-source', value: 'small-prs' }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 500000),
        completionRate: 100
      };

      const assessment = service.calculateAssessment(response);
      
      expect(assessment).toBeDefined();
      expect(assessment.confidence).toBeGreaterThan(0.7);
    });

    it('should calculate confidence based on completion rate and time', () => {
      const fastResponse: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: '3-5' },
          { questionId: 'languages-count', value: '2-3' },
          { questionId: 'version-control', value: 'branching' },
          { questionId: 'debugging-approach', value: 'debugger' },
          { questionId: 'project-complexity', value: 'medium' }
        ],
        startTime: new Date(),
        endTime: new Date(Date.now() + 10000), // Only 10 seconds
        completionRate: 50
      };

      const normalResponse: QuestionnaireResponse = {
        ...fastResponse,
        endTime: new Date(Date.now() + 300000), // 5 minutes
        completionRate: 80
      };

      const fastAssessment = service.calculateAssessment(fastResponse);
      const normalAssessment = service.calculateAssessment(normalResponse);

      expect(normalAssessment.confidence).toBeGreaterThan(fastAssessment.confidence);
    });
  });

  describe('getExperienceLevelFromScore', () => {
    it('should return correct level for different scores', () => {
      expect(service.getExperienceLevelFromScore(15)).toBe(ExperienceLevel.Beginner);
      expect(service.getExperienceLevelFromScore(30)).toBe(ExperienceLevel.Beginner);
      expect(service.getExperienceLevelFromScore(50)).toBe(ExperienceLevel.Intermediate);
      expect(service.getExperienceLevelFromScore(70)).toBe(ExperienceLevel.Intermediate);
      expect(service.getExperienceLevelFromScore(85)).toBe(ExperienceLevel.Advanced);
      expect(service.getExperienceLevelFromScore(100)).toBe(ExperienceLevel.Advanced);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      expect(service.validateConfig(DEFAULT_SCORING_CONFIG)).toBe(true);
    });

    it('should reject invalid configuration', () => {
      const invalidConfig: ScoringConfig = {
        ...DEFAULT_SCORING_CONFIG,
        thresholds: {
          beginner: { min: 10 as 0, max: 30 }, // Type assertion to satisfy the literal type
          intermediate: { min: 31, max: 70 },
          advanced: { min: 71, max: 100 }
        }
      };

      expect(service.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid answer values gracefully', () => {
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: 'invalid-option' },
          { questionId: 'languages-count', value: '2-3' },
          { questionId: 'version-control', value: 'branching' },
          { questionId: 'debugging-approach', value: 'debugger' },
          { questionId: 'project-complexity', value: 'medium' },
          { questionId: 'comfort-cli', value: 'not-a-number' }
        ],
        startTime: new Date(),
        completionRate: 60
      };

      // Should not throw, but invalid answers won't count
      expect(() => service.calculateAssessment(response)).not.toThrow();
    });

    it('should handle yes-no questions', () => {
      // Add a mock yes-no question answer
      const response: QuestionnaireResponse = {
        answers: [
          { questionId: 'dev-years', value: '3-5' },
          { questionId: 'languages-count', value: '2-3' },
          { questionId: 'version-control', value: 'branching' },
          { questionId: 'debugging-approach', value: 'debugger' },
          { questionId: 'project-complexity', value: 'medium' },
          { questionId: 'mock-yes-no', value: true } // Simulating a yes-no answer
        ],
        startTime: new Date(),
        completionRate: 60
      };

      const assessment = service.calculateAssessment(response);
      expect(assessment).toBeDefined();
    });
  });
}); 