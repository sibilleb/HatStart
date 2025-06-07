/**
 * Experience Assessment Service
 * Provides questionnaire content and scoring algorithm for determining user experience level
 */

import type {
    ExperienceAssessment,
    ExperienceQuestion,
    QuestionAnswer,
    QuestionnaireResponse,
    ScoringConfig
} from '../types/experience-types';
import { DEFAULT_SCORING_CONFIG, ExperienceLevel } from '../types/experience-types';

/**
 * Comprehensive questionnaire for assessing developer experience
 * Questions are designed to gauge both breadth and depth of technical knowledge
 */
export const EXPERIENCE_QUESTIONS: ExperienceQuestion[] = [
  {
    id: 'dev-years',
    text: 'How long have you been programming?',
    type: 'single-choice',
    category: 'general',
    weight: 1.5,
    required: true,
    options: [
      { id: 'less-1', text: 'Less than 1 year', value: 10, experienceIndicator: ExperienceLevel.Beginner },
      { id: '1-3', text: '1-3 years', value: 30, experienceIndicator: ExperienceLevel.Beginner },
      { id: '3-5', text: '3-5 years', value: 50, experienceIndicator: ExperienceLevel.Intermediate },
      { id: '5-10', text: '5-10 years', value: 70, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'more-10', text: 'More than 10 years', value: 90, experienceIndicator: ExperienceLevel.Advanced }
    ]
  },
  {
    id: 'languages-count',
    text: 'How many programming languages are you comfortable working with?',
    type: 'single-choice',
    category: 'languages',
    weight: 1.2,
    required: true,
    helpText: 'Consider languages you could write a small project in without constant reference',
    options: [
      { id: 'none-1', text: '0-1 languages', value: 10, experienceIndicator: ExperienceLevel.Beginner },
      { id: '2-3', text: '2-3 languages', value: 40, experienceIndicator: ExperienceLevel.Intermediate },
      { id: '4-5', text: '4-5 languages', value: 70, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'more-5', text: 'More than 5 languages', value: 90, experienceIndicator: ExperienceLevel.Advanced }
    ]
  },
  {
    id: 'version-control',
    text: 'What is your experience with version control systems (Git)?',
    type: 'single-choice',
    category: 'tools',
    weight: 1.3,
    required: true,
    options: [
      { id: 'none', text: "I haven't used version control", value: 0, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'basic', text: 'Basic usage (clone, commit, push)', value: 30, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'branching', text: 'Comfortable with branching and merging', value: 60, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'advanced', text: 'Advanced (rebasing, cherry-picking, workflows)', value: 90, experienceIndicator: ExperienceLevel.Advanced }
    ]
  },
  {
    id: 'debugging-approach',
    text: 'How do you typically approach debugging complex issues?',
    type: 'single-choice',
    category: 'skills',
    weight: 1.4,
    required: true,
    options: [
      { id: 'print', text: 'Mainly use print statements', value: 20, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'debugger', text: 'Use IDE debugger and breakpoints', value: 50, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'tools', text: 'Profilers, memory analyzers, and specialized tools', value: 80, experienceIndicator: ExperienceLevel.Advanced },
      { id: 'systematic', text: 'Systematic approach with multiple advanced tools', value: 95, experienceIndicator: ExperienceLevel.Advanced }
    ]
  },
  {
    id: 'project-complexity',
    text: 'What is the most complex project you have worked on?',
    type: 'single-choice',
    category: 'experience',
    weight: 1.5,
    required: true,
    helpText: 'Consider the project you are most proud of or found most challenging',
    options: [
      { id: 'small', text: 'Small personal projects or tutorials', value: 15, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'medium', text: 'Medium-sized applications with multiple features', value: 45, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'large', text: 'Large applications with complex architecture', value: 75, experienceIndicator: ExperienceLevel.Advanced },
      { id: 'enterprise', text: 'Enterprise systems with millions of users', value: 95, experienceIndicator: ExperienceLevel.Advanced }
    ]
  },
  {
    id: 'testing-practices',
    text: 'How familiar are you with testing practices?',
    type: 'single-choice',
    category: 'practices',
    weight: 1.2,
    required: true,
    options: [
      { id: 'none', text: "I don't write tests", value: 10, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'basic', text: 'Basic unit tests', value: 35, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'comprehensive', text: 'Unit, integration, and some E2E tests', value: 65, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'tdd', text: 'TDD/BDD, comprehensive test strategies', value: 90, experienceIndicator: ExperienceLevel.Advanced }
    ]
  },
  {
    id: 'deployment-experience',
    text: 'Have you deployed applications to production?',
    type: 'single-choice',
    category: 'deployment',
    weight: 1.3,
    required: true,
    options: [
      { id: 'never', text: 'Never deployed to production', value: 10, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'guided', text: 'Yes, with help or following guides', value: 40, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'independent', text: 'Yes, independently multiple times', value: 70, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'cicd', text: 'Set up CI/CD pipelines and infrastructure', value: 90, experienceIndicator: ExperienceLevel.Advanced }
    ]
  },
  {
    id: 'learning-style',
    text: 'How do you prefer to learn new technologies?',
    type: 'single-choice',
    category: 'learning',
    weight: 0.8,
    required: false,
    helpText: 'This helps us recommend appropriate resources',
    options: [
      { id: 'tutorials', text: 'Step-by-step tutorials and videos', value: 30, experienceIndicator: ExperienceLevel.Beginner },
      { id: 'docs', text: 'Official documentation and guides', value: 50, experienceIndicator: ExperienceLevel.Intermediate },
      { id: 'code', text: 'Reading source code and examples', value: 70, experienceIndicator: ExperienceLevel.Advanced },
      { id: 'experiment', text: 'Experimenting and building projects', value: 60, experienceIndicator: ExperienceLevel.Intermediate }
    ]
  },
  {
    id: 'comfort-cli',
    text: 'How comfortable are you with command-line interfaces?',
    type: 'scale',
    category: 'tools',
    weight: 1.1,
    required: true,
    minValue: 1,
    maxValue: 10,
    minLabel: 'Prefer GUI only',
    maxLabel: 'CLI power user',
    helpText: 'Rate from 1 (avoid CLI) to 10 (prefer CLI for everything)'
  },
  {
    id: 'open-source',
    text: 'Have you contributed to open-source projects?',
    type: 'single-choice',
    category: 'collaboration',
    weight: 1.0,
    required: false,
    options: [
      { id: 'never', text: 'Never', value: 20 },
      { id: 'issues', text: 'Reported issues only', value: 40 },
      { id: 'small-prs', text: 'Small contributions (docs, fixes)', value: 60 },
      { id: 'features', text: 'Major features or maintain projects', value: 90 }
    ]
  }
];

