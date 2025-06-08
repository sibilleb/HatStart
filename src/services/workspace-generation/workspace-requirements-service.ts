/**
 * Workspace Requirements Service
 * Gathers requirements for IDE workspace configuration based on selected tools and technology stacks
 */

import type { DetectionResult } from '../../shared/detection-types.js';
import { IDEDetector } from '../../shared/ide-detector.js';
import type { IDEType } from '../ide-configuration/types.js';
import { SystemDetectionService } from '../system-detection-service.js';

/**
 * Programming language/technology stack identifier
 */
export type TechnologyStack = 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'java' 
  | 'rust' 
  | 'go' 
  | 'csharp' 
  | 'cpp' 
  | 'php' 
  | 'ruby';

/**
 * IDE workspace requirement for a specific technology stack
 */
export interface WorkspaceRequirement {
  stack: TechnologyStack;
  displayName: string;
  ideType: IDEType;
  workspaceName: string;
  extensions: string[];
  settings: Record<string, unknown>;
  linters: string[];
  formatters: string[];
  debuggers: string[];
  packageManagers: string[];
  buildTools: string[];
}

/**
 * Gathered requirements for workspace generation
 */
export interface WorkspaceGenerationRequirements {
  availableIDEs: DetectionResult[];
  selectedIDE: IDEType;
  detectedStacks: TechnologyStack[];
  userSelectedStacks: TechnologyStack[];
  workspaceRequirements: WorkspaceRequirement[];
  workspaceStrategy: 'language-optimized' | 'multi-language' | 'project-based';
  baseDirectory: string;
}

/**
 * Service for gathering workspace generation requirements
 */
export class WorkspaceRequirementsService {
  private ideDetector: IDEDetector;
  private systemDetection: SystemDetectionService;

  constructor() {
    this.ideDetector = new IDEDetector();
    this.systemDetection = new SystemDetectionService();
  }

  /**
   * Detect available IDEs on the system
   */
  async detectAvailableIDEs(): Promise<DetectionResult[]> {
    const resultsMap = await this.ideDetector.detectAllTools();
    const allResults: DetectionResult[] = [];
    
    // Flatten the map results
    for (const categoryResults of Array.from(resultsMap.values())) {
      allResults.push(...categoryResults);
    }
    
    return allResults.filter((result: DetectionResult) => 
      result.found && 
      ['vscode', 'cursor', 'jetbrains'].includes(result.name.toLowerCase())
    );
  }

  /**
   * Detect programming languages and technology stacks
   */
  async detectTechnologyStacks(): Promise<TechnologyStack[]> {
    const report = await this.systemDetection.getSystemDetectionReport();
    const stacks: TechnologyStack[] = [];

    // Find programming languages category
    const languageCategory = report.categories.find(cat => 
      cat.category === 'programming-languages'
    );

    if (languageCategory) {
      // Map detected tools to technology stacks
      for (const tool of languageCategory.tools) {
        if (tool.found) {
          const toolName = tool.name.toLowerCase();
          if (toolName.includes('node') || toolName.includes('javascript')) stacks.push('javascript');
          if (toolName.includes('typescript')) stacks.push('typescript');
          if (toolName.includes('python')) stacks.push('python');
          if (toolName.includes('java')) stacks.push('java');
          if (toolName.includes('rust')) stacks.push('rust');
          if (toolName.includes('go')) stacks.push('go');
          if (toolName.includes('csharp') || toolName.includes('dotnet')) stacks.push('csharp');
          if (toolName.includes('cpp') || toolName.includes('c++')) stacks.push('cpp');
          if (toolName.includes('php')) stacks.push('php');
          if (toolName.includes('ruby')) stacks.push('ruby');
        }
      }
    }

    return Array.from(new Set(stacks)); // Remove duplicates
  }

  /**
   * Generate workspace requirements for selected stacks
   */
  generateWorkspaceRequirements(
    selectedStacks: TechnologyStack[],
    ideType: IDEType
  ): WorkspaceRequirement[] {
    return selectedStacks.map(stack => ({
      stack,
      displayName: this.getStackDisplayName(stack),
      ideType,
      workspaceName: `${stack}-workspace`,
      extensions: this.getRecommendedExtensions(stack, ideType),
      settings: this.getRecommendedSettings(stack, ideType),
      linters: this.getRecommendedLinters(stack),
      formatters: this.getRecommendedFormatters(stack),
      debuggers: this.getRecommendedDebuggers(stack),
      packageManagers: this.getPackageManagers(stack),
      buildTools: this.getBuildTools(stack)
    }));
  }

