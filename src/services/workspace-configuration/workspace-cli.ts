/**
 * Workspace Configuration CLI
 * Command-line interface wrapper for workspace management
 */

import type { VersionedTool } from '../version-manager-types';
import { WorkspaceCLITools, type CLICommandResult } from './workspace-cli-tools';

/**
 * CLI command interface
 */
export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  options?: CLIOption[];
  execute: (args: string[], options: Record<string, string | boolean | number>) => Promise<CLICommandResult>;
}

/**
 * CLI option interface
 */
export interface CLIOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: string | boolean | number;
}

/**
 * Workspace CLI implementation
 */
export class WorkspaceCLI {
  private tools: WorkspaceCLITools;
  private commands: Map<string, CLICommand>;

  constructor() {
    this.tools = new WorkspaceCLITools();
    this.commands = new Map();
    this.initializeCommands();
  }

  /**
   * Execute a CLI command
   */
  async execute(commandName: string, args: string[] = [], options: Record<string, string | boolean | number> = {}): Promise<CLICommandResult> {
    const command = this.commands.get(commandName);
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${commandName}`,
        error: `Command '${commandName}' not found. Use 'help' to see available commands.`
      };
    }

    try {
      return await command.execute(args, options);
    } catch (error) {
      return {
        success: false,
        message: `Command execution failed: ${commandName}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get available commands
   */
  getCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command by name
   */
  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  /**
   * Parse command line arguments
   */
  parseArgs(argv: string[]): { command: string; args: string[]; options: Record<string, string | boolean | number> } {
    const [command, ...rest] = argv;
    const args: string[] = [];
    const options: Record<string, string | boolean | number> = {};

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      
      if (arg.startsWith('--')) {
        // Long option
        const [key, value] = arg.slice(2).split('=');
        if (value !== undefined) {
          options[key] = this.parseValue(value);
        } else if (i + 1 < rest.length && !rest[i + 1].startsWith('-')) {
          options[key] = this.parseValue(rest[++i]);
        } else {
          options[key] = true;
        }
      } else if (arg.startsWith('-')) {
        // Short option
        const key = arg.slice(1);
        if (i + 1 < rest.length && !rest[i + 1].startsWith('-')) {
          options[key] = this.parseValue(rest[++i]);
        } else {
          options[key] = true;
        }
      } else {
        // Positional argument
        args.push(arg);
      }
    }

    return { command: command || 'help', args, options };
  }

  /**
   * Format command result for display
   */
  formatResult(result: CLICommandResult): string {
    let output = '';

    if (result.success) {
      output += `✅ ${result.message}\n`;
      
      if (result.data) {
        output += this.formatData(result.data);
      }
      
      if (result.warnings && result.warnings.length > 0) {
        output += '\n⚠️  Warnings:\n';
        result.warnings.forEach(warning => {
          output += `   - ${warning}\n`;
        });
      }
    } else {
      output += `❌ ${result.message}\n`;
      
      if (result.error) {
        output += `Error: ${result.error}\n`;
      }
      
      if (result.warnings && result.warnings.length > 0) {
        output += '\nWarnings:\n';
        result.warnings.forEach(warning => {
          output += `   - ${warning}\n`;
        });
      }
    }

    return output;
  }

