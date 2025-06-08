import { useEffect, useState } from 'react';
import { CategoryGrid } from './components/CategoryGrid';
import { RecommendationPanel } from './components/RecommendationPanel';
import { SearchFilterPanel } from './components/SearchFilterPanel';
import { SelectionSummary } from './components/SelectionSummary';
import { TabbedLayout } from './components/TabbedLayout';
import { WorkspaceGenerationPanel } from './components/WorkspaceGenerationPanel';
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

console.log('📱 App.tsx: Loading HatStart App component...');

// Initialize the system detection service
const systemDetectionService = new SystemDetectionService();
// Initialize the job role recommendation service
const jobRoleRecommendationService = new JobRoleRecommendationService();
// Initialize the job role config service
const jobRoleConfigService = new JobRoleConfigService();

// Sample data for demonstration/fallback
const sampleCategories: CategoryInfo[] = [
  {
    id: 'programming-languages' as ToolCategory,
    name: 'Programming Languages',
    description: 'Essential programming languages for development',
    icon: '💻',
    color: '#3B82F6',
    tools: [
      {
        id: 'node-js',
        name: 'Node.js',
        description: 'JavaScript runtime built on Chrome\'s V8 JavaScript engine',
        version: '18.17.0',
        isInstalled: true,
        isRecommended: true,
        category: 'programming-languages' as ToolCategory,
        platforms: ['windows', 'macos', 'linux'],
        size: '35 MB',
        installationTime: '2 min',
        tags: ['javascript', 'runtime', 'server'],
      },
      {
        id: 'python',
        name: 'Python',
        description: 'High-level programming language for general-purpose programming',
        version: '3.11.4',
        isInstalled: false,
        isRecommended: true,
        category: 'programming-languages' as ToolCategory,
        platforms: ['windows', 'macos', 'linux'],
        size: '25 MB',
        installationTime: '3 min',
        tags: ['python', 'scripting', 'data-science'],
      },
    ],
  },
  {
    id: 'code-editors' as ToolCategory,
    name: 'Code Editors',
    description: 'Powerful editors for writing and editing code',
    icon: '📝',
    color: '#10B981',
    tools: [
      {
        id: 'vscode',
        name: 'Visual Studio Code',
        description: 'Free source-code editor made by Microsoft',
        version: '1.81.0',
        isInstalled: true,
        isRecommended: true,
        category: 'code-editors' as ToolCategory,
        platforms: ['windows', 'macos', 'linux'],
        size: '85 MB',
        installationTime: '3 min',
        tags: ['editor', 'microsoft', 'extensions'],
      },
    ],
  },
];