/**
 * Experience Assessment Service
 */
export class ExperienceAssessmentService {
  private config: ScoringConfig;

  constructor(config: ScoringConfig = DEFAULT_SCORING_CONFIG) {
    this.config = config;
  }

  /**
   * Get all questionnaire questions
   */
  getQuestions(): ExperienceQuestion[] {
    return EXPERIENCE_QUESTIONS;
  }

  /**
   * Calculate experience assessment from questionnaire responses
   */
  calculateAssessment(response: QuestionnaireResponse): ExperienceAssessment {
    const startTime = new Date();
    
    // Validate minimum answers
    const answeredQuestions = response.answers.filter(a => 
      this.isAnswerValid(a, EXPERIENCE_QUESTIONS.find(q => q.id === a.questionId))
    );

    if (answeredQuestions.length < this.config.minimumAnswersRequired) {
      throw new Error(`Insufficient answers. Minimum required: ${this.config.minimumAnswersRequired}`);
    }

    // Calculate scores
    const { totalScore, maxScore, categoryBreakdown } = this.calculateScores(answeredQuestions);
    const normalizedScore = (totalScore / maxScore) * 100;

    // Determine experience level
    const level = this.determineLevel(normalizedScore);

    // Calculate confidence
    const confidence = this.calculateConfidence(response, answeredQuestions.length);

    // Generate recommendations
    const recommendations = this.generateRecommendations(level, categoryBreakdown);

    return {
      level,
      score: Math.round(normalizedScore),
      confidence,
      breakdown: categoryBreakdown,
      recommendations,
      timestamp: startTime
    };
  }

  /**
   * Calculate weighted scores from answers
   */
  private calculateScores(answers: QuestionAnswer[]): {
    totalScore: number;
    maxScore: number;
    categoryBreakdown: Array<{ category: string; score: number; maxScore: number }>;
  } {
    let totalScore = 0;
    let maxScore = 0;
    const categoryScores: Record<string, { score: number; max: number }> = {};

    for (const answer of answers) {
      const question = EXPERIENCE_QUESTIONS.find(q => q.id === answer.questionId);
      if (!question) continue;

      const weight = question.weight || 1;
      const category = question.category || 'general';
      const score = this.getAnswerScore(answer, question) * weight;
      const questionMaxScore = this.getMaxScore(question) * weight;

      totalScore += score;
      maxScore += questionMaxScore;

      if (!categoryScores[category]) {
        categoryScores[category] = { score: 0, max: 0 };
      }
      categoryScores[category].score += score;
      categoryScores[category].max += questionMaxScore;
    }

    const categoryBreakdown = Object.entries(categoryScores).map(([category, scores]) => ({
      category,
      score: Math.round(scores.score),
      maxScore: Math.round(scores.max)
    }));

    return { totalScore, maxScore, categoryBreakdown };
  }