  /**
   * Initialize available commands
   */
  private initializeCommands(): void {
    // Initialize workspace command
    this.commands.set('init', {
      name: 'init',
      description: 'Initialize workspace configuration',
      usage: 'workspace init [options]',
      options: [
        { name: 'name', description: 'Workspace name', type: 'string' },
        { name: 'force', description: 'Force initialization', type: 'boolean' },
        { name: 'with-defaults', description: 'Initialize with default tools', type: 'boolean' },
        { name: 'template', description: 'Template to use (minimal, web, backend, fullstack, mobile)', type: 'string' },
        { name: 'git-integration', description: 'Enable git integration', type: 'boolean' },
        { name: 'team-sharing', description: 'Enable team configuration sharing', type: 'boolean' }
      ],
      execute: async (args, options) => {
        const workspaceRoot = args[0] || process.cwd();
        return this.tools.initializeWorkspace(workspaceRoot, {
          name: options.name as string,
          force: options.force as boolean,
          withDefaults: options['with-defaults'] as boolean,
          template: options.template as 'minimal' | 'web' | 'backend' | 'fullstack' | 'mobile',
          gitIntegration: options['git-integration'] as boolean,
          teamSharing: options['team-sharing'] as boolean
        });
      }
    });

    // Update workspace command
    this.commands.set('update', {
      name: 'update',
      description: 'Update workspace configuration',
      usage: 'workspace update [options]',
      options: [
        { name: 'tools', description: 'Comma-separated list of tools to update', type: 'string' },
        { name: 'environment', description: 'Update environment variables', type: 'boolean' },
        { name: 'path', description: 'Update PATH configuration', type: 'boolean' },
        { name: 'shell', description: 'Update shell integrations', type: 'boolean' },
        { name: 'validate', description: 'Validate after update', type: 'boolean' }
      ],
      execute: async (args, options) => {
        const workspaceRoot = args[0] || process.cwd();
        const tools = options.tools ? (options.tools as string).split(',').map((t: string) => t.trim() as VersionedTool) : undefined;
        
        return this.tools.updateWorkspace(workspaceRoot, {
          tools,
          environment: options.environment as boolean,
          path: options.path as boolean,
          shell: options.shell as boolean,
          validate: options.validate as boolean
        });
      }
    });

    // Sync workspace command
    this.commands.set('sync', {
      name: 'sync',
      description: 'Synchronize workspace with team configuration',
      usage: 'workspace sync [options]',
      options: [
        { name: 'direction', description: 'Sync direction (pull, push, both)', type: 'string', default: 'both' },
        { name: 'force', description: 'Force sync even with conflicts', type: 'boolean' },
        { name: 'dry-run', description: 'Show what would be changed without applying', type: 'boolean' },
        { name: 'backup', description: 'Create backup before sync', type: 'boolean' },
        { name: 'conflict-resolution', description: 'Conflict resolution strategy (local, remote, merge, interactive)', type: 'string' }
      ],
      execute: async (args, options) => {
        const workspaceRoot = args[0] || process.cwd();
        return this.tools.synchronizeWorkspace(workspaceRoot, {
          direction: options.direction as 'push' | 'pull' | 'both' | undefined,
          force: Boolean(options.force),
          dryRun: Boolean(options['dry-run']),
          backup: Boolean(options.backup),
          conflictResolution: options['conflict-resolution'] as 'local' | 'remote' | 'merge' | 'interactive' | undefined
        });
      }
    });

    // Validate workspace command
    this.commands.set('validate', {
      name: 'validate',
      description: 'Validate workspace configuration',
      usage: 'workspace validate [workspace-root]',
      execute: async (args, _options) => {
        const workspaceRoot = args[0] || process.cwd();
        return this.tools.validateWorkspace(workspaceRoot);
      }
    });

    // Backup workspace command
    this.commands.set('backup', {
      name: 'backup',
      description: 'Create workspace backup',
      usage: 'workspace backup [workspace-root] [options]',
      options: [
        { name: 'reason', description: 'Reason for backup', type: 'string', default: 'manual' }
      ],
      execute: async (args, options) => {
        const workspaceRoot = args[0] || process.cwd();
        return this.tools.createBackup(workspaceRoot, (options as { reason?: string }).reason);
      }
    });

    // List tools command
    this.commands.set('list', {
      name: 'list',
      description: 'List workspace tools',
      usage: 'workspace list [workspace-root]',
      execute: async (args, _options) => {
        const workspaceRoot = args[0] || process.cwd();
        return this.tools.listTools(workspaceRoot);
      }
    });

    // Help command
    this.commands.set('help', {
      name: 'help',
      description: 'Show help information',
      usage: 'workspace help [command]',
      execute: async (args, _options) => {
        const commandName = args[0];
        
        if (commandName) {
          const command = this.commands.get(commandName);
          if (command) {
            let help = `Command: ${command.name}\n`;
            help += `Description: ${command.description}\n`;
            help += `Usage: ${command.usage}\n`;
            
            if (command.options && command.options.length > 0) {
              help += '\nOptions:\n';
              command.options.forEach(option => {
                const alias = option.alias ? `, -${option.alias}` : '';
                const required = option.required ? ' (required)' : '';
                const defaultValue = option.default !== undefined ? ` (default: ${option.default})` : '';
                help += `  --${option.name}${alias}: ${option.description}${required}${defaultValue}\n`;
              });
            }
            
            return {
              success: true,
              message: help,
              data: command
            };
          } else {
            return {
              success: false,
              message: `Unknown command: ${commandName}`,
              error: 'Command not found'
            };
          }
        } else {
          let help = 'Workspace Configuration CLI\n\n';
          help += 'Available commands:\n';
          
          this.commands.forEach(command => {
            help += `  ${command.name.padEnd(12)} ${command.description}\n`;
          });
          
          help += '\nUse "workspace help <command>" for detailed information about a specific command.\n';
          
          return {
            success: true,
            message: help,
            data: { commands: Array.from(this.commands.values()) }
          };
        }
      }
    });
  }

