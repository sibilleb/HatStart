/**
 * Simple IDE Configuration Generator
 * Generates IDE-specific configuration files for workspaces
 */

import type { IDEType } from '../ide-configuration/types';
import type { GeneratedWorkspace } from './workspace-generation-service';

export interface ConfigurationFile {
  path: string;
  content: string;
}

export class IDEConfigurationGenerator {
  /**
   * Generate configuration files for a specific IDE
   */
  async generateConfiguration(
    ide: IDEType,
    configuration: GeneratedWorkspace['configuration'],
    workspaceName: string
  ): Promise<ConfigurationFile[]> {
    const files: ConfigurationFile[] = [];

    switch (ide) {
      case 'vscode':
        files.push(...this.generateVSCodeConfiguration(configuration, workspaceName));
        break;
      case 'cursor':
        files.push(...this.generateCursorConfiguration(configuration, workspaceName));
        break;
      case 'jetbrains':
        files.push(...this.generateJetBrainsConfiguration(configuration, workspaceName));
        break;
      default:
        console.warn(`Unsupported IDE: ${ide}`);
    }

    return files;
  }

  /**
   * Generate VSCode configuration files
   */
  private generateVSCodeConfiguration(
    config: GeneratedWorkspace['configuration'],
    workspaceName: string
  ): ConfigurationFile[] {
    const files: ConfigurationFile[] = [];

    // Generate settings.json
    files.push({
      path: '.vscode/settings.json',
      content: JSON.stringify(config.settings, null, 2)
    });

    // Generate extensions.json
    if (config.extensions.length > 0) {
      files.push({
        path: '.vscode/extensions.json',
        content: JSON.stringify({
          recommendations: config.extensions,
          unwantedRecommendations: []
        }, null, 2)
      });
    }

    // Generate tasks.json
    if (config.tasks && config.tasks.length > 0) {
      files.push({
        path: '.vscode/tasks.json',
        content: JSON.stringify({
          version: '2.0.0',
          tasks: config.tasks
        }, null, 2)
      });
    }

    // Generate launch.json
    if (config.debugConfigs && config.debugConfigs.length > 0) {
      files.push({
        path: '.vscode/launch.json',
        content: JSON.stringify({
          version: '0.2.0',
          configurations: config.debugConfigs
        }, null, 2)
      });
    }

    // Generate workspace file
    files.push({
      path: `${workspaceName}.code-workspace`,
      content: JSON.stringify({
        folders: [
          {
            name: workspaceName,
            path: '.'
          }
        ],
        settings: config.settings,
        extensions: {
          recommendations: config.extensions
        }
      }, null, 2)
    });

    return files;
  }

  /**
   * Generate Cursor configuration files
   */
  private generateCursorConfiguration(
    config: GeneratedWorkspace['configuration'],
    workspaceName: string
  ): ConfigurationFile[] {
    const files: ConfigurationFile[] = [];

    // Cursor uses similar structure to VSCode
    const cursorSettings = {
      ...config.settings,
      'cursor.aiEnabled': true,
      'cursor.aiModel': 'claude-3',
      'cursor.copilotEnabled': true
    };

    files.push({
      path: '.cursor/settings.json',
      content: JSON.stringify(cursorSettings, null, 2)
    });

    // Also generate VSCode compatible files
    files.push({
      path: '.vscode/settings.json',
      content: JSON.stringify(config.settings, null, 2)
    });

    if (config.extensions.length > 0) {
      files.push({
        path: '.vscode/extensions.json',
        content: JSON.stringify({
          recommendations: config.extensions
        }, null, 2)
      });
    }

    // Generate workspace file
    files.push({
      path: `${workspaceName}.code-workspace`,
      content: JSON.stringify({
        folders: [
          {
            name: workspaceName,
            path: '.'
          }
        ],
        settings: cursorSettings,
        extensions: {
          recommendations: config.extensions
        }
      }, null, 2)
    });

    return files;
  }