  /**
   * Get display name for technology stack
   */
  private getStackDisplayName(stack: TechnologyStack): string {
    const displayNames: Record<TechnologyStack, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      rust: 'Rust',
      go: 'Go',
      csharp: 'C#',
      cpp: 'C++',
      php: 'PHP',
      ruby: 'Ruby'
    };
    return displayNames[stack];
  }

  /**
   * Get recommended extensions for stack and IDE
   */
  private getRecommendedExtensions(stack: TechnologyStack, ideType: IDEType): string[] {
    const extensions: Record<TechnologyStack, Record<IDEType, string[]>> = {
      javascript: {
        vscode: ['ms-vscode.vscode-eslint', 'esbenp.prettier-vscode', 'ms-vscode.vscode-json'],
        cursor: ['ms-vscode.vscode-eslint', 'esbenp.prettier-vscode', 'ms-vscode.vscode-json'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      typescript: {
        vscode: ['ms-vscode.vscode-typescript-next', 'ms-vscode.vscode-eslint', 'esbenp.prettier-vscode'],
        cursor: ['ms-vscode.vscode-typescript-next', 'ms-vscode.vscode-eslint', 'esbenp.prettier-vscode'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      python: {
        vscode: ['ms-python.python', 'ms-python.pylint', 'ms-python.black-formatter'],
        cursor: ['ms-python.python', 'ms-python.pylint', 'ms-python.black-formatter'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      java: {
        vscode: ['redhat.java', 'vscjava.vscode-java-pack'],
        cursor: ['redhat.java', 'vscjava.vscode-java-pack'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      rust: {
        vscode: ['rust-lang.rust-analyzer', 'vadimcn.vscode-lldb'],
        cursor: ['rust-lang.rust-analyzer', 'vadimcn.vscode-lldb'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      go: {
        vscode: ['golang.go'],
        cursor: ['golang.go'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      csharp: {
        vscode: ['ms-dotnettools.csharp', 'ms-dotnettools.vscode-dotnet-runtime'],
        cursor: ['ms-dotnettools.csharp', 'ms-dotnettools.vscode-dotnet-runtime'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      cpp: {
        vscode: ['ms-vscode.cpptools', 'ms-vscode.cmake-tools'],
        cursor: ['ms-vscode.cpptools', 'ms-vscode.cmake-tools'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      php: {
        vscode: ['bmewburn.vscode-intelephense-client', 'xdebug.php-debug'],
        cursor: ['bmewburn.vscode-intelephense-client', 'xdebug.php-debug'],
        jetbrains: [],
        vim: [],
        neovim: []
      },
      ruby: {
        vscode: ['rebornix.ruby', 'castwide.solargraph'],
        cursor: ['rebornix.ruby', 'castwide.solargraph'],
        jetbrains: [],
        vim: [],
        neovim: []
      }
    };

    return extensions[stack]?.[ideType] || [];
  }

  /**
   * Get recommended settings for stack and IDE
   */
  private getRecommendedSettings(stack: TechnologyStack, _ideType: IDEType): Record<string, unknown> {
    const baseSettings = {
      'editor.formatOnSave': true,
      'editor.codeActionsOnSave': {
        'source.fixAll': true
      }
    };

    const stackSettings: Record<TechnologyStack, Record<string, unknown>> = {
      javascript: {
        ...baseSettings,
        'javascript.preferences.includePackageJsonAutoImports': 'auto'
      },
      typescript: {
        ...baseSettings,
        'typescript.preferences.includePackageJsonAutoImports': 'auto',
        'typescript.suggest.autoImports': true
      },
      python: {
        ...baseSettings,
        'python.defaultInterpreterPath': 'python3',
        'python.linting.enabled': true,
        'python.formatting.provider': 'black'
      },
      java: {
        ...baseSettings,
        'java.configuration.updateBuildConfiguration': 'automatic'
      },
      rust: {
        ...baseSettings,
        'rust-analyzer.checkOnSave.command': 'clippy'
      },
      go: {
        ...baseSettings,
        'go.formatTool': 'goimports',
        'go.lintTool': 'golangci-lint'
      },
      csharp: {
        ...baseSettings,
        'omnisharp.enableEditorConfigSupport': true
      },
      cpp: {
        ...baseSettings,
        'C_Cpp.default.cppStandard': 'c++17'
      },
      php: {
        ...baseSettings,
        'php.suggest.basic': false,
        'intelephense.files.maxSize': 5000000
      },
      ruby: {
        ...baseSettings,
        'ruby.intellisense': 'rubyLocate'
      }
    };

    return stackSettings[stack] || baseSettings;
  }

  /**
   * Get recommended linters for stack
   */
  private getRecommendedLinters(stack: TechnologyStack): string[] {
    const linters: Record<TechnologyStack, string[]> = {
      javascript: ['eslint'],
      typescript: ['eslint', '@typescript-eslint/eslint-plugin'],
      python: ['pylint', 'flake8', 'mypy'],
      java: ['checkstyle', 'spotbugs'],
      rust: ['clippy'],
      go: ['golangci-lint'],
      csharp: ['StyleCop.Analyzers'],
      cpp: ['cppcheck', 'clang-tidy'],
      php: ['phpcs', 'phpstan'],
      ruby: ['rubocop']
    };
    return linters[stack] || [];
  }

  /**
   * Get recommended formatters for stack
   */
  private getRecommendedFormatters(stack: TechnologyStack): string[] {
    const formatters: Record<TechnologyStack, string[]> = {
      javascript: ['prettier'],
      typescript: ['prettier'],
      python: ['black', 'autopep8'],
      java: ['google-java-format'],
      rust: ['rustfmt'],
      go: ['gofmt', 'goimports'],
      csharp: ['dotnet-format'],
      cpp: ['clang-format'],
      php: ['php-cs-fixer'],
      ruby: ['rubocop']
    };
    return formatters[stack] || [];
  }

  /**
   * Get recommended debuggers for stack
   */
  private getRecommendedDebuggers(stack: TechnologyStack): string[] {
    const debuggers: Record<TechnologyStack, string[]> = {
      javascript: ['node-debug2'],
      typescript: ['node-debug2'],
      python: ['debugpy'],
      java: ['java-debug'],
      rust: ['lldb', 'gdb'],
      go: ['delve'],
      csharp: ['netcoredbg'],
      cpp: ['gdb', 'lldb'],
      php: ['xdebug'],
      ruby: ['ruby-debug-ide']
    };
    return debuggers[stack] || [];
  }

  /**
   * Get package managers for stack
   */
  private getPackageManagers(stack: TechnologyStack): string[] {
    const packageManagers: Record<TechnologyStack, string[]> = {
      javascript: ['npm', 'yarn', 'pnpm'],
      typescript: ['npm', 'yarn', 'pnpm'],
      python: ['pip', 'conda', 'poetry'],
      java: ['maven', 'gradle'],
      rust: ['cargo'],
      go: ['go mod'],
      csharp: ['nuget', 'dotnet'],
      cpp: ['vcpkg', 'conan'],
      php: ['composer'],
      ruby: ['gem', 'bundler']
    };
    return packageManagers[stack] || [];
  }

  /**
   * Get build tools for stack
   */
  private getBuildTools(stack: TechnologyStack): string[] {
    const buildTools: Record<TechnologyStack, string[]> = {
      javascript: ['webpack', 'vite', 'rollup'],
      typescript: ['tsc', 'webpack', 'vite'],
      python: ['setuptools', 'poetry'],
      java: ['maven', 'gradle'],
      rust: ['cargo'],
      go: ['go build'],
      csharp: ['msbuild', 'dotnet build'],
      cpp: ['make', 'cmake', 'ninja'],
      php: ['composer'],
      ruby: ['rake', 'bundler']
    };
    return buildTools[stack] || [];
  }

  /**
   * Gather complete workspace generation requirements
   */
  async gatherRequirements(
    userSelectedStacks: TechnologyStack[],
    selectedIDE: IDEType,
    baseDirectory: string
  ): Promise<WorkspaceGenerationRequirements> {
    const [availableIDEs, detectedStacks] = await Promise.all([
      this.detectAvailableIDEs(),
      this.detectTechnologyStacks()
    ]);

    const workspaceRequirements = this.generateWorkspaceRequirements(
      userSelectedStacks,
      selectedIDE
    );

    return {
      availableIDEs,
      selectedIDE,
      detectedStacks,
      userSelectedStacks,
      workspaceRequirements,
      workspaceStrategy: 'language-optimized', // Default to language-optimized workspaces
      baseDirectory
    };
  }
} 