  /**
   * Get score for a specific answer
   */
  private getAnswerScore(answer: QuestionAnswer, question: ExperienceQuestion): number {
    switch (question.type) {
      case 'single-choice':
      case 'multiple-choice': {
        const option = question.options?.find(o => o.id === answer.value);
        return option?.value || 0;
      }

      case 'scale': {
        const value = typeof answer.value === 'number' ? answer.value : parseInt(answer.value as string);
        const min = question.minValue || 1;
        const max = question.maxValue || 10;
        return ((value - min) / (max - min)) * 100;
      }

      case 'yes-no':
        return answer.value === true || answer.value === 'yes' ? 100 : 0;

      case 'multi-select':
        if (Array.isArray(answer.value) && question.options) {
          return answer.value.reduce((sum, selectedId) => {
            const option = question.options?.find(o => o.id === selectedId);
            return sum + (option?.value || 0);
          }, 0) / answer.value.length;
        }
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Get maximum possible score for a question
   */
  private getMaxScore(question: ExperienceQuestion): number {
    switch (question.type) {
      case 'single-choice':
        return Math.max(...(question.options?.map(o => o.value) || [0]));
      
      case 'scale':
      case 'yes-no':
        return 100;

      case 'multiple-choice':
      case 'multi-select':
        return question.options ? 
          Math.max(...question.options.map(o => o.value)) : 0;

      default:
        return 100;
    }
  }

  /**
   * Determine experience level from normalized score
   */
  private determineLevel(score: number): ExperienceLevel {
    const { thresholds } = this.config;

    if (score <= thresholds.beginner.max) {
      return ExperienceLevel.Beginner;
    } else if (score <= thresholds.intermediate.max) {
      return ExperienceLevel.Intermediate;
    } else {
      return ExperienceLevel.Advanced;
    }
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(response: QuestionnaireResponse, answeredCount: number): number {
    const totalQuestions = EXPERIENCE_QUESTIONS.filter(q => q.required).length;
    const completionRate = response.completionRate / 100;
    const answerRate = answeredCount / totalQuestions;
    
    // Consider time spent (too fast might indicate random answers)
    const timeSpent = response.endTime ? 
      (response.endTime.getTime() - response.startTime.getTime()) / 1000 : 0;
    const timeConfidence = Math.min(timeSpent / (totalQuestions * 10), 1); // 10 seconds per question

    return Math.round((completionRate * 0.4 + answerRate * 0.4 + timeConfidence * 0.2) * 100) / 100;
  }

  /**
   * Generate personalized recommendations based on assessment
   */
  private generateRecommendations(
    level: ExperienceLevel, 
    breakdown: Array<{ category: string; score: number; maxScore: number }>
  ): string[] {
    const recommendations: string[] = [];

    // Level-specific recommendations
    switch (level) {
      case ExperienceLevel.Beginner:
        recommendations.push(
          'Focus on learning one programming language deeply before branching out',
          'Start with GUI-based tools before moving to command-line interfaces',
          'Look for tools with extensive documentation and tutorials'
        );
        break;

      case ExperienceLevel.Intermediate:
        recommendations.push(
          'Explore more advanced features of the tools you already use',
          'Consider learning about CI/CD and automated testing',
          'Try contributing to open-source projects to gain experience'
        );
        break;

      case ExperienceLevel.Advanced:
        recommendations.push(
          'Explore cutting-edge tools and experimental technologies',
          'Consider mentoring others or creating educational content',
          'Focus on architecture and system design tools'
        );
        break;
    }

    // Category-specific recommendations
    const weakCategories = breakdown
      .filter(b => (b.score / b.maxScore) < 0.5)
      .map(b => b.category);

    if (weakCategories.includes('testing')) {
      recommendations.push('Consider improving your testing skills with tools like Jest or Cypress');
    }

    if (weakCategories.includes('deployment')) {
      recommendations.push('Learn about containerization with Docker and orchestration with Kubernetes');
    }

    return recommendations;
  }

  /**
   * Validate if an answer is valid
   */
  private isAnswerValid(answer: QuestionAnswer, question?: ExperienceQuestion): boolean {
    if (!question || answer.value === null || answer.value === undefined) {
      return false;
    }

    switch (question.type) {
      case 'single-choice':
      case 'multiple-choice':
        return question.options?.some(o => o.id === answer.value) || false;

      case 'scale': {
        const value = typeof answer.value === 'number' ? answer.value : parseInt(answer.value as string);
        return !isNaN(value) && 
          value >= (question.minValue || 1) && 
          value <= (question.maxValue || 10);
      }

      case 'yes-no':
        return typeof answer.value === 'boolean' || 
          answer.value === 'yes' || 
          answer.value === 'no';

      case 'multi-select':
        return Array.isArray(answer.value) && answer.value.length > 0;

      default:
        return true;
    }
  }

  /**
   * Get experience level from a score (utility method)
   */
  getExperienceLevelFromScore(score: number): ExperienceLevel {
    return this.determineLevel(score);
  }

  /**
   * Validate scoring configuration
   */
  validateConfig(config: ScoringConfig): boolean {
    const { thresholds } = config;
    
    return (
      thresholds.beginner.min === 0 &&
      thresholds.beginner.max < thresholds.intermediate.min &&
      thresholds.intermediate.max < thresholds.advanced.min &&
      thresholds.advanced.max === 100 &&
      config.minimumAnswersRequired > 0 &&
      config.confidenceThreshold >= 0 &&
      config.confidenceThreshold <= 1
    );
  }
}

// Export a default instance
export const experienceAssessment = new ExperienceAssessmentService(); 