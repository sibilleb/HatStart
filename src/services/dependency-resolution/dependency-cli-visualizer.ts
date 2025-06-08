/**
 * Dependency CLI Visualizer
 * Command-line interface for dependency graph visualization and conflict resolution
 */

import chalk from 'chalk';
import { DependencyGraph } from './dependency-graph.js';
import {
  ConflictDetectionResult,
  ConflictDetail,
  ResolutionExecutionResult
} from './types.js';
import type { Platform } from '../../shared/manifest-types.js';

/**
 * Options for CLI visualization
 */
export interface CLIVisualizationOptions {
  /** Show detailed information */
  verbose?: boolean;
  /** Use color output */
  useColor?: boolean;
  /** Maximum depth to display */
  maxDepth?: number;
  /** Show only conflicts */
  conflictsOnly?: boolean;
  /** Output format */
  format?: 'tree' | 'table' | 'json';
}

/**
 * CLI visualizer for dependency graphs
 */
export class DependencyCLIVisualizer {
  private options: CLIVisualizationOptions;

  constructor(options: CLIVisualizationOptions = {}) {
    this.options = {
      verbose: false,
      useColor: true,
      maxDepth: 10,
      conflictsOnly: false,
      format: 'tree',
      ...options
    };
  }

  /**
   * Visualize dependency graph in CLI
   */
  visualizeGraph(
    graph: DependencyGraph,
    selectedTools: string[],
    platform: Platform
  ): string {
    if (this.options.format === 'json') {
      return this.visualizeAsJSON(graph, selectedTools);
    }

    if (this.options.format === 'table') {
      return this.visualizeAsTable(graph, selectedTools);
    }

    return this.visualizeAsTree(graph, selectedTools);
  }

  /**
   * Visualize conflicts in CLI
   */
  visualizeConflicts(conflicts: ConflictDetectionResult): string {
    if (!conflicts.hasConflicts) {
      return this.formatSuccess('No conflicts detected!');
    }

    const output: string[] = [];
    output.push(this.formatError(`Detected ${conflicts.statistics.totalConflicts} conflicts:`));
    output.push('');

    // Group conflicts by type
    const conflictsByType = this.groupConflictsByType(conflicts.conflicts);

    for (const [type, typeConflicts] of conflictsByType) {
      output.push(this.formatHeader(`${type} Conflicts (${typeConflicts.length})`));
      output.push('');

      for (const conflict of typeConflicts) {
        output.push(this.formatConflict(conflict));
        output.push('');
      }
    }

    // Show statistics
    if (this.options.verbose) {
      output.push(this.formatHeader('Conflict Statistics'));
      output.push(this.formatKeyValue('Total Conflicts', conflicts.statistics.totalConflicts));
      output.push(this.formatKeyValue('Critical', conflicts.statistics.criticalConflicts));
      output.push(this.formatKeyValue('Resolvable', conflicts.statistics.resolvableConflicts));
      output.push(this.formatKeyValue('Blockers', conflicts.statistics.blockerConflicts));
      output.push('');
    }

    return output.join('\n');
  }

  /**
   * Visualize resolution results
   */
  visualizeResolution(resolution: ResolutionExecutionResult): string {
    const output: string[] = [];

    if (resolution.success) {
      output.push(this.formatSuccess('Resolution completed successfully!'));
    } else {
      output.push(this.formatError('Resolution failed'));
    }
    output.push('');

    // Show summary
    output.push(this.formatHeader('Resolution Summary'));
    output.push(resolution.summary.description);
    output.push(this.formatKeyValue('Impact', resolution.summary.impact));
    output.push(this.formatKeyValue('Reversible', resolution.summary.reversible ? 'Yes' : 'No'));
    output.push('');

    // Show steps
    if (resolution.appliedSteps.length > 0) {
      output.push(this.formatHeader('Applied Steps'));
      output.push('');

      for (let i = 0; i < resolution.appliedSteps.length; i++) {
        const step = resolution.appliedSteps[i];
        output.push(this.formatStep(i + 1, step));
      }
      output.push('');
    }

    // Show statistics
    if (this.options.verbose) {
      output.push(this.formatHeader('Resolution Statistics'));
      output.push(this.formatKeyValue('Conflicts Resolved', resolution.statistics.conflictsResolved));
      output.push(this.formatKeyValue('Steps Executed', resolution.statistics.stepsExecuted));
      output.push(this.formatKeyValue('Execution Time', `${resolution.statistics.executionTime}ms`));
      output.push(this.formatKeyValue('User Interactions', resolution.statistics.userInteractions));
      output.push('');
    }

    return output.join('\n');
  }