function App() {
  console.log('🎨 App: Rendering HatStart App component...');
  
  // State management
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [expandedCategories, setExpandedCategories] = useState<Set<ToolCategory>>(new Set());
  const [selection, setSelection] = useState<ToolSelection>({
    selectedTools: new Set(),
    deselectedRecommendations: new Set(),
    customSelections: new Set(),
  });
  const [activeTab, setActiveTab] = useState('tools');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    showOnlyRecommended: false,
    showOnlyNotInstalled: false,
    selectedCategories: new Set(),
    selectedPlatforms: new Set(),
    // Job role filter options
    filterByJobRole: false,
    selectedJobRole: undefined,
    priorityLevel: undefined,
    showRoleRecommendations: false,
  });
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [installationProgress, setInstallationProgress] = useState<InstallationProgress>({
    isInstalling: false,
    currentTool: '',
    completed: 0,
    total: 0,
  });

  // Apply job role recommendations when selected role changes
  useEffect(() => {
    if (filterOptions.filterByJobRole && filterOptions.selectedJobRole) {
      console.log('🔄 App: Applying job role recommendations for:', filterOptions.selectedJobRole);
      
      // Apply job role recommendations to all tools in all categories
      const updatedCategories = categories.map(category => {
        // Ensure tools have the installationStatus property for ToolWithStatus
        const toolsWithStatus = category.tools.map(tool => ({
          ...tool,
          installationStatus: tool.isInstalled ? 'installed' : 'not-installed'
        })) as ToolWithStatus[];
        
        const updatedTools = jobRoleRecommendationService.applyRoleRecommendations(
          toolsWithStatus,
          filterOptions.selectedJobRole as string
        );
        
        return {
          ...category,
          tools: updatedTools,
        };
      });
      
      setCategories(updatedCategories);
      console.log('✅ App: Job role recommendations applied');
    }
  }, [filterOptions.selectedJobRole, filterOptions.filterByJobRole, categories]);

  // Load system detection data on component mount
  useEffect(() => {
    console.log('🔄 App: Loading system detection data...');
    
    const loadSystemData = async () => {
      try {
        setIsLoading(true);
        setError(undefined);
        
        // Load categories from system detection
        console.log('📡 App: Fetching categories from system detection...');
        const detectedCategories = await systemDetectionService.getCategoriesForUI();
        console.log('✅ App: Categories loaded:', detectedCategories.length);
        
        // Set default job role if available (first one in the list)
        const jobRoles = jobRoleConfigService.getAllConfigs();
        if (jobRoles.length > 0) {
          const defaultRole = jobRoles[0];
          console.log('🎭 App: Setting default job role:', defaultRole.name);
          
          // Apply job role recommendations to detected categories
          const categoriesWithRoleRecommendations = detectedCategories.map(category => {
            // Ensure tools have the installationStatus property for ToolWithStatus
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
          
          // Update filter options with default role
          setFilterOptions(prev => ({
            ...prev,
            selectedJobRole: defaultRole.id,
          }));
        } else {
          // No job roles available, just use the detected categories
          setCategories(detectedCategories);
        }
        
        // Auto-expand categories that have detected tools
        const categoriesToExpand = new Set<ToolCategory>();
        detectedCategories.forEach(category => {
          const hasInstalledTools = category.tools.some(tool => tool.isInstalled);
          if (hasInstalledTools) {
            categoriesToExpand.add(category.id);
          }
        });
        setExpandedCategories(categoriesToExpand);
        console.log('📂 App: Auto-expanded categories:', Array.from(categoriesToExpand));
        
        // Show recommendations panel if this is first visit
        const hasRecommendations = detectedCategories.some(category =>
          category.tools.some(tool => tool.isRecommended)
        );
        setShowRecommendations(hasRecommendations);
        console.log('💡 App: Show recommendations:', hasRecommendations);
        
      } catch (err) {
        console.error('❌ App: Failed to load system detection data:', err);
        setError('Failed to detect system tools. Using offline mode.');
        // Fallback to mock data if detection fails
        setCategories(sampleCategories);
        console.log('🔄 App: Using fallback sample data');
      } finally {
        setIsLoading(false);
        console.log('✅ App: Loading complete');
      }
    };

    loadSystemData();
  }, []);

  const handleCategoryToggle = (categoryId: ToolCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSelectionChange = (newSelection: ToolSelection) => {
    setSelection(newSelection);
  };

  const handleInstallSelected = (toolIds: string[]) => {
    console.log('🚀 Installing tools:', toolIds);
    setInstallationProgress({
      isInstalling: true,
      currentTool: 'Setting up...',
      completed: 0,
      total: toolIds.length,
    });
  };

  const handleExportSelection = () => {
    const selectedToolsArray = Array.from(selection.selectedTools);
    const exportData = {
      selectedTools: selectedToolsArray,
      timestamp: new Date().toISOString(),
      categories: categories.filter(cat => 
        cat.tools.some(tool => selectedToolsArray.includes(tool.id))
      ),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hatstart-selection.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: FilterOptions) => {
    console.log('🔍 App: Filter options changed:', newFilters);
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
            <TabbedLayout
              tabs={[
                { id: 'tools', label: 'Tool Selection', icon: '🛠️', badge: selection.selectedTools.size },
                { id: 'workspace', label: 'Workspace Generation', icon: '📁' },
                { id: 'version', label: 'Version Management', icon: '🔄' }
              ]}
              activeTabId={activeTab}
              onTabChange={setActiveTab}
            >
              {{
                tools: (
                  <div>
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

                    {/* Recommendation Panel */}
                    {showRecommendations && (
                      <RecommendationPanel
                        allTools={allTools}
                        currentSelection={selection}
                        onSelectionChange={handleSelectionChange}
                        onDismiss={() => setShowRecommendations(false)}
                      />
                    )}

                    {/* Selection Summary */}
                    <SelectionSummary
                      selection={selection}
                      tools={allTools}
                      onInstallSelected={handleInstallSelected}
                      onClearSelection={() => setSelection({
                        selectedTools: new Set(),
                        deselectedRecommendations: new Set(),
                        customSelections: new Set(),
                      })}
                      onExportSelection={handleExportSelection}
                      installationProgress={installationProgress}
                      estimatedTime="15-30 minutes"
                      estimatedSize="2.5 GB"
                      isVisible={selection.selectedTools.size > 0}
                      position="bottom-right"
                    />
                  </div>
                ),
                workspace: (
                  <WorkspaceGenerationPanel
                    toolSelection={selection}
                    selectedJobRole={filterOptions.selectedJobRole as any}
                    onWorkspaceGenerated={(workspace) => {
                      console.log('Workspace generated:', workspace);
                      // Could show a success notification or navigate to a different tab
                    }}
                  />
                ),
                version: (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      Version Management Coming Soon
                    </h3>
                    <p className="text-gray-600">
                      Manage tool versions with popular version managers like asdf, mise, nvm, and more.
                    </p>
                  </div>
                )
              }}
            </TabbedLayout>
          </div>
        )}
      </div>
    </div>
  );
}

console.log('✅ App.tsx: HatStart App component defined');

export default App;
