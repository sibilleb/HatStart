/**
 * Simple Workspace Generator
 * Replaces 9,500+ lines of over-engineered code with a practical solution
 * for generating IDE configuration files based on selected tools
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type { SimpleTool } from '../../shared/simple-manifest-types';

export type IDEType = 'vscode' | 'cursor' | 'jetbrains';

export interface WorkspaceConfig {
  selectedTools: string[];
  toolsMetadata: SimpleTool[];
  ide: IDEType;
  workspacePath: string;
  workspaceName: string;
}

export interface WorkspaceResult {
  success: boolean;
  path: string;
  filesCreated: string[];
  error?: string;
}

/**
 * Maps tool categories to IDE extensions
 */
const CATEGORY_EXTENSIONS: Record<string, string[]> = {
  language: {
    nodejs: [
      'dbaeumer.vscode-eslint',
      'esbenp.prettier-vscode',
      'christian-kohler.npm-intellisense'
    ],
    python: [
      'ms-python.python',
      'ms-python.vscode-pylance',
      'charliermarsh.ruff'
    ],
    go: [
      'golang.go'
    ],
    rust: [
      'rust-lang.rust-analyzer',
      'tamasfe.even-better-toml'
    ],
    java: [
      'redhat.java',
      'vscjava.vscode-java-debug'
    ]
  },
  database: [
    'mtxr.sqltools',
    'mongodb.mongodb-vscode'
  ],
  devops: [
    'ms-kubernetes-tools.vscode-kubernetes-tools',
    'ms-azuretools.vscode-docker'
  ],
  productivity: [
    'eamodio.gitlens',
    'wayou.vscode-todo-highlight'
  ]
};

/**
 * Basic VSCode settings for different languages
 */
const LANGUAGE_SETTINGS: Record<string, Record<string, unknown>> = {
  nodejs: {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
    "typescript.updateImportsOnFileMove.enabled": "always"
  },
  python: {
    "editor.formatOnSave": true,
    "[python]": {
      "editor.defaultFormatter": "charliermarsh.ruff",
      "editor.codeActionsOnSave": {
        "source.organizeImports": true
      }
    },
    "python.linting.enabled": true,
    "python.testing.pytestEnabled": true
  },
  go: {
    "editor.formatOnSave": true,
    "[go]": {
      "editor.defaultFormatter": "golang.go"
    },
    "go.lintOnSave": "package",
    "go.formatTool": "goimports"
  },
  rust: {
    "editor.formatOnSave": true,
    "[rust]": {
      "editor.defaultFormatter": "rust-lang.rust-analyzer"
    },
    "rust-analyzer.checkOnSave.command": "clippy"
  }
};

export class SimpleWorkspaceGenerator {
  /**
   * Generate workspace configuration files
   */
  async generateWorkspace(config: WorkspaceConfig): Promise<WorkspaceResult> {
    try {
      const { ide, workspacePath, selectedTools, toolsMetadata } = config;
      
      // Create workspace directory
      await fs.mkdir(workspacePath, { recursive: true });
      
      const filesCreated: string[] = [];
      
      if (ide === 'vscode' || ide === 'cursor') {
        // Create .vscode or .cursor directory
        const configDir = path.join(workspacePath, ide === 'vscode' ? '.vscode' : '.cursor');
        await fs.mkdir(configDir, { recursive: true });
        
        // Generate extensions.json
        const extensions = this.getExtensionsForTools(selectedTools, toolsMetadata);
        const extensionsFile = path.join(configDir, 'extensions.json');
        await fs.writeFile(extensionsFile, JSON.stringify({
          recommendations: extensions
        }, null, 2));
        filesCreated.push(extensionsFile);
        
        // Generate settings.json
        const settings = this.getSettingsForTools(selectedTools, toolsMetadata);
        const settingsFile = path.join(configDir, 'settings.json');
        await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
        filesCreated.push(settingsFile);
        
        // Generate simple README
        const readmeFile = path.join(workspacePath, 'README.md');
        await fs.writeFile(readmeFile, this.generateReadme(config));
        filesCreated.push(readmeFile);
      }
      
      return {
        success: true,
        path: workspacePath,
        filesCreated
      };
      
    } catch (error) {
      return {
        success: false,
        path: config.workspacePath,
        filesCreated: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get IDE extensions based on selected tools
   */
  private getExtensionsForTools(selectedTools: string[], toolsMetadata: SimpleTool[]): string[] {
    const extensions = new Set<string>();
    
    // Add extensions based on tool categories
    for (const toolId of selectedTools) {
      const tool = toolsMetadata.find(t => t.id === toolId);
      if (!tool) continue;
      
      // Language-specific extensions
      const langExtensions = CATEGORY_EXTENSIONS.language[toolId];
      if (langExtensions) {
        langExtensions.forEach(ext => extensions.add(ext));
      }
      
      // Category-based extensions
      const categoryExtensions = CATEGORY_EXTENSIONS[tool.category];
      if (categoryExtensions) {
        categoryExtensions.forEach(ext => extensions.add(ext));
      }
    }
    
    // Always include some basics
    extensions.add('editorconfig.editorconfig');
    
    return Array.from(extensions);
  }
  
  /**
   * Get IDE settings based on selected tools
   */
  private getSettingsForTools(selectedTools: string[], _toolsMetadata: SimpleTool[]): Record<string, unknown> {
    let settings: Record<string, unknown> = {
      "editor.tabSize": 2,
      "editor.insertSpaces": true,
      "files.trimTrailingWhitespace": true,
      "files.insertFinalNewline": true
    };
    
    // Merge language-specific settings
    for (const toolId of selectedTools) {
      const langSettings = LANGUAGE_SETTINGS[toolId];
      if (langSettings) {
        settings = { ...settings, ...langSettings };
      }
    }
    
    return settings;
  }
  
  /**
   * Generate a simple README for the workspace
   */
  private generateReadme(config: WorkspaceConfig): string {
    const tools = config.selectedTools.join(', ');
    
    return `# ${config.workspaceName}

This workspace was generated by HatStart with the following tools configured:
${tools}

## Getting Started

1. Open this folder in ${config.ide === 'vscode' ? 'Visual Studio Code' : config.ide === 'cursor' ? 'Cursor' : 'your IDE'}
2. Install recommended extensions when prompted
3. Start coding!

## Configuration

The IDE settings and extensions have been pre-configured based on your tool selection.
You can modify these in the .${config.ide}/ directory.
`;
  }
}

// Export singleton instance
export const workspaceGenerator = new SimpleWorkspaceGenerator();