  /**
   * Visualize as tree structure
   */
  private visualizeAsTree(
    graph: DependencyGraph,
    selectedTools: string[]
  ): string {
    const output: string[] = [];
    const visited = new Set<string>();

    output.push(this.formatHeader('Dependency Tree'));
    output.push('');

    // Start from selected tools
    for (const toolId of selectedTools) {
      const node = graph.getNode(toolId);
      if (node) {
        this.buildTreeView(graph, node.tool.id, output, 0, visited);
        output.push('');
      }
    }

    // Show unconnected nodes if verbose
    if (this.options.verbose) {
      const unconnected = graph.getAllNodes()
        .filter(n => !visited.has(n.tool.id))
        .map(n => n.tool.id);

      if (unconnected.length > 0) {
        output.push(this.formatHeader('Unconnected Tools'));
        for (const toolId of unconnected) {
          output.push(`  • ${toolId}`);
        }
        output.push('');
      }
    }

    return output.join('\n');
  }

  /**
   * Build tree view recursively
   */
  private buildTreeView(
    graph: DependencyGraph,
    nodeId: string,
    output: string[],
    depth: number,
    visited: Set<string>
  ): void {
    if (visited.has(nodeId) || depth > this.options.maxDepth!) {
      return;
    }

    visited.add(nodeId);
    const node = graph.getNode(nodeId);
    if (!node) return;

    const prefix = '  '.repeat(depth);
    const symbol = depth === 0 ? '📦' : '├─';
    const status = node.status.installed ? '✓' : '○';
    
    let line = `${prefix}${symbol} ${node.tool.name} (${node.tool.id}) ${status}`;
    
    if (node.tool.version?.stable) {
      line += ` v${node.tool.version.stable}`;
    }

    output.push(this.formatTool(line, node.tool.category));

    // Show dependencies
    const edges = graph.getOutgoingEdges(nodeId);
    for (const edge of edges) {
      this.buildTreeView(graph, edge.to, output, depth + 1, visited);
    }
  }

  /**
   * Visualize as table
   */
  private visualizeAsTable(
    graph: DependencyGraph,
    selectedTools: string[]
  ): string {
    const output: string[] = [];
    const nodes = graph.getAllNodes();

    output.push(this.formatHeader('Dependency Table'));
    output.push('');

    // Header
    const header = ['Tool', 'Category', 'Version', 'Status', 'Dependencies', 'Dependents'];
    output.push(this.formatTableRow(header));
    output.push(this.formatTableSeparator(header.length));

    // Rows
    for (const node of nodes) {
      const dependencies = graph.getOutgoingEdges(node.tool.id).length;
      const dependents = graph.getIncomingEdges(node.tool.id).length;
      
      const row = [
        node.tool.id,
        node.tool.category,
        node.tool.version?.stable || 'N/A',
        node.status.installed ? 'Installed' : 'Not Installed',
        dependencies.toString(),
        dependents.toString()
      ];

      output.push(this.formatTableRow(row));
    }

    output.push('');
    return output.join('\n');
  }

