import React from 'react';
import type { ConflictRule } from '../services/conflict-rules';
import type { Tool } from '../types/ui-types';

interface ConflictWarningDialogProps {
  isOpen: boolean;
  conflicts: ConflictRule[];
  tools: Tool[];
  onResolve: (toolsToRemove: string[]) => void;
  onCancel: () => void;
}

export function ConflictWarningDialog({
  isOpen,
  conflicts,
  tools,
  onResolve,
  onCancel
}: ConflictWarningDialogProps) {
  const [toolsToRemove, setToolsToRemove] = React.useState<Set<string>>(new Set());

  if (!isOpen) return null;

  // Get tool name by ID
  const getToolName = (toolId: string) => {
    const tool = tools.find(t => t.id === toolId);
    return tool?.name || toolId;
  };

  // Handle checkbox change
  const handleToolToggle = (toolId: string) => {
    const newSet = new Set(toolsToRemove);
    if (newSet.has(toolId)) {
      newSet.delete(toolId);
    } else {
      newSet.add(toolId);
    }
    setToolsToRemove(newSet);
  };

  // Check if resolution is valid (at least one tool removed from each conflict)
  const isResolutionValid = () => {
    return conflicts.every(conflict => {
      const removedCount = conflict.tools.filter(toolId => toolsToRemove.has(toolId)).length;
      const totalCount = conflict.tools.length;
      // Valid if we're removing all but one tool from the conflict
      return removedCount >= totalCount - 1;
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            ⚠️ Installation Conflicts Detected
          </h2>
          
          <p className="text-gray-700 mb-6">
            The following tools may conflict with each other. Please resolve these conflicts before proceeding.
          </p>

          <div className="space-y-6 max-h-[40vh] overflow-y-auto">
            {conflicts.map((conflict, index) => (
              <div key={index} className="border border-yellow-300 bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">Conflict {index + 1}</h3>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-700">{conflict.reason}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    <strong>Suggestion:</strong> {conflict.resolution}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Select tools to remove:</p>
                  {conflict.tools.map(toolId => (
                    <label key={toolId} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={toolsToRemove.has(toolId)}
                        onChange={() => handleToolToggle(toolId)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{getToolName(toolId)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onResolve(Array.from(toolsToRemove))}
              disabled={!isResolutionValid()}
              className={`px-4 py-2 rounded transition-colors ${
                isResolutionValid()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Resolve Conflicts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}