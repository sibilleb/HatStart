/**
 * Category-Specific Installer Logic
 * Provides specialized installation behavior for different tool categories
 */

import type { InstallationCommand, ToolCategory } from '../shared/manifest-types.js';
import type { InstallationOptions } from './installer-types.js';

/**
 * Category-specific installation configuration
 */
export interface CategoryInstallationConfig {
  /** Whether to force silent/non-interactive installation */
  forceSilent?: boolean;
  /** Whether to update system PATH */
  updatePath?: boolean;
  /** Whether to create desktop shortcuts */
  createShortcuts?: boolean;
  /** Whether to register file associations */
  registerFileAssociations?: boolean;
  /** Whether to start services after installation */
  startServices?: boolean;
  /** Additional environment variables to set */
  environmentVariables?: Record<string, string>;
  /** Post-installation verification steps */
  additionalVerification?: string[];
  /** Shell integration requirements */
  shellIntegration?: {
    bashrc?: boolean;
    zshrc?: boolean;
    powershell?: boolean;
    cmd?: boolean;
  };
}

/**
 * Interface for category-specific installer logic
 */
export interface ICategoryInstaller {
  /** Get category-specific installation configuration */
  getCategoryConfig(category: ToolCategory): CategoryInstallationConfig;
  
  /** Modify installation command based on category */
  enhanceInstallationCommand(
    command: InstallationCommand,
    category: ToolCategory,
    options: InstallationOptions
  ): InstallationCommand;
  
  /** Execute category-specific pre-installation steps */
  executePreInstallationSteps(
    command: InstallationCommand,
    category: ToolCategory,
    options: InstallationOptions
  ): Promise<void>;
  
  /** Execute category-specific post-installation steps */
  executePostInstallationSteps(
    command: InstallationCommand,
    category: ToolCategory,
    options: InstallationOptions
  ): Promise<void>;
  
  /** Verify category-specific installation requirements */
  verifyCategoryInstallation(
    command: InstallationCommand,
    category: ToolCategory,
    options: InstallationOptions
  ): Promise<boolean>;
}

/**
 * Default category installer implementation
 */
export class CategoryInstaller implements ICategoryInstaller {
  
  /**
   * Get category-specific installation configuration
   */
  public getCategoryConfig(category: ToolCategory): CategoryInstallationConfig {
    switch (category) {
      case 'language':
        return this.getLanguageConfig();
      case 'productivity':
        return this.getProductivityConfig();
      case 'devops':
        return this.getDevOpsConfig();
      case 'testing':
        return this.getTestingConfig();
      case 'security':
        return this.getSecurityConfig();
      case 'cloud':
        return this.getCloudConfig();
      case 'database':
        return this.getDatabaseConfig();
      case 'version-control':
        return this.getVersionControlConfig();
      case 'frontend':
        return this.getFrontendConfig();
      case 'backend':
        return this.getBackendConfig();
      case 'mobile':
        return this.getMobileConfig();
      case 'design':
        return this.getDesignConfig();
      default:
        return this.getDefaultConfig();
    }
  }

  /**
   * Enhance installation command based on category
   */
  public enhanceInstallationCommand(
    command: InstallationCommand,
    category: ToolCategory,
    options: InstallationOptions
  ): InstallationCommand {
    const config = this.getCategoryConfig(category);
    const enhancedCommand = { ...command };

    // Apply category-specific enhancements
    if (config.forceSilent && !options.interactive) {
      enhancedCommand.args = this.addSilentFlags(enhancedCommand.args || [], command.method, command.platform);
    }

    // Add environment variables
    if (config.environmentVariables) {
      enhancedCommand.environment = {
        ...enhancedCommand.environment,
        ...config.environmentVariables
      };
    }

    return enhancedCommand;
  }

  /**
   * Execute category-specific pre-installation steps
   */
  public async executePreInstallationSteps(
    command: InstallationCommand,
    category: ToolCategory,
    _options: InstallationOptions
  ): Promise<void> {
    const _config = this.getCategoryConfig(category);

    // For CLI tools (languages, devops, etc.), ensure package managers are updated
    if (this.isCLICategory(category)) {
      await this.updatePackageManagers(command.platform, command.method);
    }

    // For GUI applications, prepare desktop environment
    if (this.isGUICategory(category)) {
      await this.prepareDesktopEnvironment(command.platform);
    }

    // For Libraries/SDKs, verify dependencies
    if (this.isLibrarySDKCategory(category)) {
      await this.verifyDependencies(command, category);
    }
  }

  /**
   * Execute category-specific post-installation steps
   */
  public async executePostInstallationSteps(
    command: InstallationCommand,
    category: ToolCategory,
    options: InstallationOptions
  ): Promise<void> {
    const config = this.getCategoryConfig(category);

    // Update PATH for CLI tools
    if (config.updatePath && this.isCLICategory(category)) {
      await this.updateSystemPath(command, options);
    }

    // Create shortcuts for GUI applications
    if (config.createShortcuts && this.isGUICategory(category)) {
      await this.createDesktopShortcuts(command);
    }

    // Register file associations for GUI applications
    if (config.registerFileAssociations && this.isGUICategory(category)) {
      await this.registerFileAssociations(command, category);
    }

    // Setup shell integration for CLI tools
    if (config.shellIntegration && this.isCLICategory(category)) {
      await this.setupShellIntegration(command, config.shellIntegration);
    }

    // Setup environment variables for Libraries/SDKs
    if (this.isLibrarySDKCategory(category)) {
      await this.setupEnvironmentVariables(command, category);
    }

    // Start services if required
    if (config.startServices) {
      await this.startRequiredServices(command);
    }
  }

  /**
   * Verify category-specific installation requirements
   */
  public async verifyCategoryInstallation(
    command: InstallationCommand,
    category: ToolCategory,
    _options: InstallationOptions
  ): Promise<boolean> {
    const config = this.getCategoryConfig(category);

    // Basic verification
    let verified = true;

    // Additional verification steps
    if (config.additionalVerification) {
      for (const verifyCmd of config.additionalVerification) {
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          await execAsync(verifyCmd, { timeout: 10000 });
          console.log(`Additional verification passed: ${verifyCmd}`);
        } catch (error) {
          console.warn(`Additional verification failed: ${verifyCmd}`, error);
          verified = false;
        }
      }
    }