  /**
   * Visualize as JSON
   */
  private visualizeAsJSON(
    graph: DependencyGraph,
    selectedTools: string[]
  ): string {
    const data = {
      selectedTools,
      nodes: graph.getAllNodes().map(node => ({
        id: node.tool.id,
        name: node.tool.name,
        category: node.tool.category,
        version: node.tool.version?.stable,
        installed: node.status.installed,
        dependencies: graph.getOutgoingEdges(node.tool.id).map(e => e.to)
      })),
      statistics: graph.getStatistics()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Format conflict details
   */
  private formatConflict(conflict: ConflictDetail): string {
    const severity = this.formatSeverity(conflict.severity);
    const output: string[] = [];

    output.push(`${severity} ${conflict.description}`);
    
    if (conflict.involvedTools.length > 0) {
      output.push(`  Involved tools: ${conflict.involvedTools.join(', ')}`);
    }

    if (conflict.suggestedResolutions.length > 0 && this.options.verbose) {
      output.push('  Suggested resolutions:');
      for (const resolution of conflict.suggestedResolutions) {
        output.push(`    • ${resolution.name} (${resolution.confidence}% confidence)`);
      }
    }

    return output.join('\n');
  }

  /**
   * Format resolution step
   */
  private formatStep(index: number, step: any): string {
    const status = step.result === 'success' ? '✓' : 
                   step.result === 'failed' ? '✗' : 
                   '○';
    
    return `  ${index}. ${status} ${step.description}`;
  }

  /**
   * Group conflicts by type
   */
  private groupConflictsByType(
    conflicts: ConflictDetail[]
  ): Map<string, ConflictDetail[]> {
    const grouped = new Map<string, ConflictDetail[]>();

    for (const conflict of conflicts) {
      const type = conflict.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(conflict);
    }

    return grouped;
  }

  // Formatting helpers

  private formatHeader(text: string): string {
    if (!this.options.useColor) return `=== ${text} ===`;
    return chalk.bold.blue(`=== ${text} ===`);
  }

  private formatSuccess(text: string): string {
    if (!this.options.useColor) return `✓ ${text}`;
    return chalk.green(`✓ ${text}`);
  }

  private formatError(text: string): string {
    if (!this.options.useColor) return `✗ ${text}`;
    return chalk.red(`✗ ${text}`);
  }

  private formatKeyValue(key: string, value: any): string {
    if (!this.options.useColor) return `  ${key}: ${value}`;
    return `  ${chalk.gray(key)}: ${chalk.white(value)}`;
  }

  private formatSeverity(severity: string): string {
    if (!this.options.useColor) return `[${severity.toUpperCase()}]`;
    
    switch (severity) {
      case 'critical':
        return chalk.red(`[${severity.toUpperCase()}]`);
      case 'major':
        return chalk.yellow(`[${severity.toUpperCase()}]`);
      case 'minor':
        return chalk.blue(`[${severity.toUpperCase()}]`);
      default:
        return chalk.gray(`[${severity.toUpperCase()}]`);
    }
  }

  private formatTool(text: string, category: string): string {
    if (!this.options.useColor) return text;
    
    // Color by category
    switch (category) {
      case 'language':
        return chalk.magenta(text);
      case 'productivity':
        return chalk.blue(text);
      case 'devops':
        return chalk.green(text);
      case 'testing':
        return chalk.yellow(text);
      case 'security':
        return chalk.red(text);
      default:
        return chalk.white(text);
    }
  }

  private formatTableRow(columns: string[]): string {
    return '| ' + columns.map(col => col.padEnd(15)).join(' | ') + ' |';
  }

  private formatTableSeparator(columns: number): string {
    return '|-' + Array(columns).fill('-'.repeat(15)).join('-|-') + '-|';
  }
}

/**
 * Create a new CLI visualizer
 */
export function createDependencyCLIVisualizer(
  options?: CLIVisualizationOptions
): DependencyCLIVisualizer {
  return new DependencyCLIVisualizer(options);
}

/**
 * Interactive CLI prompt for conflict resolution
 */
export interface CLIPromptOptions {
  /** Prompt message */
  message: string;
  /** Available choices */
  choices: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  /** Default choice */
  defaultChoice?: string;
}

/**
 * CLI prompt helper for interactive resolution
 */
export async function promptForResolution(
  options: CLIPromptOptions
): Promise<string> {
  // This would integrate with a CLI prompt library like inquirer
  // For now, return a placeholder implementation
  console.log(options.message);
  console.log('\nAvailable options:');
  
  for (let i = 0; i < options.choices.length; i++) {
    const choice = options.choices[i];
    const isDefault = choice.value === options.defaultChoice;
    console.log(`  ${i + 1}. ${choice.label}${isDefault ? ' (default)' : ''}`);
    if (choice.description) {
      console.log(`     ${choice.description}`);
    }
  }
  
  // In a real implementation, this would wait for user input
  return options.defaultChoice || options.choices[0].value;
}

/**
 * Progress indicator for long-running operations
 */
export class CLIProgressIndicator {
  private message: string;
  private startTime: number;
  private spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private intervalId?: NodeJS.Timeout;

  constructor(message: string) {
    this.message = message;
    this.startTime = Date.now();
  }

  start(): void {
    this.intervalId = setInterval(() => {
      process.stdout.write(`\r${this.spinner[this.currentFrame]} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.spinner.length;
    }, 80);
  }

  stop(success: boolean = true): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    const elapsed = Date.now() - this.startTime;
    const status = success ? chalk.green('✓') : chalk.red('✗');
    process.stdout.write(`\r${status} ${this.message} (${elapsed}ms)\n`);
  }

  update(message: string): void {
    this.message = message;
  }
}