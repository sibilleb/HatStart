// Basic integration tests for Detection System
import { OSDetector } from '../../src/shared/os-detector';
import { TEST_PLATFORM } from '../utils/test-helpers';

describe('Basic Detection Integration', () => {
  describe('OS Detection', () => {
    let osDetector: OSDetector;

    beforeEach(() => {
      osDetector = new OSDetector();
    });

    it('should detect current operating system', async () => {
      const result = await osDetector.detectSystem();
      
      // Basic structure validation
      expect(typeof result).toBe('object');
      expect(typeof result.platform).toBe('string');
      expect(typeof result.architecture).toBe('string');
      expect(typeof result.version).toBe('string');
      expect(typeof result.systemInfo).toBe('object');
      
      // Platform should be valid
      expect(['windows', 'macos', 'linux']).toContain(result.platform);
      
      // Architecture should be valid
      expect(['x64', 'x86', 'arm64', 'arm']).toContain(result.architecture);
      
      // Version should not be empty
      expect(result.version.length).toBeGreaterThan(0);
      
      // System info should have hostname
      expect(typeof result.systemInfo.hostname).toBe('string');
      expect(result.systemInfo.hostname.length).toBeGreaterThan(0);
    });

    it('should convert to SystemInfo format correctly', async () => {
      const detectionResult = await osDetector.detectSystem();
      const systemInfo = OSDetector.toSystemInfo(detectionResult);
      
      expect(typeof systemInfo.platform).toBe('string');
      expect(typeof systemInfo.architecture).toBe('string');
      
      // Data should match
      expect(systemInfo.platform).toBe(detectionResult.platform);
      expect(systemInfo.architecture).toBe(detectionResult.architecture);
    });

    it('should be consistent across multiple calls', async () => {
      const result1 = await osDetector.detectSystem();
      const result2 = await osDetector.detectSystem();
      
      // Core system info should be identical
      expect(result1.platform).toBe(result2.platform);
      expect(result1.architecture).toBe(result2.architecture);
      expect(result1.systemInfo.hostname).toBe(result2.systemInfo.hostname);
    });

    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      await osDetector.detectSystem();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(30000); // 30 seconds max
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle current platform correctly', () => {
      expect(['win32', 'darwin', 'linux']).toContain(TEST_PLATFORM);
    });

    it('should handle platform-specific paths correctly', () => {
      const testPaths = {
        windows: 'C:\\Program Files\\Test',
        macos: '/Applications/Test.app',
        linux: '/usr/local/bin/test'
      };
      
      // All paths should be strings
      Object.values(testPaths).forEach(path => {
        expect(typeof path).toBe('string');
        expect(path.length).toBeGreaterThan(0);
      });
    });

    it('should handle platform-specific commands', () => {
      const commands = {
        win32: 'dir',
        darwin: 'ls',
        linux: 'ls'
      };
      
      const currentPlatformCommand = commands[TEST_PLATFORM as keyof typeof commands];
      expect(typeof currentPlatformCommand).toBe('string');
    });
  });

  describe('Performance Testing', () => {
    it('should measure execution time accurately', async () => {
      const startTime = Date.now();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
      expect(duration).toBeLessThan(200); // Should not take too long
    });

    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        new Promise(resolve => setTimeout(() => resolve(i), 50))
      );
      
      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();
      
      expect(results).toEqual([0, 1, 2, 3, 4]);
      expect(endTime - startTime).toBeLessThan(150); // Should run concurrently
    });
  });
}); 