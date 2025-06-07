import React, { useState } from 'react';
import type { QuestionStepProps } from '../types/job-role-types';

/**
 * QuestionStep component - Renders an individual question in the questionnaire
 */
export const QuestionStep: React.FC<QuestionStepProps> = ({
  question,
  selectedOptionIds,
  onAnswerChange,
  onNext,
  onPrevious,
  isFirst,
  isLast,
  showSkip,
  onSkip
}) => {
  const [customAnswer, setCustomAnswer] = useState('');

  const handleOptionSelect = (optionId: string) => {
    let newSelectedIds: string[];

    if (question.type === 'single-choice' || question.type === 'work-focus') {
      // Single selection - replace current selection
      newSelectedIds = [optionId];
    } else {
      // Multi-selection - toggle option
      if (selectedOptionIds.includes(optionId)) {
        newSelectedIds = selectedOptionIds.filter(id => id !== optionId);
      } else {
        newSelectedIds = [...selectedOptionIds, optionId];
      }
    }

    onAnswerChange(newSelectedIds, customAnswer || undefined);
  };

  const handleCustomAnswerChange = (value: string) => {
    setCustomAnswer(value);
    onAnswerChange(selectedOptionIds, value || undefined);
  };

  const canProceed = selectedOptionIds.length > 0 || (question.allowCustomAnswer && customAnswer.trim());

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid={`question-step-${question.id}`}>
      {/* Question Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-secondary-900">
          {question.text}
        </h2>
        {question.helpText && (
          <p className="text-secondary-600 text-sm">
            {question.helpText}
          </p>
        )}
      </div>

      {/* Question Type Indicator */}
      <div className="text-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          {question.type === 'single-choice' || question.type === 'work-focus' 
            ? 'Select one' 
            : 'Select all that apply'}
        </span>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option) => {
          const isSelected = selectedOptionIds.includes(option.id);
          
          return (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all duration-200 
                hover:border-primary-300 hover:shadow-sm
                ${isSelected 
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
                  : 'border-secondary-200 bg-white'
                }
              `}
              data-testid={`option-${option.id}`}
            >
              <div className="flex items-start space-x-3">
                {option.icon && (
                  <span className="text-2xl flex-shrink-0 mt-1">
                    {option.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${
                      isSelected ? 'text-primary-900' : 'text-secondary-900'
                    }`}>
                      {option.text}
                    </span>
                    {isSelected && (
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  {option.description && (
                    <p className={`text-sm mt-1 ${
                      isSelected ? 'text-primary-700' : 'text-secondary-600'
                    }`}>
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Answer Input */}
      {question.allowCustomAnswer && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-secondary-700">
            Or describe your role:
          </label>
          <input
            type="text"
            value={customAnswer}
            onChange={(e) => handleCustomAnswerChange(e.target.value)}
            placeholder="e.g., Ansible Automation Developer, Kubernetes Platform Engineer..."
            className="input-base"
            data-testid="custom-answer-input"
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-secondary-200">
        <div>
          {!isFirst && (
            <button
              onClick={onPrevious}
              className="btn-secondary flex items-center space-x-2"
              data-testid="previous-button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {showSkip && (
            <button
              onClick={onSkip}
              className="text-secondary-600 hover:text-secondary-800 text-sm font-medium px-4 py-2"
              data-testid="skip-question-button"
            >
              Skip questionnaire
            </button>
          )}
          
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={`btn-primary flex items-center space-x-2 ${
              !canProceed ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            data-testid="next-button"
          >
            <span>{isLast ? 'Complete' : 'Next'}</span>
            {!isLast && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 