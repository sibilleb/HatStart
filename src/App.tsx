import { useEffect, useState } from 'react';
import { CategoryGrid } from './components/CategoryGrid';
import { RecommendationPanel } from './components/RecommendationPanel';
import { SearchFilterPanel } from './components/SearchFilterPanel';
import { SelectionSummary } from './components/SelectionSummary';
import './index.css';
import { JobRoleConfigService } from './services/job-role-config-service';
import { JobRoleRecommendationService } from './services/job-role-recommendation-service';
import { SystemDetectionService } from './services/system-detection-service';
import type {
  CategoryInfo,
  FilterOptions,
  InstallationProgress,
  ToolCategory,
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
  });
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [installationProgress, setInstallationProgress] = useState<InstallationProgress>({
    isInstalling: false,
    currentTool: '',
    completed: 0,
    total: 0,
  });

  // Load system detection data on mount
  useEffect(() => {
    const loadSystemData = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        // Load categories from system detection
        const detectedCategories = await systemDetectionService.getCategoriesForUI();
        
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
    if (toolIds.length === 0) return;

    setInstallationProgress({
      isInstalling: true,
      currentTool: 'Preparing installation...',
      completed: 0,
      total: toolIds.length,
    });

    try {
      // Set up progress listener
      const removeListener = window.electronAPI.onInstallationProgress((progress) => {
        setInstallationProgress(prev => ({
          ...prev,
          currentTool: progress.message,
          completed: Math.floor((progress.progress / 100) * prev.total),
        }));
      });

      // Install tools
      const result = await window.electronAPI.installTools(toolIds);
      
      if (result.success) {
        const { summary } = result;
        
        // Update tool states
        setCategories(prevCategories => 
          prevCategories.map(category => ({
            ...category,
            tools: category.tools.map(tool => ({
              ...tool,
              isInstalled: result.results?.some((r: any) => 
                r.tool === tool.id && r.success
              ) || tool.isInstalled,
            })),
          }))
        );

        // Show summary
        if (summary?.failed > 0) {
          setError(`Installation completed with errors. ${summary.successful} succeeded, ${summary.failed} failed.`);
        }
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
                  recommendations={allTools.filter(tool => tool.isRecommended && !tool.isInstalled)}
                  onAcceptAll={() => {
                    const recommendedIds = allTools
                      .filter(tool => tool.isRecommended && !tool.isInstalled)
                      .map(tool => tool.id);
                    setSelection({
                      selectedTools: new Set(recommendedIds),
                      deselectedRecommendations: new Set(),
                      customSelections: new Set(),
                    });
                  }}
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
                  expandedCategories={new Set(categories.map(c => c.id))}
                  onCategoryToggle={() => {}}
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
                categories={categories}
                onInstall={handleInstall}
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
    </div>
  );
}

export default App;