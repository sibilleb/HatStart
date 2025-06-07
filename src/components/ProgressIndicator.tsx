import React from 'react';

/**
 * Props for ProgressIndicator component
 */
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  showLabels?: boolean;
}

/**
 * ProgressIndicator component - Shows progress through questionnaire steps
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  completedSteps,
  showLabels = false
}) => {
  const progressPercentage = (currentStep / (totalSteps - 1)) * 100;
  const completionPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="w-full" data-testid="progress-indicator">
      {showLabels && (
        <div className="flex justify-between items-center mb-2 text-sm text-primary-100">
          <span>Progress</span>
          <span>{currentStep + 1} of {totalSteps}</span>
        </div>
      )}
      
      <div className="relative">
        {/* Background track */}
        <div className="w-full bg-primary-300 rounded-full h-2">
          {/* Completion progress */}
          <div 
            className="bg-primary-100 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
          {/* Current position indicator */}
          <div 
            className="absolute top-0 h-2 w-1 bg-white rounded-full transition-all duration-300 ease-out"
            style={{ left: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Step indicators */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              index < completedSteps
                ? 'bg-white'
                : index === currentStep
                ? 'bg-primary-200 ring-2 ring-white'
                : 'bg-primary-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}; 