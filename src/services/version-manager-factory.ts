/**
 * Version Manager Factory
 * Creates appropriate version manager adapter instances based on type and platform
 */

import * as os from 'os';
import type { Architecture, Platform } from '../shared/manifest-types.js';
import type {
    IVersionManager,
    IVersionManagerFactory,
    VersionManagerType,
    VersionedTool,
} from './version-manager-types.js';
import {
    MiseAdapter,
    NvmAdapter,
    PyenvAdapter,
} from './version-managers/index.js';

/**
 * Factory for creating version manager instances
 */
export class VersionManagerFactory implements IVersionManagerFactory {
  private platform: Platform;
  private architecture: Architecture;

  constructor(platform?: Platform, architecture?: Architecture) {
    // Detect platform and architecture if not provided
    this.platform = platform || this.detectPlatform();
    this.architecture = architecture || this.detectArchitecture();
  }

  private detectPlatform(): Platform {
    const platform = os.platform();
    switch (platform) {
      case 'darwin':
        return 'macos';
      case 'win32':
        return 'windows';
      case 'linux':
        return 'linux';
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private detectArchitecture(): Architecture {
    const arch = os.arch();
    switch (arch) {
      case 'x64':
        return 'x64';
      case 'arm64':
        return 'arm64';
      case 'ia32':
        return 'x86';
      case 'arm':
        return 'arm64'; // Map ARM to ARM64 as closest match
      default:
        return 'x64'; // Default fallback
    }
  }

  /**
   * Create a version manager instance
   */
  public createVersionManager(type: VersionManagerType): IVersionManager {
    if (!this.isSupported(type, this.platform)) {
      throw new Error(`Version manager ${type} is not supported on ${this.platform}`);
    }

    switch (type) {
      case 'mise':
        return new MiseAdapter(this.platform, this.architecture);
      
      case 'nvm':
        return new NvmAdapter(this.platform, this.architecture);
      
      case 'pyenv':
        return new PyenvAdapter(this.platform, this.architecture);
      
      case 'asdf':
        // TODO: Implement ASDF adapter
        throw new Error('ASDF adapter not yet implemented');
      
      case 'rbenv':
        // TODO: Implement RBenv adapter
        throw new Error('RBenv adapter not yet implemented');
      
      case 'jenv':
        // TODO: Implement JEnv adapter
        throw new Error('JEnv adapter not yet implemented');
      
      case 'rustup':
        // TODO: Implement Rustup adapter
        throw new Error('Rustup adapter not yet implemented');
      
      case 'gvm':
        // TODO: Implement GVM adapter
        throw new Error('GVM adapter not yet implemented');
      
      case 'volta':
        // TODO: Implement Volta adapter
        throw new Error('Volta adapter not yet implemented');
      
      case 'fnm':
        // TODO: Implement FNM adapter
        throw new Error('FNM adapter not yet implemented');
      
      case 'jabba':
        // TODO: Implement Jabba adapter
        throw new Error('Jabba adapter not yet implemented');
      
      case 'sdkman':
        // TODO: Implement SDKMAN adapter
        throw new Error('SDKMAN adapter not yet implemented');
      
      case 'proto':
        // TODO: Implement Proto adapter
        throw new Error('Proto adapter not yet implemented');
      
      default:
        throw new Error(`Unknown version manager type: ${type}`);
    }
  }

  /**
   * Get all supported version manager types
   */
  public getSupportedTypes(): VersionManagerType[] {
    // Currently implemented adapters
    const implemented: VersionManagerType[] = ['mise', 'nvm', 'pyenv'];
    
    // Filter by platform support
    return implemented.filter(type => this.isSupported(type, this.platform));
  }

  /**
   * Get recommended version manager for a tool
   */
  public getRecommendedManager(tool: VersionedTool): VersionManagerType {
    // Platform-specific recommendations
    if (this.platform === 'windows') {
      switch (tool) {
        case 'node':
          return 'nvm'; // nvm-windows
        case 'python':
          return 'pyenv'; // pyenv-win
        default:
          return 'mise'; // Universal fallback
      }
    }

    // Tool-specific recommendations for Unix platforms
    switch (tool) {
      case 'node':
        // Mise is modern and fast, but NVM is more established
        return 'mise';
      
      case 'python':
        // PyEnv is the de facto standard for Python
        return 'pyenv';
      
      case 'ruby':
        // RBenv is lightweight and popular
        return 'rbenv';
      
      case 'java':
        // SDKMAN is comprehensive for JVM ecosystem
        return 'sdkman';
      
      case 'rust':
        // Rustup is the official Rust toolchain manager
        return 'rustup';
      
      case 'go':
        // GVM is popular for Go
        return 'gvm';
      
      // For all other tools, Mise is a great universal choice
      default:
        return 'mise';
    }
  }

  /**
   * Check if a version manager type is supported on current platform
   */
  public isSupported(type: VersionManagerType, platform?: Platform): boolean {
    const checkPlatform = platform || this.platform;
    
    // Platform-specific support matrix
    const supportMatrix: Record<VersionManagerType, Platform[]> = {
      mise: ['macos', 'linux', 'windows'],
      asdf: ['macos', 'linux'], // Unix only
      proto: ['macos', 'linux', 'windows'],
      nvm: ['macos', 'linux', 'windows'], // Different implementations
      pyenv: ['macos', 'linux', 'windows'], // pyenv-win for Windows
      rbenv: ['macos', 'linux'], // Unix only
      jenv: ['macos', 'linux'], // Unix only
      rustup: ['macos', 'linux', 'windows'],
      gvm: ['macos', 'linux'], // Unix only
      volta: ['macos', 'linux', 'windows'],
      fnm: ['macos', 'linux', 'windows'],
      jabba: ['macos', 'linux', 'windows'],
      sdkman: ['macos', 'linux'], // Unix only (requires bash/zsh)
    };

    const supportedPlatforms = supportMatrix[type];
    if (!supportedPlatforms) {
      return false;
    }

    return supportedPlatforms.includes(checkPlatform);
  }

  /**
   * Get version managers that support a specific tool
   */
  public getManagersForTool(tool: VersionedTool): VersionManagerType[] {
    const toolSupport: Record<VersionedTool, VersionManagerType[]> = {
      node: ['mise', 'nvm', 'asdf', 'volta', 'fnm', 'proto'],
      python: ['mise', 'pyenv', 'asdf', 'proto'],
      ruby: ['mise', 'rbenv', 'asdf', 'proto'],
      java: ['mise', 'jenv', 'jabba', 'sdkman', 'asdf'],
      go: ['mise', 'gvm', 'asdf', 'proto'],
      rust: ['mise', 'rustup', 'proto'],
      php: ['mise', 'asdf'],
      perl: ['mise', 'asdf'],
      lua: ['mise', 'asdf'],
      elixir: ['mise', 'asdf'],
      erlang: ['mise', 'asdf'],
      julia: ['mise', 'asdf'],
      crystal: ['mise', 'asdf'],
      swift: ['mise', 'asdf'],
      scala: ['mise', 'sdkman', 'asdf'],
      kotlin: ['mise', 'sdkman', 'asdf'],
      dart: ['mise', 'asdf'],
      flutter: ['mise', 'asdf'],
      deno: ['mise', 'asdf', 'proto'],
      bun: ['mise', 'proto'],
      terraform: ['mise', 'asdf'],
      cmake: ['mise', 'asdf'],
      zig: ['mise', 'asdf'],
      lean: ['mise', 'asdf'],
      r: ['mise', 'asdf'],
      neovim: ['mise', 'asdf'],
    };

    const managers = toolSupport[tool] || ['mise']; // Default to Mise
    
    // Filter by platform support and implementation status
    return managers.filter(manager => 
      this.isSupported(manager) && 
      this.getSupportedTypes().includes(manager)
    );
  }
} 