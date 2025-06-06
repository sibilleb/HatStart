import React from 'react';
import type { RecommendedTool, Tool, ToolSelection } from '../types/ui-types';

interface RecommendationPanelProps {
  allTools: Tool[];
  currentSelection: ToolSelection;
  onSelectionChange: (selection: ToolSelection) => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * RecommendationPanel component displays intelligent tool suggestions
 * Based on user's current selection and detected environment
 */
export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  allTools,
  currentSelection,
  onSelectionChange,
  onDismiss,
  className = '',
}) => {
  // Generate recommendations based on current selection
  const generateRecommendations = (): RecommendedTool[] => {
    const recommendations: RecommendedTool[] = [];
    const selectedToolIds = Array.from(currentSelection.selectedTools);
    
    // Essential tools that are always recommended but not selected
    const essentialTools = allTools.filter(tool => 
      tool.isRecommended && 
      !tool.isInstalled && 
      !selectedToolIds.includes(tool.id)
    );

    // Add essential recommendations
    essentialTools.forEach(tool => {
      recommendations.push({
        ...tool,
        recommendationReason: 'essential',
      });
    });

    // Suggested tools based on current selection
    if (selectedToolIds.includes('node-js')) {
      const npmTool = allTools.find(tool => tool.id === 'npm');
      const yarnTool = allTools.find(tool => tool.id === 'yarn');
      
      if (npmTool && !selectedToolIds.includes('npm') && !npmTool.isInstalled) {
        recommendations.push({
          ...npmTool,
          recommendationReason: 'suggested',
          suggestedFor: 'Works great with Node.js',
        });
      }
      
      if (yarnTool && !selectedToolIds.includes('yarn') && !yarnTool.isInstalled) {
        recommendations.push({
          ...yarnTool,
          recommendationReason: 'suggested',
          suggestedFor: 'Alternative package manager for Node.js',
        });
      }
    }

    if (selectedToolIds.includes('vscode')) {
      const gitTool = allTools.find(tool => tool.id === 'git');
      if (gitTool && !selectedToolIds.includes('git') && !gitTool.isInstalled) {
        recommendations.push({
          ...gitTool,
          recommendationReason: 'suggested',
          suggestedFor: 'Essential for version control in VS Code',
        });
      }
    }

    // Popular combinations
    const popularTools = allTools.filter(tool => 
      !tool.isInstalled && 
      !selectedToolIds.includes(tool.id) &&
      !recommendations.some(rec => rec.id === tool.id)
    ).slice(0, 2);

    popularTools.forEach(tool => {
      recommendations.push({
        ...tool,
        recommendationReason: 'popular',
        popularWith: 'Most developers',
      });
    });

    return recommendations.slice(0, 8); // Limit to 8 recommendations
  };

  const recommendations = generateRecommendations();

  const handleRecommendationToggle = (toolId: string, add: boolean) => {
    const newSelectedTools = new Set(currentSelection.selectedTools);
    
    if (add) {
      newSelectedTools.add(toolId);
    } else {
      newSelectedTools.delete(toolId);
    }

    onSelectionChange({
      ...currentSelection,
      selectedTools: newSelectedTools,
    });
  };

  const handleAcceptAll = () => {
    const newSelectedTools = new Set(currentSelection.selectedTools);
    recommendations.forEach(rec => {
      newSelectedTools.add(rec.id);
    });

    onSelectionChange({
      ...currentSelection,
      selectedTools: newSelectedTools,
    });
  };

  if (recommendations.length === 0) {
    return (
      <div className={`w-80 bg-white border-l border-secondary-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-secondary-900">
              Recommendations
            </h2>
            <button
              onClick={onDismiss}
              className="text-secondary-400 hover:text-secondary-600 transition-colors lg:hidden"
              aria-label="Close recommendations"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-secondary-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-secondary-600">
              Great selection! All essential tools are covered.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 bg-white border-l border-secondary-200 h-screen overflow-y-auto ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-secondary-900">
            Recommendations
          </h2>
          <button
            onClick={onDismiss}
            className="text-secondary-400 hover:text-secondary-600 transition-colors lg:hidden"
            aria-label="Close recommendations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Accept All Button */}
        <button
          onClick={handleAcceptAll}
          className="w-full btn-primary mb-6"
        >
          Accept All Recommendations
        </button>

        {/* Recommendations List */}
        <div className="space-y-4">
          {recommendations.map((recommendation) => {
            const isSelected = currentSelection.selectedTools.has(recommendation.id);
            
            return (
              <div
                key={recommendation.id}
                className={`border rounded-lg p-4 transition-all ${
                  isSelected 
                    ? 'border-primary-300 bg-primary-50' 
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                {/* Recommendation Badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    recommendation.recommendationReason === 'essential' 
                      ? 'bg-red-100 text-red-800'
                      : recommendation.recommendationReason === 'suggested'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {recommendation.recommendationReason === 'essential' ? '⭐ Essential' :
                     recommendation.recommendationReason === 'suggested' ? '💡 Suggested' :
                     '🔥 Popular'}
                  </span>
                  
                  <button
                    onClick={() => handleRecommendationToggle(recommendation.id, !isSelected)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-secondary-300 hover:border-primary-300'
                    }`}
                    aria-label={`${isSelected ? 'Remove' : 'Add'} ${recommendation.name}`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Tool Info */}
                <h3 className="font-medium text-secondary-900 mb-1">
                  {recommendation.name}
                </h3>
                <p className="text-sm text-secondary-600 mb-2">
                  {recommendation.description}
                </p>

                {/* Recommendation Context */}
                {(recommendation.suggestedFor || recommendation.popularWith || recommendation.requiredFor) && (
                  <p className="text-xs text-secondary-500 mb-2">
                    {recommendation.suggestedFor && `💡 ${recommendation.suggestedFor}`}
                    {recommendation.popularWith && `🔥 Popular with ${recommendation.popularWith}`}
                    {recommendation.requiredFor && `⚠️ Required for ${recommendation.requiredFor}`}
                  </p>
                )}

                {/* Tool Metadata */}
                <div className="flex items-center justify-between text-xs text-secondary-500">
                  <div className="flex items-center space-x-3">
                    {recommendation.size && (
                      <span>{recommendation.size}</span>
                    )}
                    {recommendation.installationTime && (
                      <span>{recommendation.installationTime}</span>
                    )}
                  </div>
                  {recommendation.version && (
                    <span>v{recommendation.version}</span>
                  )}
                </div>

                {/* Tags */}
                {recommendation.tags && recommendation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recommendation.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary-100 text-secondary-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-6 p-3 bg-secondary-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-secondary-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-secondary-600">
              Recommendations are based on your current selection and popular developer workflows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 