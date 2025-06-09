/**
 * Programming Language Detection Module
 * Simple and effective detection of programming languages and runtimes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { DetectionResult, PlatformType } from './detection-types';

const execAsync = promisify(exec);

export interface LanguageCommand {
  /** Platform this command applies to */
  platform: PlatformType;
  /** Command to execute */
  command: string;
  /** Alternative commands to try */
  alternatives?: string[];
  /** Regex to extract version */
  versionRegex?: RegExp;
  /** Timeout in milliseconds */
  timeout?: number;
}

export interface LanguageDefinition {
  /** Language name */
  name: string;
  /** Commands for each platform */
  commands: LanguageCommand[];
  /** Whether this is an essential language */
  essential?: boolean;
}

export class LanguageDetector {
  private languages: LanguageDefinition[] = [];

  constructor() {
    this.initializeLanguages();
  }

  /**
   * Initialize built-in programming language definitions
   */
  private initializeLanguages(): void {
    this.languages = [
      {
        name: 'Node',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'node --version',
            alternatives: ['nodejs --version'],
            versionRegex: /v(\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'macos',
            command: 'node --version',
            versionRegex: /v(\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'linux',
            command: 'node --version',
            alternatives: ['nodejs --version'],
            versionRegex: /v(\d+\.\d+\.\d+)/,
            timeout: 5000
          }
        ]
      },
      {
        name: 'Python',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'python --version',
            alternatives: ['python3 --version', 'py --version'],
            versionRegex: /Python (\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'macos',
            command: 'python3 --version',
            alternatives: ['python --version'],
            versionRegex: /Python (\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'linux',
            command: 'python3 --version',
            alternatives: ['python --version'],
            versionRegex: /Python (\d+\.\d+\.\d+)/,
            timeout: 5000
          }
        ]
      },
      {
        name: 'Java',
        essential: false,
        commands: [
          {
            platform: 'windows',
            command: 'java -version',
            versionRegex: /"(\d+\.\d+\.\d+)"/,
            timeout: 5000
          },
          {
            platform: 'macos',
            command: 'java -version',
            versionRegex: /"(\d+\.\d+\.\d+)"/,
            timeout: 5000
          },
          {
            platform: 'linux',
            command: 'java -version',
            versionRegex: /"(\d+\.\d+\.\d+)"/,
            timeout: 5000
          }
        ]
      },
      {
        name: 'Go',
        essential: false,
        commands: [
          {
            platform: 'windows',
            command: 'go version',
            versionRegex: /go(\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'macos',
            command: 'go version',
            versionRegex: /go(\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'linux',
            command: 'go version',
            versionRegex: /go(\d+\.\d+\.\d+)/,
            timeout: 5000
          }
        ]
      },
      {
        name: 'Rust',
        essential: false,
        commands: [
          {
            platform: 'windows',
            command: 'rustc --version',
            versionRegex: /rustc (\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'macos',
            command: 'rustc --version',
            versionRegex: /rustc (\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'linux',
            command: 'rustc --version',
            versionRegex: /rustc (\d+\.\d+\.\d+)/,
            timeout: 5000
          }
        ]
      },
      {
        name: 'TypeScript',
        essential: true,
        commands: [
          {
            platform: 'windows',
            command: 'tsc --version',
            alternatives: ['npx tsc --version'],
            versionRegex: /Version (\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'macos',
            command: 'tsc --version',
            alternatives: ['npx tsc --version'],
            versionRegex: /Version (\d+\.\d+\.\d+)/,
            timeout: 5000
          },
          {
            platform: 'linux',
            command: 'tsc --version',
            alternatives: ['npx tsc --version'],
            versionRegex: /Version (\d+\.\d+\.\d+)/,
            timeout: 5000
          }
        ]
      }
    ];
  }

  /**
   * Detect all programming languages for a platform
   */
  public async detectLanguages(platform: PlatformType): Promise<DetectionResult[]> {
    const results: DetectionResult[] = [];
    
    for (const language of this.languages) {
      const result = await this.detectLanguage(language, platform);
      results.push(result);
    }

    return results;
  }

  /**
   * Detect a specific programming language
   */
  public async detectLanguage(
    language: LanguageDefinition, 
    platform: PlatformType
  ): Promise<DetectionResult> {
    // Find command for this platform
    const platformCommand = language.commands.find(cmd => cmd.platform === platform);
    
    if (!platformCommand) {
      return {
        name: language.name,
        found: false,
        detectionMethod: 'command',
        error: `No detection command defined for platform: ${platform}`
      };
    }

    // Try primary command
    const primaryResult = await this.executeCommand(language.name, platformCommand);
    if (primaryResult.found) {
      return primaryResult;
    }

    // Try alternative commands
    if (platformCommand.alternatives) {
      for (const altCommand of platformCommand.alternatives) {
        const altResult = await this.executeCommand(language.name, {
          ...platformCommand,
          command: altCommand
        });
        if (altResult.found) {
          return {
            ...altResult,
            metadata: {
              ...altResult.metadata,
              usedAlternative: altCommand
            }
          };
        }
      }
    }

    return {
      name: language.name,
      found: false,
      detectionMethod: 'command',
      error: primaryResult.error || 'Command not found'
    };
  }

  /**
   * Execute a detection command
   */
  private async executeCommand(
    languageName: string,
    cmd: LanguageCommand
  ): Promise<DetectionResult> {
    try {
      const { stdout, stderr } = await execAsync(cmd.command, {
        timeout: cmd.timeout || 5000,
        encoding: 'utf8'
      });

      const output = stdout || stderr;
      let version: string | undefined;

      // Extract version if regex is provided
      if (cmd.versionRegex && output) {
        const match = output.match(cmd.versionRegex);
        version = match?.[1];
      }

      // Try to find installation path
      const installationPath = await this.findInstallationPath(cmd.command);

      return {
        name: languageName,
        found: true,
        version,
        path: installationPath,
        detectionMethod: 'command',
        metadata: {
          command: cmd.command,
          platform: cmd.platform,
          output: output.trim().split('\n')[0] // First line only
        }
      };
    } catch (error) {
      return {
        name: languageName,
        found: false,
        detectionMethod: 'command',
        error: error instanceof Error ? error.message : 'Command execution failed'
      };
    }
  }

  /**
   * Find installation path for a command
   */
  private async findInstallationPath(command: string): Promise<string | undefined> {
    try {
      const baseCommand = command.split(' ')[0];
      const whichCommand = process.platform === 'win32' 
        ? `where ${baseCommand}` 
        : `which ${baseCommand}`;
      
      const { stdout } = await execAsync(whichCommand, { timeout: 3000 });
      return stdout.trim().split('\n')[0];
    } catch {
      return undefined;
    }
  }

  /**
   * Add a custom language definition
   */
  public addLanguage(language: LanguageDefinition): void {
    this.languages.push(language);
  }

  /**
   * Get all supported languages
   */
  public getSupportedLanguages(): string[] {
    return this.languages.map(lang => lang.name);
  }

  /**
   * Check if a language is supported
   */
  public isLanguageSupported(name: string): boolean {
    return this.languages.some(lang => lang.name === name);
  }
}

// Export singleton instance
export const languageDetector = new LanguageDetector(); 