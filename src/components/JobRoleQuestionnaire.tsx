import React, { useCallback, useEffect, useState } from 'react';
import type {
    JobRole,
    JobRoleAnswer,
    JobRoleConfig,
    JobRoleDetectionResult,
    JobRoleQuestionnaireProps
} from '../types/job-role-types';
import { ProgressIndicator } from './ProgressIndicator';
import { QuestionStep } from './QuestionStep';
import { RolePreview } from './RolePreview';

/**
 * JobRoleQuestionnaire component - Main container for job role identification
 * Provides a skippable multi-step questionnaire with real-time role detection
 */
export const JobRoleQuestionnaire: React.FC<JobRoleQuestionnaireProps> = ({
  questions,
  roleConfigs,
  onComplete,
  onSkip,
  isVisible,
  allowSkip = true,
  showProgress = true,
  showRolePreview = true,
  animationDuration = 300
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<JobRoleAnswer[]>([]);
  const [detectedRoles, setDetectedRoles] = useState<{
    role: JobRole;
    confidence: number;
    config: JobRoleConfig;
  }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate role detection based on current answers
  const calculateRoleDetection = useCallback(() => {
    const roleScores = new Map<JobRole, number>();
    
    // Initialize scores for all roles
    roleConfigs.forEach(config => {
      roleScores.set(config.id, 0);
    });

    // Calculate scores based on answers
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return;

      answer.selectedOptionIds.forEach(optionId => {
        const option = question.options.find(opt => opt.id === optionId);
        if (!option) return;

        option.roleIndicators.forEach(indicator => {
          const currentScore = roleScores.get(indicator.role) || 0;
          roleScores.set(indicator.role, currentScore + indicator.weight);
        });
      });
    });

    // Convert to sorted array with confidence scores
    const totalQuestions = questions.length;
    const answeredQuestions = answers.length;
    const progressMultiplier = answeredQuestions / totalQuestions;

    const rolesWithConfidence = Array.from(roleScores.entries())
      .map(([role, score]) => {
        const config = roleConfigs.find(c => c.id === role)!;
        const maxPossibleScore = questions.reduce((total, q) => {
          const maxScoreForRole = Math.max(
            ...q.options.map(opt => 
              opt.roleIndicators.find(ind => ind.role === role)?.weight || 0
            )
          );
          return total + maxScoreForRole;
        }, 0);
        
        const normalizedConfidence = maxPossibleScore > 0 
          ? (score / maxPossibleScore) * progressMultiplier 
          : 0;
        
        return {
          role,
          confidence: Math.min(normalizedConfidence, 1),
          config
        };
      })
      .filter(item => item.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Top 3 roles

    setDetectedRoles(rolesWithConfidence);
  }, [answers, questions, roleConfigs]);

  // Update role detection when answers change
  useEffect(() => {
    calculateRoleDetection();
  }, [calculateRoleDetection]);

  const handleAnswerChange = (optionIds: string[], customAnswer?: string) => {
    const currentQuestion = questions[currentStep];
    const existingAnswerIndex = answers.findIndex(a => a.questionId === currentQuestion.id);
    
    const newAnswer: JobRoleAnswer = {
      questionId: currentQuestion.id,
      selectedOptionIds: optionIds,
      customAnswer,
      timestamp: new Date()
    };

    if (existingAnswerIndex >= 0) {
      // Update existing answer
      const newAnswers = [...answers];
      newAnswers[existingAnswerIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      // Add new answer
      setAnswers([...answers, newAnswer]);
    }
  };

  const handleNext = async () => {
    if (currentStep < questions.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, animationDuration / 2);
    } else {
      // Complete questionnaire
      handleComplete();
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, animationDuration / 2);
    }
  };

  const handleComplete = () => {
    const endTime = new Date();
    
    // Determine primary role and alternatives
    const primaryRole = detectedRoles[0]?.role || 'custom';
    const alternativeRoles = detectedRoles.slice(1).map(item => ({
      role: item.role,
      confidence: item.confidence
    }));

    // Generate tool recommendations
    const primaryConfig = roleConfigs.find(c => c.id === primaryRole);
    const recommendations = primaryConfig 
      ? [...primaryConfig.primaryTools, ...primaryConfig.recommendedTools]
      : [];

    const result: JobRoleDetectionResult = {
      primaryRole,
      confidence: detectedRoles[0]?.confidence || 0,
      alternativeRoles,
      recommendations,
      timestamp: endTime
    };

    onComplete(result);
  };

  const handleSkip = () => {
    onSkip();
  };

  const getCurrentAnswer = () => {
    const currentQuestion = questions[currentStep];
    return answers.find(a => a.questionId === currentQuestion.id);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      data-testid="job-role-questionnaire"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-primary-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Let's personalize your setup</h1>
              <p className="text-primary-100 mt-1">
                Tell us about your role to get tailored tool recommendations
              </p>
            </div>
            {allowSkip && (
              <button
                onClick={handleSkip}
                className="text-primary-100 hover:text-white transition-colors duration-200 text-sm font-medium px-4 py-2 rounded-md hover:bg-primary-700"
                data-testid="skip-button"
              >
                Skip for now
              </button>
            )}
          </div>
          
          {showProgress && (
            <div className="mt-4">
              <ProgressIndicator
                currentStep={currentStep}
                totalSteps={questions.length}
                completedSteps={answers.length}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Question Area */}
          <div className={`flex-1 p-6 transition-opacity duration-${animationDuration} ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
            {questions[currentStep] && (
              <QuestionStep
                question={questions[currentStep]}
                selectedOptionIds={getCurrentAnswer()?.selectedOptionIds || []}
                onAnswerChange={handleAnswerChange}
                onNext={handleNext}
                onPrevious={handlePrevious}
                isFirst={currentStep === 0}
                isLast={currentStep === questions.length - 1}
                showSkip={allowSkip}
                onSkip={handleSkip}
              />
            )}
          </div>

          {/* Role Preview Sidebar */}
          {showRolePreview && answers.length > 0 && (
            <div className="w-80 border-l border-secondary-200 bg-secondary-50 p-6 overflow-y-auto">
              <RolePreview
                detectedRoles={detectedRoles}
                isVisible={true}
                maxRolesToShow={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-secondary-200 bg-secondary-50 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-secondary-600">
            <div>
              Question {currentStep + 1} of {questions.length}
            </div>
            <div className="flex items-center space-x-4">
              {detectedRoles.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span>Top match:</span>
                  <div className="flex items-center space-x-1">
                    <span>{detectedRoles[0].config.icon}</span>
                    <span className="font-medium text-secondary-900">
                      {detectedRoles[0].config.name}
                    </span>
                    <span className="text-xs text-secondary-500">
                      ({Math.round(detectedRoles[0].confidence * 100)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 