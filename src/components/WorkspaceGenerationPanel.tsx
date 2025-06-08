/**
 * Workspace Generation Panel Component
 * Allows users to generate IDE workspaces based on their tool selections
 */

import React, { useState, useEffect } from 'react';
import type { ToolSelection } from '../types/ui-types';
import type { JobRole } from '../types/job-role-types';
import type { IDEType } from '../services/ide-configuration/types';
import { WorkspaceGenerationService } from '../services/workspace-generation/workspace-generation-service';
import type { GeneratedWorkspace } from '../services/workspace-generation/workspace-generation-service';

interface WorkspaceGenerationPanelProps {
  toolSelection: ToolSelection;
  selectedJobRole?: JobRole;
  onWorkspaceGenerated?: (workspace: GeneratedWorkspace) => void;
}

export const WorkspaceGenerationPanel: React.FC<WorkspaceGenerationPanelProps> = ({
  toolSelection,
  selectedJobRole,
  onWorkspaceGenerated
}) => {
  const [selectedIDE, setSelectedIDE] = useState<IDEType>('vscode');
  const [workspaceName, setWorkspaceName] = useState('');
  const [baseDirectory, setBaseDirectory] = useState('');
  const [includeManifests, setIncludeManifests] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<Partial<GeneratedWorkspace> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const workspaceService = new WorkspaceGenerationService();

  // Available IDEs
  const availableIDEs: Array<{ id: IDEType; name: string; icon: string }> = [
    { id: 'vscode', name: 'Visual Studio Code', icon: '📝' },
    { id: 'cursor', name: 'Cursor', icon: '🎯' },
    { id: 'jetbrains', name: 'JetBrains IDEs', icon: '🧠' }
  ];

  // Get default directory based on OS
  useEffect(() => {
    window.electronAPI.getSystemInfo().then(result => {
      if (result.success && result.data?.homeDirectory) {
        const home = result.data.homeDirectory;
        setBaseDirectory(`${home}/workspaces`);
      }
    });
  }, []);

  // Preview workspace when selections change
  useEffect(() => {
    if (toolSelection.selectedTools.size > 0) {
      previewWorkspace();
    }
  }, [toolSelection, selectedIDE, workspaceName]);

  const previewWorkspace = async () => {
    try {
      const preview = await workspaceService.previewWorkspace({
        selectedTools: toolSelection,
        selectedIDE,
        selectedJobRole,
        baseDirectory,
        workspaceName: workspaceName || undefined,
        includeManifests
      });
      setPreview(preview);
    } catch (err) {
      console.error('Failed to preview workspace:', err);
    }
  };

  const handleGenerateWorkspace = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const workspace = await workspaceService.generateWorkspace({
        selectedTools: toolSelection,
        selectedIDE,
        selectedJobRole,
        baseDirectory,
        workspaceName: workspaceName || undefined,
        includeManifests
      });

      // Validate the workspace
      const isValid = await workspaceService.validateWorkspace(workspace);
      if (!isValid) {
        throw new Error('Generated workspace failed validation');
      }

      // Create workspace files using electron API
      await window.electronAPI.createWorkspace({
        path: workspace.path,
        files: workspace.files
      });

      setSuccess(`Workspace "${workspace.name}" created successfully!`);
      
      if (onWorkspaceGenerated) {
        onWorkspaceGenerated(workspace);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workspace');
    } finally {
      setIsGenerating(false);
    }
  };

  const hasSelectedTools = toolSelection.selectedTools.size > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Generate IDE Workspace
        </h2>
        <p className="text-gray-600">
          Create a pre-configured workspace with extensions, linters, and settings based on your tool selections
        </p>
      </div>

      {!hasSelectedTools ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please select tools first to generate a workspace configuration
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedIDE === ide.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Name (optional)
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="my-awesome-project"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Base Directory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Directory
            </label>
            <input
              type="text"
              value={baseDirectory}
              onChange={(e) => setBaseDirectory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Options */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeManifests"
              checked={includeManifests}
              onChange={(e) => setIncludeManifests(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="includeManifests" className="ml-2 text-sm text-gray-700">
              Include community workspace templates
            </label>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Workspace Preview</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {preview.name}
                </div>
                <div>
                  <span className="font-medium">Technology Stacks:</span>{' '}
                  {preview.stack?.join(', ')}
                </div>
                <div>
                  <span className="font-medium">Extensions:</span>{' '}
                  {preview.configuration?.extensions.length || 0} extensions
                </div>
                <div>
                  <span className="font-medium">Linters:</span>{' '}
                  {preview.configuration?.linters.map(l => l.name).join(', ') || 'None'}
                </div>
                <div>
                  <span className="font-medium">Formatters:</span>{' '}
                  {preview.configuration?.formatters.map(f => f.name).join(', ') || 'None'}
                </div>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateWorkspace}
            disabled={isGenerating || !baseDirectory}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
              isGenerating || !baseDirectory
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
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
        </div>
      )}
    </div>
  );
};