  /**
   * Generate JetBrains IDE configuration files
   */
  private generateJetBrainsConfiguration(
    config: GeneratedWorkspace['configuration'],
    workspaceName: string
  ): ConfigurationFile[] {
    const files: ConfigurationFile[] = [];

    // Generate .idea directory structure
    files.push({
      path: '.idea/modules.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectModuleManager">
    <modules>
      <module fileurl="file://$PROJECT_DIR$/${workspaceName}.iml" filepath="$PROJECT_DIR$/${workspaceName}.iml" />
    </modules>
  </component>
</project>`
    });

    files.push({
      path: '.idea/misc.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectRootManager" version="2" languageLevel="JDK_11" default="true" project-jdk-name="11" project-jdk-type="JavaSDK">
    <output url="file://$PROJECT_DIR$/out" />
  </component>
</project>`
    });

    files.push({
      path: '.idea/workspace.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ChangeListManager">
    <list default="true" id="default" name="Default Changelist" comment="" />
    <option name="SHOW_DIALOG" value="false" />
    <option name="HIGHLIGHT_CONFLICTS" value="true" />
    <option name="HIGHLIGHT_NON_ACTIVE_CHANGELIST" value="false" />
    <option name="LAST_RESOLUTION" value="IGNORE" />
  </component>
</project>`
    });

    // Generate IML file
    files.push({
      path: `${workspaceName}.iml`,
      content: `<?xml version="1.0" encoding="UTF-8"?>
<module type="GENERAL_MODULE" version="4">
  <component name="NewModuleRootManager" inherit-compiler-output="true">
    <exclude-output />
    <content url="file://$MODULE_DIR$" />
    <orderEntry type="inheritedJdk" />
    <orderEntry type="sourceFolder" forTests="false" />
  </component>
</module>`
    });

    return files;
  }

  /**
   * Generate linter configuration files
   */
  generateLinterConfigs(
    linters: Array<{ name: string; config?: unknown }>
  ): ConfigurationFile[] {
    const files: ConfigurationFile[] = [];

    linters.forEach(linter => {
      switch (linter.name) {
        case 'eslint':
          files.push({
            path: '.eslintrc.json',
            content: JSON.stringify(linter.config || {
              env: {
                browser: true,
                es2021: true,
                node: true
              },
              extends: ['eslint:recommended'],
              parserOptions: {
                ecmaVersion: 12,
                sourceType: 'module'
              },
              rules: {}
            }, null, 2)
          });
          break;

        case 'flake8':
          files.push({
            path: '.flake8',
            content: `[flake8]
max-line-length = ${(linter.config as any)?.['max-line-length'] || 88}
extend-ignore = E203, W503
exclude = .git,__pycache__,build,dist`
          });
          break;

        case 'pylint':
          files.push({
            path: '.pylintrc',
            content: `[MASTER]
init-hook='import sys; sys.path.append(".")'

[MESSAGES CONTROL]
disable=C0111,R0903

[FORMAT]
max-line-length=${(linter.config as any)?.['max-line-length'] || 100}`
          });
          break;
      }
    });

    return files;
  }

  /**
   * Generate formatter configuration files
   */
  generateFormatterConfigs(
    formatters: Array<{ name: string; config?: unknown }>
  ): ConfigurationFile[] {
    const files: ConfigurationFile[] = [];

    formatters.forEach(formatter => {
      switch (formatter.name) {
        case 'prettier':
          files.push({
            path: '.prettierrc',
            content: JSON.stringify(formatter.config || {
              semi: true,
              trailingComma: 'es5',
              singleQuote: true,
              printWidth: 80,
              tabWidth: 2
            }, null, 2)
          });
          break;

        case 'black':
          const blackConfig = formatter.config as Record<string, unknown> || {};
          files.push({
            path: 'pyproject.toml',
            content: `[tool.black]
line-length = ${blackConfig['line-length'] || 88}
target-version = ${JSON.stringify(blackConfig['target-version'] || ['py39'])}
include = '\\.pyi?$'`
          });
          break;
      }
    });

    return files;
  }

  /**
   * Generate README file
   */
  generateReadme(workspace: GeneratedWorkspace): ConfigurationFile {
    return {
      path: 'README.md',
      content: `# ${workspace.name}

This workspace is configured for ${workspace.stack.join(', ')} development using ${workspace.ide}.

## Setup

1. Open this workspace in ${workspace.ide}
2. Install recommended extensions when prompted
3. Run the setup commands listed below

## Configuration

### Extensions
${workspace.configuration.extensions.map(ext => `- ${ext}`).join('\n')}

### Linters
${workspace.configuration.linters.map(l => `- ${l.name}`).join('\n')}

### Formatters
${workspace.configuration.formatters.map(f => `- ${f.name}`).join('\n')}

## Commands

${workspace.commands.map(cmd => `### ${cmd.description}
\`\`\`bash
${cmd.command}
\`\`\``).join('\n\n')}

---
Generated by HatStart Workspace Generator
`
    };
  }
}