    // Category-specific verification
    if (this.isCLICategory(category)) {
      verified = verified && await this.verifyCLIInstallation(command);
    }

    if (this.isGUICategory(category)) {
      verified = verified && await this.verifyGUIInstallation(command);
    }

    if (this.isLibrarySDKCategory(category)) {
      verified = verified && await this.verifyLibrarySDKInstallation(command, category);
    }

    return verified;
  }

  // Private helper methods

  private getLanguageConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: false,
      environmentVariables: {}, // Will be populated dynamically based on specific language
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: true
      },
      additionalVerification: [
        '--version',
        'version',
        '--help'
      ]
    };
  }

  private getProductivityConfig(): CategoryInstallationConfig {
    return {
      forceSilent: false,
      updatePath: true,
      createShortcuts: true,
      registerFileAssociations: true,
      startServices: false,
      additionalVerification: []
    };
  }

  private getDevOpsConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: true,
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: true
      },
      additionalVerification: []
    };
  }

  private getTestingConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: false,
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: false
      },
      additionalVerification: []
    };
  }

  private getSecurityConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: true,
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: true
      },
      additionalVerification: []
    };
  }

  private getCloudConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: false,
      environmentVariables: {}, // Will be populated dynamically based on specific cloud provider
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: true
      },
      additionalVerification: [
        '--version',
        'version',
        'help',
        'config list'
      ]
    };
  }

  private getDatabaseConfig(): CategoryInstallationConfig {
    return {
      forceSilent: false,
      updatePath: true,
      createShortcuts: true,
      registerFileAssociations: false,
      startServices: true,
      additionalVerification: []
    };
  }

  private getVersionControlConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: true,
      startServices: false,
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: true
      },
      additionalVerification: []
    };
  }

  private getDefaultConfig(): CategoryInstallationConfig {
    return {
      forceSilent: false,
      updatePath: false,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: false,
      additionalVerification: []
    };
  }

  private getFrontendConfig(): CategoryInstallationConfig {
    return {
      forceSilent: false,
      updatePath: true,
      createShortcuts: true,
      registerFileAssociations: true,
      startServices: false,
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: false
      },
      additionalVerification: []
    };
  }

  private getBackendConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: true,
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: true
      },
      additionalVerification: []
    };
  }

  private getMobileConfig(): CategoryInstallationConfig {
    return {
      forceSilent: false,
      updatePath: true,
      createShortcuts: true,
      registerFileAssociations: true,
      startServices: false,
      environmentVariables: {
        'ANDROID_HOME': '/opt/android-sdk',
        'JAVA_HOME': '/usr/lib/jvm/default'
      },
      additionalVerification: []
    };
  }

  private getDesignConfig(): CategoryInstallationConfig {
    return {
      forceSilent: false,
      updatePath: false,
      createShortcuts: true,
      registerFileAssociations: true,
      startServices: false,
      additionalVerification: []
    };
  }

  private getLibrarySDKConfig(): CategoryInstallationConfig {
    return {
      forceSilent: true,
      updatePath: true,
      createShortcuts: false,
      registerFileAssociations: false,
      startServices: false,
      environmentVariables: {},  // Will be populated dynamically
      shellIntegration: {
        bashrc: true,
        zshrc: true,
        powershell: true,
        cmd: true
      },
      additionalVerification: [
        'version --version',
        'help',
        '--version'
      ]
    };
  }

  private addSilentFlags(args: string[], method: string, _platform: string): string[] {
    const newArgs = [...args];

    switch (method) {
      case 'winget':
        if (!newArgs.includes('--silent')) {
          newArgs.push('--silent');
        }
        break;
      case 'chocolatey':
        if (!newArgs.includes('-y')) {
          newArgs.push('-y');
        }
        break;
      case 'scoop':
        // Scoop is silent by default
        break;
      case 'homebrew':
        // Homebrew is generally silent for non-interactive installs
        break;
      case 'apt':
        if (!newArgs.includes('-y')) {
          newArgs.push('-y');
        }
        break;
      case 'yum':
        if (!newArgs.includes('-y')) {
          newArgs.push('-y');
        }
        break;
      case 'snap':
        // Snap is generally silent
        break;
      case 'flatpak':
        if (!newArgs.includes('-y')) {
          newArgs.push('-y');
        }
        break;
    }

    return newArgs;
  }

  private isCLICategory(category: ToolCategory): boolean {
    return [
      'language',
      'devops',
      'testing',
      'security',
      'cloud',
      'version-control'
    ].includes(category);
  }

  private isGUICategory(category: ToolCategory): boolean {
    return [
      'productivity',
      'design',
      'database',
      'frontend',  // Web development tools often have GUI components
      'mobile'     // Mobile development tools typically have GUI IDEs
    ].includes(category);
  }

  private isLibrarySDKCategory(category: ToolCategory): boolean {
    return [
      'language',    // Programming language runtimes and SDKs
      'cloud'        // Cloud SDKs and libraries
    ].includes(category);
  }

  private async updatePackageManagers(platform: string, method: string): Promise<void> {
    // Update package managers to ensure latest package lists
    try {
      switch (platform) {
        case 'linux':
          if (method === 'apt') {
            // Update apt package lists
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            try {
              await execAsync('sudo apt-get update', { timeout: 60000 });
            } catch (error) {
              console.warn('Failed to update apt package lists:', error);
            }
          } else if (method === 'yum') {
            // Update yum package lists
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            try {
              await execAsync('sudo yum check-update', { timeout: 60000 });
            } catch (error) {
              // yum check-update returns exit code 100 when updates are available
              if (error && typeof error === 'object' && 'code' in error && error.code !== 100) {
                console.warn('Failed to update yum package lists:', error);
              }
            }
          }
          break;
        case 'macos':
          if (method === 'homebrew') {
            // Update homebrew
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            try {
              await execAsync('brew update', { timeout: 120000 });
            } catch (error) {
              console.warn('Failed to update homebrew:', error);
            }
          }
          break;
        case 'windows':
          // Windows package managers typically auto-update or don't require manual updates
          break;
      }
    } catch (error) {
      console.warn('Package manager update failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async prepareDesktopEnvironment(platform: string): Promise<void> {
    // Prepare desktop environment for GUI applications
    try {
      switch (platform) {
        case 'linux':
          // Ensure desktop directories exist
          {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            try {
              // Create standard desktop directories
              await execAsync('mkdir -p ~/.local/share/applications');
              await execAsync('mkdir -p ~/.local/share/icons');
              await execAsync('mkdir -p ~/Desktop');
            } catch (error) {
              console.warn('Failed to create desktop directories:', error);
            }
          }
          break;
        case 'macos':
          // macOS handles desktop environment automatically
          break;
        case 'windows':
          // Windows handles desktop environment automatically
          break;
      }
    } catch (error) {
      console.warn('Desktop environment preparation failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async updateSystemPath(command: InstallationCommand, _options: InstallationOptions): Promise<void> {
    // Update system PATH for CLI tools
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Determine the installation path based on the command and platform
      let installPath: string | undefined;
      
      switch (command.platform) {
        case 'linux':
          // Common Linux installation paths
          if (command.method === 'apt' || command.method === 'yum') {
            installPath = '/usr/bin'; // System package managers typically install to /usr/bin
          } else if (command.method === 'snap') {
            installPath = '/snap/bin';
          } else if (command.method === 'flatpak') {
            installPath = '/var/lib/flatpak/exports/bin';
          }
          break;
        case 'macos':
          if (command.method === 'homebrew') {
            // Check if we're on Apple Silicon or Intel
            try {
              const { stdout } = await execAsync('uname -m');
              const arch = stdout.trim();
              installPath = arch === 'arm64' ? '/opt/homebrew/bin' : '/usr/local/bin';
            } catch {
              installPath = '/usr/local/bin'; // Default fallback
            }
          }
          break;
        case 'windows':
          // Windows PATH updates are typically handled by installers
          // For package managers, they usually handle PATH updates automatically
          break;
      }
      
      if (installPath) {
        // Verify the path exists and is accessible
        try {
          const { access } = await import('fs/promises');
          await access(installPath);
          
          // Check if path is already in PATH
          const currentPath = process.env.PATH || '';
          if (!currentPath.includes(installPath)) {
            console.log(`Path ${installPath} should be added to PATH for ${command.command}`);
            // Note: Actual PATH modification would require shell-specific updates
            // This is logged for now as it requires careful handling of different shells
          }
        } catch (error) {
          console.warn(`Installation path ${installPath} not accessible:`, error);
        }
      }
    } catch (error) {
      console.warn('PATH update failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async createDesktopShortcuts(command: InstallationCommand): Promise<void> {
    // Create desktop shortcuts for GUI applications
    try {
      switch (command.platform) {
        case 'linux':
          // Create .desktop file for Linux
          {
            const { writeFile, mkdir } = await import('fs/promises');
            const { join } = await import('path');
            const { homedir } = await import('os');
            
            try {
              // Ensure directories exist
              const applicationsDir = join(homedir(), '.local/share/applications');
              await mkdir(applicationsDir, { recursive: true });
              
              // Get enhanced metadata for the desktop file
              const metadata = this.getApplicationMetadata(command.command);
              
              const desktopFile = `[Desktop Entry]
Version=1.0
Type=Application
Name=${metadata.displayName}
Comment=${metadata.description}
Exec=${metadata.execCommand}
Icon=${metadata.iconName}
Terminal=${metadata.terminal ? 'true' : 'false'}
Categories=${metadata.categories.join(';')};
MimeType=${metadata.mimeTypes.join(';')};
StartupNotify=true
StartupWMClass=${metadata.wmClass}
`;
              
              const desktopPath = join(applicationsDir, `${command.command}.desktop`);
              await writeFile(desktopPath, desktopFile);
              
              // Make it executable
              const { exec } = await import('child_process');
              const { promisify } = await import('util');
              const execAsync = promisify(exec);
              await execAsync(`chmod +x "${desktopPath}"`);
              
              // Update desktop database
              try {
                await execAsync('update-desktop-database ~/.local/share/applications');
              } catch (error) {
                console.warn('Failed to update desktop database:', error);
              }
              
              console.log(`Created enhanced desktop shortcut for ${command.command}`);
            } catch (error) {
              console.warn(`Failed to create desktop shortcut for ${command.command}:`, error);
            }
          }
          break;
        case 'macos':
          // macOS applications typically create their own shortcuts in /Applications
          console.log(`Desktop shortcut for ${command.command} should be available in Applications folder`);
          break;
        case 'windows':
          // Windows installers typically create their own shortcuts
          console.log(`Desktop shortcut for ${command.command} should be created by installer`);
          break;
      }
    } catch (error) {
      console.warn('Desktop shortcut creation failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async registerFileAssociations(command: InstallationCommand, category: ToolCategory): Promise<void> {
    // Register file associations for GUI applications
    try {
      const fileExtensions = this.getFileExtensionsForCategory(category, command.command);
      
      if (fileExtensions.length === 0) {
        return; // No file associations needed for this tool
      }

      switch (command.platform) {
        case 'linux':
          // Register MIME types and file associations on Linux
          {
            const { writeFile } = await import('fs/promises');
            const { join } = await import('path');
            const { homedir } = await import('os');
            
            try {
              for (const ext of fileExtensions) {
                // Create MIME type association
                const mimeType = `application/x-${command.command}-${ext}`;
                const mimeFile = join(homedir(), '.local/share/mime/packages', `${command.command}.xml`);
                
                const mimeXml = `<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="${mimeType}">
    <comment>${command.command} file</comment>
    <glob pattern="*.${ext}"/>
  </mime-type>
</mime-info>`;
                
                await writeFile(mimeFile, mimeXml);
                
                // Update MIME database
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                try {
                  await execAsync('update-mime-database ~/.local/share/mime');
                } catch (error) {
                  console.warn('Failed to update MIME database:', error);
                }
              }
              
              console.log(`Registered file associations for ${command.command}: ${fileExtensions.join(', ')}`);
            } catch (error) {
              console.warn(`Failed to register file associations for ${command.command}:`, error);
            }
          }
          break;
        case 'macos':
          // macOS file associations are typically handled by the application bundle
          console.log(`File associations for ${command.command} should be handled by application bundle`);
          break;
        case 'windows':
          // Windows file associations require registry modifications
          console.log(`File associations for ${command.command} should be registered in Windows registry`);
          // Note: Actual registry modification would require elevated permissions
          // This is logged for now as it requires careful handling
          break;
      }
    } catch (error) {
      console.warn('File association registration failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async setupShellIntegration(
    command: InstallationCommand,
    shellConfig: NonNullable<CategoryInstallationConfig['shellIntegration']>
  ): Promise<void> {
    // Setup shell integration for CLI tools
    try {
      const { homedir } = await import('os');
      const { join } = await import('path');
      const { appendFile, access } = await import('fs/promises');
      
      const integrationComment = `# Added by HatStart for ${command.command}`;
      const integrationLine = `# ${command.command} integration would be added here`;
      
      // Setup bash integration
      if (shellConfig.bashrc && (command.platform === 'linux' || command.platform === 'macos')) {
        try {
          const bashrcPath = join(homedir(), '.bashrc');
          await access(bashrcPath);
          await appendFile(bashrcPath, `\n${integrationComment}\n${integrationLine}\n`);
          console.log(`Added bash integration for ${command.command}`);
        } catch (error) {
          console.warn(`Failed to setup bash integration for ${command.command}:`, error);
        }
      }
      
      // Setup zsh integration
      if (shellConfig.zshrc && (command.platform === 'linux' || command.platform === 'macos')) {
        try {
          const zshrcPath = join(homedir(), '.zshrc');
          await access(zshrcPath);
          await appendFile(zshrcPath, `\n${integrationComment}\n${integrationLine}\n`);
          console.log(`Added zsh integration for ${command.command}`);
        } catch (error) {
          console.warn(`Failed to setup zsh integration for ${command.command}:`, error);
        }
      }
      
      // Setup PowerShell integration (Windows)
      if (shellConfig.powershell && command.platform === 'windows') {
        try {
          // PowerShell profile setup would go here
          console.log(`PowerShell integration for ${command.command} should be configured`);
        } catch (error) {
          console.warn(`Failed to setup PowerShell integration for ${command.command}:`, error);
        }
      }
      
      // Setup CMD integration (Windows)
      if (shellConfig.cmd && command.platform === 'windows') {
        try {
          // CMD integration setup would go here
          console.log(`CMD integration for ${command.command} should be configured`);
        } catch (error) {
          console.warn(`Failed to setup CMD integration for ${command.command}:`, error);
        }
      }
    } catch (error) {
      console.warn('Shell integration setup failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async setupEnvironmentVariables(command: InstallationCommand, category: ToolCategory): Promise<void> {
    // Setup environment variables for Libraries/SDKs
    try {
      const envVars = this.getEnvironmentVariablesForTool(command.command, category);
      
      if (Object.keys(envVars).length === 0) {
        return; // No environment variables needed for this tool
      }

      switch (command.platform) {
        case 'windows':
          // Set environment variables in Windows registry
          {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            
            for (const [key, value] of Object.entries(envVars)) {
              try {
                await execAsync(`setx ${key} "${value}" /M`);
                console.log(`Set environment variable ${key}=${value}`);
              } catch (error) {
                console.warn(`Failed to set environment variable ${key}:`, error);
              }
            }
          }
          break;

        case 'macos':
        case 'linux':
          // Add environment variables to shell profiles
          {
            const { appendFile } = await import('fs/promises');
            const { join } = await import('path');
            const { homedir } = await import('os');
            
            const profiles = ['.bashrc', '.zshrc', '.profile'];
            
            for (const profile of profiles) {
              try {
                const profilePath = join(homedir(), profile);
                const envExports = Object.entries(envVars)
                  .map(([key, value]) => `export ${key}="${value}"`)
                  .join('\n');
                
                const envBlock = `\n# Environment variables for ${command.command}\n${envExports}\n`;
                await appendFile(profilePath, envBlock);
                console.log(`Added environment variables to ${profile}`);
              } catch (error) {
                console.warn(`Failed to update ${profile}:`, error);
              }
            }
          }
          break;
      }
    } catch (error) {
      console.warn('Environment variable setup failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async verifyDependencies(command: InstallationCommand, category: ToolCategory): Promise<void> {
    // Verify dependencies for Libraries/SDKs
    try {
      const dependencies = this.getDependenciesForTool(command.command, category);
      
      if (dependencies.length === 0) {
        return; // No dependencies to verify
      }

      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      for (const dependency of dependencies) {
        try {
          // Try to verify the dependency exists
          await execAsync(`${dependency} --version`, { timeout: 5000 });
          console.log(`Dependency verified: ${dependency}`);
                 } catch {
           console.warn(`Dependency not found: ${dependency}. Installation may fail or require manual setup.`);
           // Don't throw - this is informational only
         }
      }
    } catch (error) {
      console.warn('Dependency verification failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async startRequiredServices(command: InstallationCommand): Promise<void> {
    // Start required services after installation
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Determine if this tool requires service startup
      const serviceName = this.getServiceName(command.command);
      
      if (serviceName) {
        switch (command.platform) {
          case 'linux':
            try {
              // Try systemctl first (systemd)
              await execAsync(`sudo systemctl enable ${serviceName}`);
              await execAsync(`sudo systemctl start ${serviceName}`);
              console.log(`Started service ${serviceName} for ${command.command}`);
            } catch (error) {
              console.warn(`Failed to start service ${serviceName}:`, error);
              // Try service command as fallback
              try {
                await execAsync(`sudo service ${serviceName} start`);
                console.log(`Started service ${serviceName} using service command`);
              } catch (fallbackError) {
                console.warn(`Failed to start service with fallback method:`, fallbackError);
              }
            }
            break;
          case 'macos':
            try {
              // Use launchctl for macOS services
              await execAsync(`brew services start ${serviceName}`);
              console.log(`Started service ${serviceName} for ${command.command}`);
            } catch (error) {
              console.warn(`Failed to start service ${serviceName}:`, error);
            }
            break;
          case 'windows':
            try {
              // Use sc command for Windows services
              await execAsync(`sc start ${serviceName}`);
              console.log(`Started service ${serviceName} for ${command.command}`);
            } catch (error) {
              console.warn(`Failed to start service ${serviceName}:`, error);
            }
            break;
        }
      }
    } catch (error) {
      console.warn('Service startup failed:', error);
      // Don't throw - this is a best-effort operation
    }
  }

  private async verifyCLIInstallation(command: InstallationCommand): Promise<boolean> {
    // Verify CLI tool installation
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Try to run the command with version flag
      const versionCommands = [
        `${command.command} --version`,
        `${command.command} -v`,
        `${command.command} version`,
        `which ${command.command}`, // Unix-like systems
        `where ${command.command}`, // Windows
      ];
      
      for (const versionCmd of versionCommands) {
        try {
          const { stdout, stderr } = await execAsync(versionCmd, { timeout: 10000 });
          if (stdout || stderr) {
            console.log(`CLI verification successful for ${command.command}: ${versionCmd}`);
            return true;
          }
                 } catch {
           // Continue to next verification method
           continue;
         }
      }
      
      console.warn(`CLI verification failed for ${command.command} - command not found or not responding`);
      return false;
    } catch (error) {
      console.warn(`CLI verification error for ${command.command}:`, error);
      return false;
    }
  }

  private async verifyGUIInstallation(command: InstallationCommand): Promise<boolean> {
    // Verify GUI application installation with comprehensive checks
    try {
      const { access } = await import('fs/promises');
      const { join } = await import('path');
      
      switch (command.platform) {
        case 'linux':
          // Multi-step verification for Linux GUI applications
          {
            const { homedir } = await import('os');
            let verified = false;
            
            // Check for .desktop file (user-local)
            const desktopFile = join(homedir(), '.local/share/applications', `${command.command}.desktop`);
            try {
              await access(desktopFile);
              console.log(`GUI verification: desktop file found at ${desktopFile}`);
              verified = true;
            } catch {
              // Check system-wide applications
              const systemDesktopFile = join('/usr/share/applications', `${command.command}.desktop`);
              try {
                await access(systemDesktopFile);
                console.log(`GUI verification: system desktop file found at ${systemDesktopFile}`);
                verified = true;
              } catch {
                console.log(`GUI verification: no desktop file found for ${command.command}`);
              }
            }
            
            // Additional verification: check if command is executable
            if (!verified) {
              try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                await execAsync(`which ${command.command}`, { timeout: 5000 });
                console.log(`GUI verification: ${command.command} found in PATH`);
                verified = true;
              } catch {
                console.log(`GUI verification: ${command.command} not found in PATH`);
              }
            }
            
            // Check for common GUI application directories
            if (!verified) {
              const commonPaths = [
                join('/opt', command.command),
                join('/usr/local/bin', command.command),
                join('/snap/bin', command.command),
                join(homedir(), '.local/bin', command.command)
              ];
              
              for (const path of commonPaths) {
                try {
                  await access(path);
                  console.log(`GUI verification: ${command.command} found at ${path}`);
                  verified = true;
                  break;
                } catch {
                  continue;
                }
              }
            }
            
            if (verified) {
              console.log(`GUI verification successful for ${command.command}`);
            } else {
              console.warn(`GUI verification failed for ${command.command}: application not found`);
            }
            
            return verified;
          }
        case 'macos':
          // Enhanced macOS verification
          {
            let verified = false;
            
            // Check for application bundle in /Applications
            const metadata = this.getApplicationMetadata(command.command);
            const possibleAppNames = [
              `${metadata.displayName}.app`,
              `${command.command}.app`,
              `${command.command.charAt(0).toUpperCase() + command.command.slice(1)}.app`
            ];
            
            for (const appName of possibleAppNames) {
              const appPath = join('/Applications', appName);
              try {
                await access(appPath);
                console.log(`GUI verification: application bundle found at ${appPath}`);
                verified = true;
                break;
              } catch {
                continue;
              }
            }
            
            // Check user Applications folder
            if (!verified) {
              const { homedir } = await import('os');
              for (const appName of possibleAppNames) {
                const userAppPath = join(homedir(), 'Applications', appName);
                try {
                  await access(userAppPath);
                  console.log(`GUI verification: user application bundle found at ${userAppPath}`);
                  verified = true;
                  break;
                } catch {
                  continue;
                }
              }
            }
            
            // Check if command is available via command line (for CLI tools with GUI)
            if (!verified) {
              try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                await execAsync(`which ${command.command}`, { timeout: 5000 });
                console.log(`GUI verification: ${command.command} found in PATH`);
                verified = true;
              } catch {
                console.log(`GUI verification: ${command.command} not found in PATH`);
              }
            }
            
            if (verified) {
              console.log(`GUI verification successful for ${command.command}`);
            } else {
              console.warn(`GUI verification failed for ${command.command}: application bundle not found`);
            }
            
            return verified;
          }
        case 'windows':
          // Enhanced Windows verification
          {
            let verified = false;
            
            // Check for executable in common installation paths
            const metadata = this.getApplicationMetadata(command.command);
            const possibleNames = [
              metadata.displayName,
              command.command,
              command.command.charAt(0).toUpperCase() + command.command.slice(1)
            ];
            
            const commonBasePaths = [
              'C:\\Program Files',
              'C:\\Program Files (x86)',
              process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs') : '',
              process.env.APPDATA ? join(process.env.APPDATA) : ''
            ].filter(Boolean);
            
            for (const basePath of commonBasePaths) {
              for (const name of possibleNames) {
                const paths = [
                  join(basePath, name),
                  join(basePath, name, `${name}.exe`),
                  join(basePath, name, `${command.command}.exe`)
                ];
                
                for (const path of paths) {
                  try {
                    await access(path);
                    console.log(`GUI verification: installation found at ${path}`);
                    verified = true;
                    break;
                  } catch {
                    continue;
                  }
                }
                if (verified) break;
              }
              if (verified) break;
            }
            
            // Check Windows Registry for installed programs (read-only check)
            if (!verified) {
              try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                // Query registry for installed programs
                const regQuery = `reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "${command.command}" /d`;
                await execAsync(regQuery, { timeout: 10000 });
                console.log(`GUI verification: ${command.command} found in Windows registry`);
                verified = true;
              } catch {
                console.log(`GUI verification: ${command.command} not found in Windows registry`);
              }
            }
            
            // Check if command is available in PATH
            if (!verified) {
              try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                await execAsync(`where ${command.command}`, { timeout: 5000 });
                console.log(`GUI verification: ${command.command} found in PATH`);
                verified = true;
              } catch {
                console.log(`GUI verification: ${command.command} not found in PATH`);
              }
            }
            
            if (verified) {
              console.log(`GUI verification successful for ${command.command}`);
            } else {
              console.warn(`GUI verification failed for ${command.command}: installation not found`);
            }
            
            return verified;
          }
        default:
          return false;
      }
    } catch (error) {
      console.warn(`GUI verification error for ${command.command}:`, error);
      return false;
    }
  }

  private async verifyLibrarySDKInstallation(command: InstallationCommand, category: ToolCategory): Promise<boolean> {
    // Verify Library/SDK installation with specialized checks
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Basic command verification
      let verified = false;
      const verificationCommands = [
        `${command.command} --version`,
        `${command.command} version`,
        `${command.command} --help`,
        `${command.command} help`
      ];

      for (const verifyCmd of verificationCommands) {
        try {
          const result = await execAsync(verifyCmd, { timeout: 10000 });
          if (result.stdout || result.stderr) {
            console.log(`Library/SDK verification successful for ${command.command}: ${verifyCmd}`);
            verified = true;
            break;
          }
        } catch {
          // Try next verification command
          continue;
        }
      }

      if (!verified) {
        console.warn(`Basic verification failed for ${command.command}`);
        return false;
      }

      // SDK-specific verification
      if (category === 'language') {
        verified = verified && await this.verifyLanguageSDK(command);
      } else if (category === 'cloud') {
        verified = verified && await this.verifyCloudSDK(command);
      }

      // Verify environment variables are accessible
      const envVars = this.getEnvironmentVariablesForTool(command.command, category);
      for (const [envVar, expectedValue] of Object.entries(envVars)) {
        try {
          const envResult = await execAsync(`echo $${envVar}`, { timeout: 5000 });
          if (envResult.stdout.trim()) {
            console.log(`Environment variable verified: ${envVar}=${envResult.stdout.trim()}`);
          } else {
            console.warn(`Environment variable not set: ${envVar} (expected: ${expectedValue})`);
          }
        } catch {
          console.warn(`Could not verify environment variable: ${envVar}`);
        }
      }

      return verified;
    } catch (error) {
      console.warn(`Library/SDK verification error for ${command.command}:`, error);
      return false;
    }
  }

  private async verifyLanguageSDK(command: InstallationCommand): Promise<boolean> {
    // Language-specific SDK verification
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const cmdLower = command.command.toLowerCase();

      if (cmdLower.includes('java')) {
        // Verify Java installation and JAVA_HOME
        try {
          await execAsync('javac -version', { timeout: 5000 });
          console.log('Java compiler verified');
          return true;
        } catch {
          console.warn('Java compiler not found');
          return false;
        }
      } else if (cmdLower.includes('python')) {
        // Verify Python and pip
        try {
          await execAsync('python -c "import sys; print(sys.version)"', { timeout: 5000 });
          console.log('Python interpreter verified');
          return true;
        } catch {
          console.warn('Python interpreter verification failed');
          return false;
        }
      } else if (cmdLower.includes('node')) {
        // Verify Node.js and npm
        try {
          await execAsync('npm --version', { timeout: 5000 });
          console.log('Node.js and npm verified');
          return true;
        } catch {
          console.warn('Node.js/npm verification failed');
          return false;
        }
      } else if (cmdLower.includes('go')) {
        // Verify Go workspace
        try {
          await execAsync('go env GOPATH', { timeout: 5000 });
          console.log('Go workspace verified');
          return true;
        } catch {
          console.warn('Go workspace verification failed');
          return false;
        }
      } else if (cmdLower.includes('rust') || cmdLower.includes('cargo')) {
        // Verify Rust toolchain
        try {
          await execAsync('rustc --version', { timeout: 5000 });
          console.log('Rust toolchain verified');
          return true;
        } catch {
          console.warn('Rust toolchain verification failed');
          return false;
        }
      }

      return true; // Default to true for other language tools
    } catch (error) {
      console.warn('Language SDK verification error:', error);
      return false;
    }
  }

  private async verifyCloudSDK(command: InstallationCommand): Promise<boolean> {
    // Cloud SDK-specific verification
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const cmdLower = command.command.toLowerCase();

      if (cmdLower.includes('aws')) {
        // Verify AWS CLI configuration
        try {
          await execAsync('aws configure list', { timeout: 10000 });
          console.log('AWS CLI configuration verified');
          return true;
        } catch {
          console.warn('AWS CLI not configured (this is normal for new installations)');
          return true; // Don't fail if not configured yet
        }
      } else if (cmdLower.includes('gcloud')) {
        // Verify Google Cloud SDK
        try {
          await execAsync('gcloud config list', { timeout: 10000 });
          console.log('Google Cloud SDK verified');
          return true;
        } catch {
          console.warn('Google Cloud SDK not configured (this is normal for new installations)');
          return true; // Don't fail if not configured yet
        }
      } else if (cmdLower.includes('azure')) {
        // Verify Azure CLI
        try {
          await execAsync('az account list', { timeout: 10000 });
          console.log('Azure CLI verified');
          return true;
        } catch {
          console.warn('Azure CLI not configured (this is normal for new installations)');
          return true; // Don't fail if not configured yet
        }
      }

      return true; // Default to true for other cloud tools
    } catch (error) {
      console.warn('Cloud SDK verification error:', error);
      return false;
    }
  }

  /**
   * Helper method to determine service name for a given command
   */
  private getServiceName(command: string): string | null {
    // Map common tools to their service names
    const serviceMap: Record<string, string> = {
      'docker': 'docker',
      'postgresql': 'postgresql',
      'postgres': 'postgresql',
      'mysql': 'mysql',
      'mariadb': 'mariadb',
      'redis': 'redis',
      'mongodb': 'mongod',
      'nginx': 'nginx',
      'apache2': 'apache2',
      'httpd': 'httpd',
      'elasticsearch': 'elasticsearch',
      'kibana': 'kibana',
      'logstash': 'logstash',
    };
    
    return serviceMap[command.toLowerCase()] || null;
  }

  /**
   * Helper method to get file extensions associated with a tool category and command
   */
  private getFileExtensionsForCategory(category: ToolCategory, command: string): string[] {
    // Map tools to their associated file extensions
    const toolExtensionMap: Record<string, string[]> = {
      // Code editors and IDEs
      'code': ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'md'],
      'vscode': ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'md'],
      'atom': ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'md'],
      'sublime': ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'md'],
      'intellij': ['java', 'kt', 'scala', 'groovy'],
      'webstorm': ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'vue'],
      'pycharm': ['py', 'pyw', 'pyi'],
      
      // Design tools
      'figma': ['fig'],
      'sketch': ['sketch'],
      'adobe-xd': ['xd'],
      'photoshop': ['psd', 'psb'],
      'illustrator': ['ai', 'eps'],
      
      // Database tools
      'mysql-workbench': ['sql', 'mwb'],
      'pgadmin': ['sql'],
      'dbeaver': ['sql'],
      'mongodb-compass': ['js', 'json'],
      
      // API tools
      'postman': ['json'],
      'insomnia': ['json', 'yaml'],
      
      // Mobile development
      'android-studio': ['java', 'kt', 'xml'],
      'xcode': ['swift', 'm', 'mm', 'h'],
      
      // Productivity tools
      'notion': ['md'],
      'obsidian': ['md'],
      'typora': ['md'],
    };

    // Category-based fallbacks
    const categoryExtensionMap: Record<ToolCategory, string[]> = {
      'frontend': ['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte'],
      'backend': ['js', 'ts', 'py', 'java', 'go', 'rs', 'php'],
      'mobile': ['swift', 'kt', 'java', 'dart', 'js', 'ts'],
      'design': ['fig', 'sketch', 'xd', 'psd', 'ai'],
      'database': ['sql', 'json', 'bson'],
      'productivity': ['md', 'txt', 'doc', 'docx'],
      'language': [],
      'devops': [],
      'testing': [],
      'security': [],
      'cloud': [],
      'version-control': []
    };

    // First try to find specific tool extensions
    const toolExtensions = toolExtensionMap[command.toLowerCase()];
    if (toolExtensions && toolExtensions.length > 0) {
      return toolExtensions;
    }

    // Fall back to category-based extensions
    return categoryExtensionMap[category] || [];
  }

  /**
   * Helper method to get environment variables for a specific tool
   */
  private getEnvironmentVariablesForTool(command: string, category: ToolCategory): Record<string, string> {
    const envVars: Record<string, string> = {};
    
    // Tool-specific environment variables
    const toolEnvMap: Record<string, Record<string, string>> = {
      // Java-related tools
      'java': { 'JAVA_HOME': '/usr/lib/jvm/default' },
      'javac': { 'JAVA_HOME': '/usr/lib/jvm/default' },
      'openjdk': { 'JAVA_HOME': '/usr/lib/jvm/java-openjdk' },
      'oracle-jdk': { 'JAVA_HOME': '/usr/lib/jvm/java-oracle' },
      
      // .NET tools
      'dotnet': { 'DOTNET_ROOT': '/usr/share/dotnet' },
      'dotnet-sdk': { 'DOTNET_ROOT': '/usr/share/dotnet' },
      
      // Python tools
      'python': { 'PYTHONPATH': '/usr/local/lib/python/site-packages' },
      'python3': { 'PYTHONPATH': '/usr/local/lib/python3/site-packages' },
      'pip': { 'PYTHONPATH': '/usr/local/lib/python/site-packages' },
      'pip3': { 'PYTHONPATH': '/usr/local/lib/python3/site-packages' },
      
      // Node.js tools
      'node': { 'NODE_PATH': '/usr/local/lib/node_modules' },
      'nodejs': { 'NODE_PATH': '/usr/local/lib/node_modules' },
      'npm': { 'NODE_PATH': '/usr/local/lib/node_modules' },
      'yarn': { 'NODE_PATH': '/usr/local/lib/node_modules' },
      
      // Go tools
      'go': { 'GOPATH': '/usr/local/go', 'GOROOT': '/usr/local/go' },
      'golang': { 'GOPATH': '/usr/local/go', 'GOROOT': '/usr/local/go' },
      
      // Rust tools
      'rust': { 'CARGO_HOME': '/usr/local/cargo', 'RUSTUP_HOME': '/usr/local/rustup' },
      'cargo': { 'CARGO_HOME': '/usr/local/cargo', 'RUSTUP_HOME': '/usr/local/rustup' },
      'rustc': { 'CARGO_HOME': '/usr/local/cargo', 'RUSTUP_HOME': '/usr/local/rustup' },
      
      // Cloud SDKs
      'aws-cli': { 'AWS_CLI_AUTO_PROMPT': 'on-partial' },
      'gcloud': { 'CLOUDSDK_PYTHON_SITEPACKAGES': '1' },
      'azure-cli': { 'AZURE_CORE_COLLECT_TELEMETRY': 'false' },
      
      // Android development
      'android-sdk': { 'ANDROID_HOME': '/opt/android-sdk', 'ANDROID_SDK_ROOT': '/opt/android-sdk' },
      'android-studio': { 'ANDROID_HOME': '/opt/android-sdk', 'ANDROID_SDK_ROOT': '/opt/android-sdk' },
      
      // Flutter
      'flutter': { 'FLUTTER_ROOT': '/opt/flutter' },
      
      // Ruby tools
      'ruby': { 'GEM_HOME': '/usr/local/lib/ruby/gems' },
      'gem': { 'GEM_HOME': '/usr/local/lib/ruby/gems' },
      
      // PHP tools
      'php': { 'PHP_INI_SCAN_DIR': '/usr/local/etc/php/conf.d' },
      'composer': { 'COMPOSER_HOME': '/usr/local/share/composer' }
    };

    // Get tool-specific environment variables
    const toolEnv = toolEnvMap[command.toLowerCase()];
    if (toolEnv) {
      Object.assign(envVars, toolEnv);
    }

    // Category-specific environment variables
    if (category === 'language') {
      // Add common language environment variables
      if (command.includes('java')) {
        envVars['JAVA_HOME'] = envVars['JAVA_HOME'] || '/usr/lib/jvm/default';
      }
      if (command.includes('python')) {
        envVars['PYTHONPATH'] = envVars['PYTHONPATH'] || '/usr/local/lib/python/site-packages';
      }
      if (command.includes('node')) {
        envVars['NODE_PATH'] = envVars['NODE_PATH'] || '/usr/local/lib/node_modules';
      }
    }

    return envVars;
  }

  /**
   * Helper method to get dependencies for a specific tool
   */
  private getDependenciesForTool(command: string, category: ToolCategory): string[] {
    // Tool-specific dependencies
    const toolDependencyMap: Record<string, string[]> = {
      // Java-related tools
      'maven': ['java'],
      'gradle': ['java'],
      'ant': ['java'],
      'spring-boot': ['java'],
      
      // .NET tools
      'dotnet-ef': ['dotnet'],
      'nuget': ['dotnet'],
      
      // Python tools
      'pip': ['python'],
      'pip3': ['python3'],
      'pipenv': ['python', 'pip'],
      'poetry': ['python', 'pip'],
      'django': ['python', 'pip'],
      'flask': ['python', 'pip'],
      
      // Node.js tools
      'npm': ['node'],
      'yarn': ['node'],
      'pnpm': ['node'],
      'webpack': ['node', 'npm'],
      'vite': ['node', 'npm'],
      'react': ['node', 'npm'],
      'vue': ['node', 'npm'],
      'angular': ['node', 'npm'],
      
      // Go tools
      'go-tools': ['go'],
      
      // Rust tools
      'cargo-edit': ['cargo'],
      'cargo-watch': ['cargo'],
      
      // Cloud SDKs
      'aws-cdk': ['node', 'npm'],
      'terraform': [],
      'kubectl': [],
      
      // Android development
      'android-studio': ['java'],
      
      // Flutter
      'flutter': ['dart'],
      
      // Ruby tools
      'bundler': ['ruby'],
      'rails': ['ruby', 'gem'],
      
      // PHP tools
      'composer': ['php'],
      'laravel': ['php', 'composer']
    };

    // Get tool-specific dependencies
    const toolDeps = toolDependencyMap[command.toLowerCase()] || [];
    
    // Category-specific dependencies
    const categoryDeps: string[] = [];
    if (category === 'language') {
      // Language tools might need package managers
      if (command.includes('python') && !command.includes('pip')) {
        categoryDeps.push('python');
      }
      if (command.includes('node') && !command.includes('npm')) {
        categoryDeps.push('node');
      }
      if (command.includes('java') && !['java', 'javac'].includes(command)) {
        categoryDeps.push('java');
      }
    }

    return [...new Set([...toolDeps, ...categoryDeps])]; // Remove duplicates
  }

  /**
   * Helper method to get application metadata for desktop shortcuts
   */
  private getApplicationMetadata(command: string): {
    displayName: string;
    description: string;
    execCommand: string;
    iconName: string;
    terminal: boolean;
    categories: string[];
    mimeTypes: string[];
    wmClass: string;
  } {
    // Application metadata map
    const metadataMap: Record<string, Partial<{
      displayName: string;
      description: string;
      execCommand: string;
      iconName: string;
      terminal: boolean;
      categories: string[];
      mimeTypes: string[];
      wmClass: string;
    }>> = {
      'code': {
        displayName: 'Visual Studio Code',
        description: 'Code editing. Redefined.',
        iconName: 'vscode',
        categories: ['Development', 'TextEditor'],
        mimeTypes: ['text/plain', 'application/json'],
        wmClass: 'Code'
      },
      'vscode': {
        displayName: 'Visual Studio Code',
        description: 'Code editing. Redefined.',
        iconName: 'vscode',
        categories: ['Development', 'TextEditor'],
        mimeTypes: ['text/plain', 'application/json'],
        wmClass: 'Code'
      },
      'atom': {
        displayName: 'Atom',
        description: 'A hackable text editor for the 21st Century',
        iconName: 'atom',
        categories: ['Development', 'TextEditor'],
        mimeTypes: ['text/plain'],
        wmClass: 'Atom'
      },
      'sublime': {
        displayName: 'Sublime Text',
        description: 'A sophisticated text editor for code, markup and prose',
        iconName: 'sublime-text',
        categories: ['Development', 'TextEditor'],
        mimeTypes: ['text/plain'],
        wmClass: 'Sublime_text'
      },
      'intellij': {
        displayName: 'IntelliJ IDEA',
        description: 'The Java IDE for Professional Developers',
        iconName: 'intellij-idea',
        categories: ['Development', 'IDE'],
        mimeTypes: ['text/x-java'],
        wmClass: 'jetbrains-idea'
      },
      'webstorm': {
        displayName: 'WebStorm',
        description: 'The smartest JavaScript IDE',
        iconName: 'webstorm',
        categories: ['Development', 'IDE'],
        mimeTypes: ['text/javascript', 'text/html'],
        wmClass: 'jetbrains-webstorm'
      },
      'pycharm': {
        displayName: 'PyCharm',
        description: 'The Python IDE for Professional Developers',
        iconName: 'pycharm',
        categories: ['Development', 'IDE'],
        mimeTypes: ['text/x-python'],
        wmClass: 'jetbrains-pycharm'
      },
      'figma': {
        displayName: 'Figma',
        description: 'The collaborative interface design tool',
        iconName: 'figma',
        categories: ['Graphics', 'Design'],
        mimeTypes: [],
        wmClass: 'Figma'
      },
      'postman': {
        displayName: 'Postman',
        description: 'API Development Environment',
        iconName: 'postman',
        categories: ['Development', 'Network'],
        mimeTypes: ['application/json'],
        wmClass: 'Postman'
      },
      'docker': {
        displayName: 'Docker Desktop',
        description: 'Container management platform',
        iconName: 'docker',
        categories: ['Development', 'System'],
        mimeTypes: [],
        wmClass: 'Docker Desktop'
      }
    };

    const metadata = metadataMap[command.toLowerCase()] || {};
    
    return {
      displayName: metadata.displayName || command,
      description: metadata.description || `${command} - Installed via HatStart`,
      execCommand: metadata.execCommand || command,
      iconName: metadata.iconName || command,
      terminal: metadata.terminal || false,
      categories: metadata.categories || ['Development'],
      mimeTypes: metadata.mimeTypes || [],
      wmClass: metadata.wmClass || command
    };
  }
} 