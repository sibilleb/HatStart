/**
 * Operating System Detection Module
 * Comprehensive cross-platform OS detection and system information gathering
 */

import { exec } from 'child_process';
import * as os from 'os';
import { promisify } from 'util';
import type { ArchitectureType, PlatformType, SystemInfo } from './detection-types.js';

const execAsync = promisify(exec);

export interface OSDetectionResult {
  /** Detected platform */
  platform: PlatformType;
  /** System architecture */
  architecture: ArchitectureType;
  /** OS version string */
  version: string;
  /** OS build number (if available) */
  build?: string;
  /** Linux distribution info */
  distribution?: {
    name: string;
    version: string;
    codename?: string;
    id?: string;
  };
  /** Additional system information */
  systemInfo: {
    hostname: string;
    kernel?: string;
    shell?: string;
    totalMemory?: number;
    freeMemory?: number;
  };
}

export class OSDetector {
  /**
   * Detect comprehensive system information
   */
  public async detectSystem(): Promise<OSDetectionResult> {
    const platform = this.detectPlatform();
    const architecture = this.detectArchitecture();
    
    let version: string;
    let build: string | undefined;
    let distribution: OSDetectionResult['distribution'];
    
    // Platform-specific detection
    switch (platform) {
      case 'windows':
        ({ version, build } = await this.detectWindowsVersion());
        break;
      case 'macos':
        version = await this.detectMacOSVersion();
        break;
      case 'linux':
        version = await this.detectLinuxVersion();
        distribution = await this.detectLinuxDistribution();
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Gather additional system information
    const systemInfo = await this.gatherSystemInfo(platform);

    return {
      platform,
      architecture,
      version,
      build,
      distribution,
      systemInfo
    };
  }

  /**
   * Detect the current platform
   */
  private detectPlatform(): PlatformType {
    const platform = process.platform;
    
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Detect system architecture
   */
  private detectArchitecture(): ArchitectureType {
    const arch = process.arch;
    
    switch (arch) {
      case 'x64':
        return 'x64';
      case 'ia32':
        return 'x86';
      case 'arm64':
        return 'arm64';
      case 'arm':
        return 'arm';
      default:
        return 'x64'; // Default fallback
    }
  }

  /**
   * Detect Windows version and build
   */
  private async detectWindowsVersion(): Promise<{ version: string; build?: string }> {
    try {
      // Try PowerShell first for more detailed information
      const { stdout } = await execAsync(
        'powershell -Command "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx | ConvertTo-Json"',
        { timeout: 10000 }
      );
      
      const info = JSON.parse(stdout.trim());
      return {
        version: info.WindowsProductName || info.WindowsVersion || process.platform,
        build: info.WindowsBuildLabEx
      };
         } catch {
       // Fallback to wmic
       try {
         const { stdout } = await execAsync('wmic os get Caption,Version /format:csv', { timeout: 5000 });
         const lines = stdout.split('\n').filter(line => line.includes(','));
         if (lines.length > 0) {
           const parts = lines[0].split(',');
           return {
             version: parts[1] ? parts[1].trim() : 'Windows',
             build: parts[2] ? parts[2].trim() : undefined
           };
         }
       } catch {
         // Final fallback
         return {
           version: 'Windows (Unknown Version)'
         };
       }
     }
    
    return { version: 'Windows' };
  }

  /**
   * Detect macOS version
   */
  private async detectMacOSVersion(): Promise<string> {
    try {
      // Get macOS version and build
      const { stdout } = await execAsync('sw_vers', { timeout: 5000 });
      
      const lines = stdout.split('\n');
      let productName = 'macOS';
      let productVersion = '';
      let buildVersion = '';
      
      for (const line of lines) {
        if (line.includes('ProductName:')) {
          productName = line.split(':')[1].trim();
        } else if (line.includes('ProductVersion:')) {
          productVersion = line.split(':')[1].trim();
        } else if (line.includes('BuildVersion:')) {
          buildVersion = line.split(':')[1].trim();
        }
      }
      
      return `${productName} ${productVersion}${buildVersion ? ` (${buildVersion})` : ''}`;
         } catch {
       // Fallback to uname
       try {
         const { stdout } = await execAsync('uname -v', { timeout: 3000 });
         return `macOS ${stdout.trim()}`;
       } catch {
         return 'macOS (Unknown Version)';
       }
     }
  }

  /**
   * Detect Linux kernel version
   */
  private async detectLinuxVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('uname -r', { timeout: 3000 });
      return stdout.trim();
    } catch {
      return 'Linux (Unknown Version)';
    }
  }

