/**
 * Workspace Generation Panel Component
 * Allows users to generate IDE workspaces based on their tool selections
 */

import React, { useState, useEffect } from 'react';
import type { ToolSelection } from '../types/ui-types';
import { workspaceGenerator, type IDEType, type WorkspaceResult } from '../services/workspace-generation/simple-workspace-generator';

interface WorkspaceGenerationPanelProps {
  toolSelection: ToolSelection;
}

export const WorkspaceGenerationPanel: React.FC<WorkspaceGenerationPanelProps> = ({
  toolSelection
}) => {
  const [selectedIDE, setSelectedIDE] = useState<IDEType>('vscode');
  const [workspaceName, setWorkspaceName] = useState('my-workspace');
  const [baseDirectory, setBaseDirectory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<WorkspaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Available IDEs
  const availableIDEs: Array<{ id: IDEType; name: string; icon: string }> = [
    { id: 'vscode', name: 'Visual Studio Code', icon: '📝' },
    { id: 'cursor', name: 'Cursor', icon: '🎯' },
    { id: 'jetbrains', name: 'JetBrains IDEs', icon: '🧠' }
  ];

  // Get default directory based on home directory
  useEffect(() => {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    setBaseDirectory(`${homeDir}/workspaces`);
  }, []);

  const handleGenerateWorkspace = async () => {
    if (!workspaceName || !baseDirectory) {
      setError('Please provide a workspace name and directory');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Get selected tool IDs
      const selectedTools = Array.from(toolSelection.selectedTools);
      
      if (selectedTools.length === 0) {
        setError('Please select at least one tool before generating a workspace');
        setIsGenerating(false);
        return;
      }

      // Load tool metadata from manifest
      const manifestResult = await window.electronAPI.invoke('load-manifest') as { error?: string; tools?: any[] };
      if (manifestResult.error) {
        throw new Error(manifestResult.error);
      }
      
      const workspacePath = `${baseDirectory}/${workspaceName}`;
      
      // Generate workspace
      const generateResult = await workspaceGenerator.generateWorkspace({
        selectedTools,
        toolsMetadata: manifestResult.tools || [],
        ide: selectedIDE,
        workspacePath,
        workspaceName
      });

      setResult(generateResult);
      
      if (!generateResult.success) {
        setError(generateResult.error || 'Failed to generate workspace');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedToolCount = toolSelection.selectedTools.size;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Generate IDE Workspace
        </h2>
        <p className="text-gray-600">
          Create a configured workspace with settings and extensions for your selected tools.
        </p>
      </div>

      {selectedToolCount === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please select tools in the Tool Selection tab before generating a workspace.
          </p>
        </div>
      ) : (
        <>
          {/* Workspace Configuration */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Workspace Configuration</h3>
            
            {/* IDE Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select IDE
              </label>
              <div className="grid grid-cols-3 gap-3">
                {availableIDEs.map(ide => (
                  <button
                    key={ide.id}
                    onClick={() => setSelectedIDE(ide.id)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedIDE === ide.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{ide.icon}</div>
                    <div className="text-sm font-medium">{ide.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Workspace Name */}
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-1">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="my-awesome-project"
              />
            </div>

            {/* Base Directory */}
            <div>
              <label htmlFor="base-directory" className="block text-sm font-medium text-gray-700 mb-1">
                Base Directory
              </label>
              <input
                id="base-directory"
                type="text"
                value={baseDirectory}
                onChange={(e) => setBaseDirectory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="/home/user/workspaces"
              />
              <p className="mt-1 text-sm text-gray-500">
                Workspace will be created at: {baseDirectory}/{workspaceName}
              </p>
            </div>

            {/* Selected Tools Summary */}
            <div>
              <p className="text-sm text-gray-600">
                {selectedToolCount} tool{selectedToolCount !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Success Display */}
          {result && result.success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium mb-2">
                Workspace generated successfully!
              </p>
              <p className="text-green-700 text-sm mb-2">
                Location: {result.path}
              </p>
              <p className="text-green-700 text-sm">
                Files created: {result.filesCreated.length}
              </p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateWorkspace}
            disabled={isGenerating || selectedToolCount === 0}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isGenerating || selectedToolCount === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Workspace...
              </span>
            ) : (
              'Generate Workspace'
            )}
          </button>
        </>
      )}
    </div>
  );
};