  /**
   * Parse value from string
   */
  private parseValue(value: string): string | boolean | number {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') {
      return true;
    }
    
    if (value.toLowerCase() === 'false') {
      return false;
    }
    
    // Return as string
    return value;
  }

  /**
   * Format data for display
   */
  private formatData(data: unknown): string {
    if (!data) return '';
    
    let output = '';
    
    const typedData = data as {
      tools?: VersionedTool[];
      activeTools?: VersionedTool[];
      inactiveTools?: VersionedTool[];
      validation?: {
        errors?: string[];
        warnings?: string[];
        suggestions?: string[];
      };
      message?: string;
      conflicts?: string[];
    };
    
    if (typedData.tools) {
      output += '\nTools:\n';
      typedData.tools.forEach((tool: any) => {
        const status = tool.active ? '✅' : '❌';
        output += `  ${status} ${tool.tool}@${tool.version} (${tool.manager})\n`;
      });
    }
    
    if (typedData.activeTools && typedData.inactiveTools) {
      output += `\nActive tools: ${typedData.activeTools.length}\n`;
      output += `Inactive tools: ${typedData.inactiveTools.length}\n`;
    }
    
    if (typedData.validation) {
      output += '\nValidation Results:\n';
      if (typedData.validation.errors && typedData.validation.errors.length > 0) {
        output += '  Errors:\n';
        typedData.validation.errors.forEach((error: string) => {
          output += `    - ${error}\n`;
        });
      }
      
      if (typedData.validation.warnings && typedData.validation.warnings.length > 0) {
        output += '  Warnings:\n';
        typedData.validation.warnings.forEach((warning: string) => {
          output += `    - ${warning}\n`;
        });
      }
      
      if (typedData.validation.suggestions && typedData.validation.suggestions.length > 0) {
        output += '  Suggestions:\n';
        typedData.validation.suggestions.forEach((suggestion: string) => {
          output += `    - ${suggestion}\n`;
        });
      }
    }
    
    if (typedData.conflicts && typedData.conflicts.length > 0) {
      output += '\nConflicts:\n';
      typedData.conflicts.forEach((conflict: string) => {
        output += `  - ${conflict}\n`;
      });
    }
    
    return output;
  }
}

/**
 * Factory function to create workspace CLI
 */
export function createWorkspaceCLI(): WorkspaceCLI {
  return new WorkspaceCLI();
}

/**
 * Main CLI entry point
 */
export async function runWorkspaceCLI(argv: string[]): Promise<void> {
  const cli = createWorkspaceCLI();
  const { command, args, options } = cli.parseArgs(argv);
  
  const result = await cli.execute(command, args, options);
  const output = cli.formatResult(result);
  
  console.log(output);
  
  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

