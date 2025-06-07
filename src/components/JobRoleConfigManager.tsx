import React, { useEffect, useState } from 'react';
import { jobRoleConfigService } from '../services/job-role-config-service';
import { jobRoleStorageService } from '../services/job-role-storage-service';
import type { JobRoleConfig } from '../types/job-role-types';

interface JobRoleConfigManagerProps {
  onConfigsLoaded?: (configs: JobRoleConfig[]) => void;
  onError?: (error: string) => void;
}

/**
 * Component for managing job role configurations
 * Provides UI for loading, saving, and customizing job role configurations
 */
export const JobRoleConfigManager: React.FC<JobRoleConfigManagerProps> = ({
  onConfigsLoaded,
  onError
}) => {
  const [configs, setConfigs] = useState<JobRoleConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<JobRoleConfig | null>(null);
  const [configFiles, setConfigFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load available configuration files on mount
  useEffect(() => {
    loadConfigFiles();
  }, []);

  // Load configuration files from storage
  const loadConfigFiles = async () => {
    try {
      setIsLoading(true);
      const files = await jobRoleStorageService.listConfigFiles();
      setConfigFiles(files);
      setIsLoading(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      handleError('Failed to load configuration files');
    }
  };

  // Load configurations from service
  const loadConfigs = () => {
    try {
      const allConfigs = jobRoleConfigService.getAllConfigs();
      setConfigs(allConfigs);
      
      if (onConfigsLoaded) {
        onConfigsLoaded(allConfigs);
      }
      
      setMessage('Configurations loaded successfully');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      handleError('Failed to load configurations');
    }
  };

  // Load configurations from a file
  const loadConfigsFromFile = async (fileName: string) => {
    try {
      setIsLoading(true);
      const loadedConfigs = await jobRoleStorageService.loadConfigsFromFile(fileName);
      
      if (loadedConfigs) {
        // Import the loaded configurations
        const importedCount = jobRoleConfigService.importConfigs(JSON.stringify(loadedConfigs));
        
        if (importedCount > 0) {
          // Refresh the configs list
          const allConfigs = jobRoleConfigService.getAllConfigs();
          setConfigs(allConfigs);
          
          if (onConfigsLoaded) {
            onConfigsLoaded(allConfigs);
          }
          
          setMessage(`Imported ${importedCount} configurations successfully`);
        } else {
          setMessage('No valid configurations found in file');
        }
      } else {
        setMessage('Configuration file is empty or invalid');
      }
      
      setIsLoading(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      handleError(`Failed to load configurations from file: ${fileName}`);
    }
  };

  // Save configurations to a file
  const saveConfigsToFile = async (fileName: string = 'job-role-configs.json', includeBuiltIn: boolean = false) => {
    try {
      setIsLoading(true);
      
      // Export configs as JSON
      const configsJson = jobRoleConfigService.exportConfigs(includeBuiltIn);
      
      // Save to file
      const saved = await jobRoleStorageService.saveConfigsToFile(
        JSON.parse(configsJson),
        { fileName, includeBuiltIn }
      );
      
      if (saved) {
        setMessage('Configurations saved successfully');
        await loadConfigFiles(); // Refresh file list
      } else {
        setMessage('Failed to save configurations');
      }
      
      setIsLoading(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      handleError('Failed to save configurations');
    }
  };

  // Handle errors
  const handleError = (errorMessage: string) => {
    setMessage(errorMessage);
    
    if (onError) {
      onError(errorMessage);
    }
    
    setIsLoading(false);
  };

  // Reset configurations to defaults
  const resetToDefaults = () => {
    try {
      jobRoleConfigService.resetToDefaults();
      const allConfigs = jobRoleConfigService.getAllConfigs();
      setConfigs(allConfigs);
      
      if (onConfigsLoaded) {
        onConfigsLoaded(allConfigs);
      }
      
      setMessage('Configurations reset to defaults');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      handleError('Failed to reset configurations');
    }
  };

  // Select a config for editing
  const handleSelectConfig = (config: JobRoleConfig) => {
    setSelectedConfig(config);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow">
      <h2 className="text-xl font-bold mb-4">Job Role Configuration Manager</h2>
      
      {/* Message display */}
      {message && (
        <div className="mb-4 p-2 bg-gray-100 rounded border">
          {message}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button 
          className="btn-primary"
          onClick={loadConfigs}
          disabled={isLoading}
        >
          Load Configs
        </button>
        <button 
          className="btn-secondary"
          onClick={() => saveConfigsToFile()}
          disabled={isLoading}
        >
          Save Custom Configs
        </button>
        <button 
          className="btn-secondary"
          onClick={resetToDefaults}
          disabled={isLoading}
        >
          Reset to Defaults
        </button>
      </div>

      {/* Config files list */}
      {configFiles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Saved Configuration Files</h3>
          <div className="flex flex-wrap gap-2">
            {configFiles.map(file => (
              <button
                key={file}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-sm"
                onClick={() => loadConfigsFromFile(file)}
                disabled={isLoading}
              >
                {file}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configs list */}
      {configs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Available Configurations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {configs.map(config => (
              <div
                key={config.id}
                className={`p-2 border rounded cursor-pointer ${
                  selectedConfig?.id === config.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => handleSelectConfig(config)}
              >
                <div className="font-medium">{config.name}</div>
                <div className="text-sm text-gray-500">{config.description}</div>
                <div className="text-xs mt-1">
                  {config.primaryTools.length} primary tools, {config.recommendedTools.length} recommended
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected config details */}
      {selectedConfig && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Configuration Details: {selectedConfig.name}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Primary Tools</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedConfig.primaryTools.map(tool => (
                  <span key={tool} className="px-2 py-1 bg-green-100 rounded text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium">Recommended Tools</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedConfig.recommendedTools.map(tool => (
                  <span key={tool} className="px-2 py-1 bg-blue-100 rounded text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium">Optional Tools</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedConfig.optionalTools.map(tool => (
                  <span key={tool} className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium">Categories</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedConfig.categories.map(category => (
                  <span key={category} className="px-2 py-1 bg-purple-100 rounded text-sm">
                    {category}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium">Skill Areas</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedConfig.skillAreas.map(skill => (
                  <span key={skill} className="px-2 py-1 bg-yellow-100 rounded text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium">Workflow Types</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedConfig.workflowTypes.map(workflow => (
                  <span key={workflow} className="px-2 py-1 bg-red-100 rounded text-sm">
                    {workflow}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 