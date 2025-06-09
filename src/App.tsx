import { useEffect, useState } from 'react';
import { CategoryGrid } from './components/CategoryGrid';
import { RecommendationPanel } from './components/RecommendationPanel';
import { SearchFilterPanel } from './components/SearchFilterPanel';
import { SelectionSummary } from './components/SelectionSummary';
import { ConflictWarningDialog } from './components/ConflictWarningDialog';
import './index.css';
import { JobRoleConfigService } from './services/job-role-config-service';
import { JobRoleRecommendationService } from './services/job-role-recommendation-service';
import { SystemDetectionService } from './services/system-detection-service';
import { checkForConflicts, type ConflictRule } from './services/conflict-rules';
import type {
  CategoryInfo,
  FilterOptions,
  InstallationProgress,
  ToolSelection,
  ToolWithStatus
} from './types/ui-types';

// Initialize services
const systemDetectionService = new SystemDetectionService();
const jobRoleRecommendationService = new JobRoleRecommendationService();
const jobRoleConfigService = new JobRoleConfigService();

function App() {
  // Essential state only
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [selection, setSelection] = useState<ToolSelection>({
    selectedTools: new Set(),
    deselectedRecommendations: new Set(),
    customSelections: new Set(),
  });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    showOnlyRecommended: false,
    showOnlyNotInstalled: false,
    selectedCategories: new Set(),
    selectedPlatforms: new Set(),
    filterByJobRole: false,
    selectedJobRole: undefined,
    showRoleRecommendations: false,
  });
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [installationProgress, setInstallationProgress] = useState<InstallationProgress>({
    isInstalling: false,
    currentTool: '',
    completed: 0,
    total: 0,
  });
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictRule[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Load system detection data on mount
  useEffect(() => {
    const loadSystemData = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        // Load categories from system detection
        console.log('App: Starting system detection...');
        const detectedCategories = await systemDetectionService.getCategoriesForUI();
        console.log('App: Detected categories:', detectedCategories);
        
        // Set default job role if available
        const jobRoles = jobRoleConfigService.getAllConfigs();
        if (jobRoles.length > 0) {
          const defaultRole = jobRoles[0];
          
          // Apply job role recommendations
          const categoriesWithRoleRecommendations = detectedCategories.map(category => {
            const toolsWithStatus = category.tools.map(tool => ({
              ...tool,
              installationStatus: tool.isInstalled ? 'installed' : 'not-installed'
            })) as ToolWithStatus[];
            
            const updatedTools = jobRoleRecommendationService.applyRoleRecommendations(
              toolsWithStatus,
              defaultRole.id
            );
            
            return {
              ...category,
              tools: updatedTools,
            };
          });
          
          setCategories(categoriesWithRoleRecommendations);
          setFilterOptions(prev => ({
            ...prev,
            selectedJobRole: defaultRole.id,
          }));
        } else {
          setCategories(detectedCategories);
        }
        
        // Show recommendations if available
        const hasRecommendations = detectedCategories.some(category =>
          category.tools.some(tool => tool.isRecommended)
        );
        setShowRecommendations(hasRecommendations);
        
      } catch (err) {
        console.error('Failed to load system detection data:', err);
        setError('Failed to detect system tools. Using offline mode.');
        // Could add fallback data here if needed
      } finally {
        setIsLoading(false);
      }
    };

    loadSystemData();
  }, []);

  // Apply job role recommendations when selected role changes
  useEffect(() => {
    if (filterOptions.filterByJobRole && filterOptions.selectedJobRole && categories.length > 0) {
      const updatedCategories = categories.map(category => {
        const toolsWithStatus = category.tools as ToolWithStatus[];
        const updatedTools = jobRoleRecommendationService.applyRoleRecommendations(
          toolsWithStatus,
          filterOptions.selectedJobRole!
        );
        return {
          ...category,
          tools: updatedTools,
        };
      });
      setCategories(updatedCategories);
    }
  }, [filterOptions.selectedJobRole, filterOptions.filterByJobRole]);

  const handleSelectionChange = (newSelection: ToolSelection) => {
    setSelection(newSelection);
  };

  const handleInstall = async () => {
    const toolIds = Array.from(selection.selectedTools);
    console.log('App: Starting installation for tools:', toolIds);
    if (toolIds.length === 0) return;

    // Check for conflicts before proceeding
    const foundConflicts = checkForConflicts(toolIds);
    if (foundConflicts.length > 0) {
      console.log('App: Conflicts found:', foundConflicts);
      setConflicts(foundConflicts);
      setShowConflictDialog(true);
      return;
    }

    await proceedWithInstallation(toolIds);
  };

  const proceedWithInstallation = async (toolIds: string[]) => {
    setInstallationProgress({
      isInstalling: true,
      currentTool: 'Preparing installation...',
      completed: 0,
      total: toolIds.length,
    });

    try {
      // Set up progress listener
      const removeListener = window.electronAPI.onInstallationProgress((progress) => {
        console.log('App: Installation progress:', progress);
        setInstallationProgress(prev => ({
          ...prev,
          currentTool: progress.message,
          completed: Math.floor((progress.progress / 100) * prev.total),
        }));
      });

      // Install tools
      console.log('App: Calling installTools IPC...');
      const result = await window.electronAPI.installTools(toolIds);
      console.log('App: Installation result:', result);
      
      if (result.success) {
        const { summary } = result;
        
        // Clear detection cache to force refresh
        await window.electronAPI.clearDetectionCache();
        
        // Refresh system detection to get updated installation status
        await systemDetectionService.refreshDetection();
        const updatedCategories = await systemDetectionService.getCategoriesForUI();
        
        // Apply job role recommendations if active
        if (filterOptions.filterByJobRole && filterOptions.selectedJobRole) {
          const categoriesWithRoleRecommendations = updatedCategories.map(category => {
            const toolsWithStatus = category.tools.map(tool => ({
              ...tool,
              installationStatus: tool.isInstalled ? 'installed' : 'not-installed'
            })) as ToolWithStatus[];
            
            const updatedTools = jobRoleRecommendationService.applyRoleRecommendations(
              toolsWithStatus,
              filterOptions.selectedJobRole!
            );
            
            return {
              ...category,
              tools: updatedTools,
            };
          });
          setCategories(categoriesWithRoleRecommendations);
        } else {
          setCategories(updatedCategories);
        }

        // Show summary
        if (summary && summary.failed && summary.failed > 0) {
          setError(`Installation completed with errors. ${summary.successful} succeeded, ${summary.failed} failed.`);
        } else if (summary && summary.alreadyInstalled > 0) {
          console.log(`Successfully installed ${summary.successful - summary.alreadyInstalled} tools. ${summary.alreadyInstalled} were already installed.`);
        } else if (summary && summary.successful > 0) {
          // Show success message
          console.log(`Successfully installed ${summary.successful} tools`);
        }
        
        // Clear selection after successful installation
        setSelection({
          selectedTools: new Set(),
          deselectedRecommendations: new Set(),
          customSelections: new Set(),
        });
      } else {
        setError(result.error || 'Installation failed');
      }

      // Cleanup
      removeListener();
    } catch (error) {
      console.error('Installation error:', error);
      setError('Failed to install tools. Please try again.');
    } finally {
      setInstallationProgress({
        isInstalling: false,
        currentTool: '',
        completed: 0,
        total: 0,
      });
    }
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilterOptions(newFilters);
  };

  const handleConflictResolve = async (toolsToRemove: string[]) => {
    // Remove conflicting tools from selection
    const newSelection = new Set(selection.selectedTools);
    toolsToRemove.forEach(toolId => newSelection.delete(toolId));
    
    setSelection({
      ...selection,
      selectedTools: newSelection,
    });
    
    // Close dialog and proceed with installation
    setShowConflictDialog(false);
    setConflicts([]);
    
    // Proceed with remaining tools
    const remainingTools = Array.from(newSelection);
    if (remainingTools.length > 0) {
      await proceedWithInstallation(remainingTools);
    }
  };

  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    setConflicts([]);
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Get all tools for recommendations
  const allTools = categories.flatMap(cat => cat.tools);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            HatStart Developer Toolkit
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Automatically detect and install the development tools you need
          </p>
          {error && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800">
              {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Detecting your development environment...</p>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Recommendations Panel (if available) */}
            {showRecommendations && (
              <div className="mb-6">
                <RecommendationPanel
                  allTools={allTools}
                  currentSelection={selection}
                  onSelectionChange={setSelection}
                  onDismiss={() => setShowRecommendations(false)}
                />
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Sidebar - Filters */}
              <div className="lg:w-1/4">
                <SearchFilterPanel 
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                />
              </div>
              
              {/* Main Content - Category Grid */}
              <div className="lg:w-3/4">
                <CategoryGrid
                  categories={categories}
                  expandedCategories={expandedCategories}
                  onCategoryToggle={handleCategoryToggle}
                  selection={selection}
                  onSelectionChange={handleSelectionChange}
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                />
              </div>
            </div>

            {/* Selection Summary and Install Button */}
            <div className="mt-8">
              <SelectionSummary
                selection={selection}
                tools={allTools}
                onInstallSelected={() => handleInstall()}
                onClearSelection={() => setSelection({
                  selectedTools: new Set(),
                  deselectedRecommendations: new Set(),
                  customSelections: new Set(),
                })}
                installationProgress={installationProgress}
              />
            </div>
          </div>
        )}
      </div>

      {/* Conflict Warning Dialog */}
      <ConflictWarningDialog
        isOpen={showConflictDialog}
        conflicts={conflicts}
        tools={allTools}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}

export default App;