  /**
   * Detect Linux distribution information
   */
  private async detectLinuxDistribution(): Promise<OSDetectionResult['distribution']> {
    try {
      // Try /etc/os-release first (modern standard)
      const { stdout } = await execAsync('cat /etc/os-release', { timeout: 3000 });
      
      const osRelease: Record<string, string> = {};
      for (const line of stdout.split('\n')) {
        const [key, value] = line.split('=');
        if (key && value) {
          osRelease[key] = value.replace(/"/g, '');
        }
      }
      
      return {
        name: osRelease.NAME || osRelease.ID || 'Unknown Linux',
        version: osRelease.VERSION || osRelease.VERSION_ID || 'Unknown',
        codename: osRelease.VERSION_CODENAME || osRelease.UBUNTU_CODENAME,
        id: osRelease.ID
      };
    } catch {
      // Fallback methods
      return await this.detectLinuxDistributionFallback();
    }
  }

  /**
   * Fallback methods for Linux distribution detection
   */
  private async detectLinuxDistributionFallback(): Promise<OSDetectionResult['distribution']> {
    const fallbackMethods = [
      // Try lsb_release
      async () => {
        const { stdout } = await execAsync('lsb_release -a', { timeout: 3000 });
        const lines = stdout.split('\n');
        const info: Record<string, string> = {};
        
        for (const line of lines) {
          const [key, value] = line.split(':');
          if (key && value) {
            info[key.trim()] = value.trim();
          }
        }
        
        return {
          name: info['Distributor ID'] || 'Unknown Linux',
          version: info['Release'] || 'Unknown',
          codename: info['Codename']
        };
      },
      
      // Try /etc/redhat-release
      async () => {
        const { stdout } = await execAsync('cat /etc/redhat-release', { timeout: 3000 });
        return {
          name: 'Red Hat/CentOS',
          version: stdout.trim()
        };
      },
      
      // Try /etc/debian_version
      async () => {
        const { stdout } = await execAsync('cat /etc/debian_version', { timeout: 3000 });
        return {
          name: 'Debian',
          version: stdout.trim()
        };
      },
      
      // Try /etc/arch-release
      async () => {
        await execAsync('cat /etc/arch-release', { timeout: 3000 });
        return {
          name: 'Arch Linux',
          version: 'Rolling Release'
        };
      }
    ];

    for (const method of fallbackMethods) {
      try {
        return await method();
      } catch {
        // Continue to next method
        continue;
      }
    }

    // Final fallback
    return {
      name: 'Unknown Linux Distribution',
      version: 'Unknown'
    };
  }

  /**
   * Gather additional system information
   */
  private async gatherSystemInfo(platform: PlatformType): Promise<OSDetectionResult['systemInfo']> {
    const systemInfo: OSDetectionResult['systemInfo'] = {
      hostname: await this.getHostname(),
      totalMemory: this.getTotalMemory(),
      freeMemory: this.getFreeMemory()
    };

    // Platform-specific additional info
    switch (platform) {
      case 'linux':
      case 'macos':
        systemInfo.kernel = await this.getKernelVersion();
        systemInfo.shell = await this.getShell();
        break;
      case 'windows':
        // Windows-specific info could be added here
        break;
    }

    return systemInfo;
  }

  /**
   * Get system hostname
   */
  private async getHostname(): Promise<string> {
    try {
      return os.hostname();
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get kernel version (Unix-like systems)
   */
  private async getKernelVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('uname -v', { timeout: 3000 });
      return stdout.trim();
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get current shell
   */
  private async getShell(): Promise<string> {
    try {
      return process.env.SHELL || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Get total system memory
   */
  private getTotalMemory(): number {
    try {
      return os.totalmem();
    } catch {
      return 0;
    }
  }

  /**
   * Get free system memory
   */
  private getFreeMemory(): number {
    try {
      return os.freemem();
    } catch {
      return 0;
    }
  }

  /**
   * Convert detection result to SystemInfo format
   */
  public static toSystemInfo(result: OSDetectionResult): SystemInfo {
    return {
      platform: result.platform,
      architecture: result.architecture,
      version: result.version,
      distribution: result.distribution?.name,
      distributionVersion: result.distribution?.version
    };
  }
}

// Export singleton instance
export const osDetector = new OSDetector(); 