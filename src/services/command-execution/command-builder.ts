/**
 * Command Builder
 * Fluent API for constructing and executing commands
 */

import type {
    CommandExecutionError,
    CommandExecutionMode,
    CommandExecutionOptions,
    CommandExecutionResult,
    CommandOutputData,
    ICommandBuilder,
    ICommandExecutor,
    ShellType,
} from './types.js';

/**
 * Fluent command builder implementation
 */
export class CommandBuilder implements ICommandBuilder {
  private _command: string = '';
  private _args: string[] = [];
  private _options: CommandExecutionOptions = {};
  private executor: ICommandExecutor;
  
  constructor(executor: ICommandExecutor) {
    this.executor = executor;
  }

  /**
   * Set the base command
   */
  public command(cmd: string): ICommandBuilder {
    this._command = cmd;
    return this;
  }

  /**
   * Add arguments
   */
  public args(...args: string[]): ICommandBuilder {
    this._args.push(...args);
    return this;
  }

  /**
   * Set working directory
   */
  public cwd(directory: string): ICommandBuilder {
    this._options.workingDirectory = directory;
    return this;
  }

  /**
   * Set environment variables
   */
  public env(variables: Record<string, string>): ICommandBuilder {
    this._options.environment = { ...this._options.environment, ...variables };
    return this;
  }

  /**
   * Set execution timeout
   */
  public timeout(ms: number): ICommandBuilder {
    this._options.timeout = ms;
    return this;
  }

  /**
   * Set shell to use
   */
  public shell(shell: ShellType | boolean): ICommandBuilder {
    this._options.shell = shell;
    return this;
  }

  /**
   * Enable elevated execution
   */
  public elevated(): ICommandBuilder {
    this._options.elevated = true;
    return this;
  }

  /**
   * Set execution mode
   */
  public mode(mode: CommandExecutionMode): ICommandBuilder {
    this._options.mode = mode;
    return this;
  }

  /**
   * Add progress callback
   */
  public onProgress(callback: (data: CommandOutputData) => void): ICommandBuilder {
    this._options.onProgress = callback;
    return this;
  }

  /**
   * Add error callback
   */
  public onError(callback: (error: CommandExecutionError) => void): ICommandBuilder {
    this._options.onError = callback;
    return this;
  }

  /**
   * Set input to send to command
   */
  public input(input: string): ICommandBuilder {
    this._options.input = input;
    return this;
  }

  /**
   * Set encoding for input/output
   */
  public encoding(encoding: BufferEncoding): ICommandBuilder {
    this._options.encoding = encoding;
    return this;
  }

  /**
   * Set maximum buffer size
   */
  public maxBuffer(size: number): ICommandBuilder {
    this._options.maxBuffer = size;
    return this;
  }

  /**
   * Set kill signal for timeout
   */
  public killSignal(signal: NodeJS.Signals): ICommandBuilder {
    this._options.killSignal = signal;
    return this;
  }

  /**
   * Enable silent mode (suppress output logging)
   */
  public silent(): ICommandBuilder {
    this._options.silent = true;
    return this;
  }

  /**
   * Set whether to inherit parent environment
   */
  public inheritEnv(inherit: boolean = true): ICommandBuilder {
    this._options.inheritEnvironment = inherit;
    return this;
  }

  /**
   * Set custom execution context
   */
  public context(ctx: Record<string, unknown>): ICommandBuilder {
    this._options.context = { ...this._options.context, ...ctx };
    return this;
  }

  /**
   * Execute the built command
   */
  public async execute(): Promise<CommandExecutionResult> {
    this.validateCommand();
    return this.executor.execute(this._command, this._args, this._options);
  }

  /**
   * Execute with streaming output
   */
  public async executeStream(): Promise<CommandExecutionResult> {
    this.validateCommand();
    return this.executor.executeStream(this._command, this._args, this._options);
  }

  /**
   * Reset the builder to initial state
   */
  public reset(): ICommandBuilder {
    this._command = '';
    this._args = [];
    this._options = {};
    return this;
  }

  /**
   * Clone the current builder state
   */
  public clone(): ICommandBuilder {
    const cloned = new CommandBuilder(this.executor);
    cloned._command = this._command;
    cloned._args = [...this._args];
    cloned._options = { ...this._options };
    return cloned;
  }

  /**
   * Get the current command string (for debugging)
   */
  public toString(): string {
    return `${this._command} ${this._args.join(' ')}`.trim();
  }

  /**
   * Get the current options (for debugging)
   */
  public getOptions(): CommandExecutionOptions {
    return { ...this._options };
  }

  // Private helper methods

  private validateCommand(): void {
    if (!this._command) {
      throw new Error('Command is required. Use .command() to set the command.');
    }
  }
} 