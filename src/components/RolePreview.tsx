import React from 'react';
import type { RolePreviewProps } from '../types/job-role-types';

/**
 * RolePreview component - Shows detected job roles with confidence levels
 */
export const RolePreview: React.FC<RolePreviewProps> = ({
  detectedRoles,
  isVisible,
  maxRolesToShow = 3
}) => {
  if (!isVisible || detectedRoles.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-secondary-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-sm text-secondary-500">
          Answer a few questions to see role matches
        </p>
      </div>
    );
  }

  const rolesToShow = detectedRoles.slice(0, maxRolesToShow);

  return (
    <div className="space-y-4" data-testid="role-preview">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-secondary-900 mb-1">
          Role Matches
        </h3>
        <p className="text-sm text-secondary-600">
          Based on your responses
        </p>
      </div>

      <div className="space-y-3">
        {rolesToShow.map((item, index) => {
          const confidencePercentage = Math.round(item.confidence * 100);
          const isTopMatch = index === 0;
          
          return (
            <div
              key={item.role}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                isTopMatch 
                  ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200' 
                  : 'border-secondary-200 bg-white'
              }`}
              data-testid={`role-match-${item.role}`}
            >
              <div className="flex items-start space-x-3">
                <div 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                    isTopMatch ? 'bg-primary-100' : 'bg-secondary-100'
                  }`}
                  style={{ 
                    backgroundColor: isTopMatch ? item.config.color + '20' : undefined,
                    color: isTopMatch ? item.config.color : undefined
                  }}
                >
                  {item.config.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium text-sm ${
                      isTopMatch ? 'text-primary-900' : 'text-secondary-900'
                    }`}>
                      {item.config.name}
                      {isTopMatch && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                          Top match
                        </span>
                      )}
                    </h4>
                  </div>
                  
                  <p className={`text-xs mb-2 ${
                    isTopMatch ? 'text-primary-700' : 'text-secondary-600'
                  }`}>
                    {item.config.description}
                  </p>

                  {/* Confidence Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={isTopMatch ? 'text-primary-600' : 'text-secondary-500'}>
                        Confidence
                      </span>
                      <span className={`font-medium ${
                        isTopMatch ? 'text-primary-900' : 'text-secondary-700'
                      }`}>
                        {confidencePercentage}%
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 ${
                      isTopMatch ? 'bg-primary-200' : 'bg-secondary-200'
                    }`}>
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isTopMatch ? 'bg-primary-600' : 'bg-secondary-400'
                        }`}
                        style={{ 
                          width: `${confidencePercentage}%`,
                          backgroundColor: isTopMatch ? item.config.color : undefined
                        }}
                      />
                    </div>
                  </div>

                  {/* Skill Areas Preview */}
                  {item.config.skillAreas && item.config.skillAreas.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {item.config.skillAreas.slice(0, 3).map((skill) => (
                          <span
                            key={skill}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                              isTopMatch 
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-secondary-100 text-secondary-600'
                            }`}
                          >
                            {skill}
                          </span>
                        ))}
                        {item.config.skillAreas.length > 3 && (
                          <span className={`text-xs ${
                            isTopMatch ? 'text-primary-600' : 'text-secondary-500'
                          }`}>
                            +{item.config.skillAreas.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {detectedRoles.length > maxRolesToShow && (
        <div className="text-center pt-2">
          <p className="text-xs text-secondary-500">
            +{detectedRoles.length - maxRolesToShow} more potential matches
          </p>
        </div>
      )}

      {/* Explanation */}
      <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-3 mt-4">
        <p className="text-xs text-secondary-600 leading-relaxed">
          <strong>How this works:</strong> We analyze your responses to suggest roles that match your 
          work patterns and technology preferences. The more questions you answer, the more accurate 
          the suggestions become.
        </p>
      </div>
    </div>
  );
}; 