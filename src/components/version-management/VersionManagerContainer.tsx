import React, { useEffect, useState } from 'react';
import type { VersionManagerType, VersionedTool } from '../../services/version-manager-types';
import type { VersionManagerUI, ToolVersionUI } from '../../types/version-management-ui-types';
import type { Platform } from '../../shared/simple-manifest-types';
import { VersionManagerPanel } from './VersionManagerPanel';

// Create empty toolVersions object with all tools
const EMPTY_TOOL_VERSIONS: Record<VersionedTool, ToolVersionUI[]> = {
  node: [], python: [], ruby: [], java: [], go: [], rust: [], php: [], perl: [],
  lua: [], elixir: [], erlang: [], julia: [], crystal: [], swift: [], scala: [],
  kotlin: [], dart: [], flutter: [], deno: [], bun: [], terraform: [], cmake: [],
  zig: [], lean: [], r: [], neovim: []
};

/**
 * Minimal container component for Version Management
 * Connects the VersionManagerPanel with electron APIs
 * Part of Task 26.10: Fix version management UI disconnection
 */
export const VersionManagerContainer: React.FC = () => {
  const [managers, setManagers] = useState<VersionManagerUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load version managers on mount
    const loadManagers = async () => {
      try {
        setLoading(true);
        const result = await window.electronAPI.versionManager.list();
        
        if (result.success && result.managers) {
          // Check installation status for each manager
          const managersWithStatus = await Promise.all(
            result.managers.map(async (manager) => {
              const installCheck = await window.electronAPI.versionManager.checkInstalled(manager.type);
              
              return {
                type: manager.type as VersionManagerType,
                name: manager.name,
                description: manager.description,
                icon: 'tool',
                status: installCheck.isInstalled ? 'ready' : 'not_installed',
                isRecommended: manager.type === 'mise', // Mise is recommended for MVP
                isInstalled: installCheck.isInstalled || false,
                isActive: false,
                supportedTools: manager.supportedTools as VersionedTool[],
                supportedPlatforms: ['win32', 'darwin', 'linux'] as Platform[],
                installationUrl: 'https://mise.jdx.dev',
                documentationUrl: 'https://mise.jdx.dev/docs'
              } as VersionManagerUI;
            })
          );
          
          setManagers(managersWithStatus);
        } else {
          setError(result.error || 'Failed to load version managers');
        }
      } catch (err) {
        setError('Failed to connect to version management service');
        console.error('Error loading version managers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadManagers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading version managers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold">Error Loading Version Managers</h3>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <VersionManagerPanel
      managers={managers}
      tools={['node', 'python', 'ruby', 'go', 'rust'] as VersionedTool[]}
      toolVersions={EMPTY_TOOL_VERSIONS}
      onToolSelect={(tool) => {
        console.log('Tool selected:', tool);
        // TODO: Load versions for selected tool
      }}
      onManagerOperation={(operation, manager) => {
        console.log('Manager operation:', operation, manager);
        // TODO: Implement manager operations (install, configure, etc.)
      }}
      onVersionOperation={(operation, tool, version) => {
        console.log('Version operation:', operation, tool, version);
        // TODO: Implement version operations (install, switch, uninstall)
      }}
      operationStatuses={{}}
      isVisible={true}
      onClose={() => console.log('Version panel closed')}
    />
  );
};