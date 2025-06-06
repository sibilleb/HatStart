"use strict";
/**
 * Operating System Detection Module
 * Comprehensive cross-platform OS detection and system information gathering
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.osDetector = exports.OSDetector = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class OSDetector {
    /**
     * Detect comprehensive system information
     */
    async detectSystem() {
        const platform = this.detectPlatform();
        const architecture = this.detectArchitecture();
        let version;
        let build;
        let distribution;
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
    detectPlatform() {
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
    detectArchitecture() {
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
    async detectWindowsVersion() {
        try {
            // Try PowerShell first for more detailed information
            const { stdout } = await execAsync('powershell -Command "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx | ConvertTo-Json"', { timeout: 10000 });
            const info = JSON.parse(stdout.trim());
            return {
                version: info.WindowsProductName || info.WindowsVersion || process.platform,
                build: info.WindowsBuildLabEx
            };
        }
        catch {
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
            }
            catch {
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
    async detectMacOSVersion() {
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
                }
                else if (line.includes('ProductVersion:')) {
                    productVersion = line.split(':')[1].trim();
                }
                else if (line.includes('BuildVersion:')) {
                    buildVersion = line.split(':')[1].trim();
                }
            }
            return `${productName} ${productVersion}${buildVersion ? ` (${buildVersion})` : ''}`;
        }
        catch {
            // Fallback to uname
            try {
                const { stdout } = await execAsync('uname -v', { timeout: 3000 });
                return `macOS ${stdout.trim()}`;
            }
            catch {
                return 'macOS (Unknown Version)';
            }
        }
    }
    /**
     * Detect Linux kernel version
     */
    async detectLinuxVersion() {
        try {
            const { stdout } = await execAsync('uname -r', { timeout: 3000 });
            return stdout.trim();
        }
        catch (error) {
            return 'Linux (Unknown Version)';
        }
    }
    /**
     * Detect Linux distribution information
     */
    async detectLinuxDistribution() {
        try {
            // Try /etc/os-release first (modern standard)
            const { stdout } = await execAsync('cat /etc/os-release', { timeout: 3000 });
            const osRelease = {};
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
        }
        catch (error) {
            // Fallback methods
            return await this.detectLinuxDistributionFallback();
        }
    }
    /**
     * Fallback methods for Linux distribution detection
     */
    async detectLinuxDistributionFallback() {
        const fallbackMethods = [
            // Try lsb_release
            async () => {
                const { stdout } = await execAsync('lsb_release -a', { timeout: 3000 });
                const lines = stdout.split('\n');
                const info = {};
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
            }
            catch (error) {
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
    async gatherSystemInfo(platform) {
        const systemInfo = {
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
    async getHostname() {
        try {
            const os = await Promise.resolve().then(() => __importStar(require('os')));
            return os.hostname();
        }
        catch (error) {
            return 'Unknown';
        }
    }
    /**
     * Get kernel version (Unix-like systems)
     */
    async getKernelVersion() {
        try {
            const { stdout } = await execAsync('uname -v', { timeout: 3000 });
            return stdout.trim();
        }
        catch (error) {
            return 'Unknown';
        }
    }
    /**
     * Get current shell
     */
    async getShell() {
        try {
            return process.env.SHELL || 'Unknown';
        }
        catch (error) {
            return 'Unknown';
        }
    }
    /**
     * Get total system memory
     */
    getTotalMemory() {
        try {
            const os = require('os');
            return os.totalmem();
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * Get free system memory
     */
    getFreeMemory() {
        try {
            const os = require('os');
            return os.freemem();
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * Convert detection result to SystemInfo format
     */
    static toSystemInfo(result) {
        return {
            platform: result.platform,
            architecture: result.architecture,
            version: result.version,
            distribution: result.distribution?.name,
            distributionVersion: result.distribution?.version
        };
    }
}
exports.OSDetector = OSDetector;
// Export singleton instance
exports.osDetector = new OSDetector();
//# sourceMappingURL=os-detector.js.map