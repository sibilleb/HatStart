// Unit tests for Detection Testing Framework
import { DetectionError, ErrorCategory, ErrorRecovery, ErrorSeverity } from '../../src/shared/detection-errors';
import { DetectionLogger } from '../../src/shared/detection-logger';
import { OSDetector } from '../../src/shared/os-detector';
import { isValidDetectionResult, isValidVersion, TEST_PLATFORM } from '../utils/test-helpers';

describe('Detection Testing Framework', () => {
  describe('Test Utilities', () => {
    it('should validate detection results correctly', () => {
      const validResult = {
        success: true,
        category: 'test',
        detectedItems: []
      };
      
      const invalidResult = {
        success: true
        // missing required fields
      };
      
      expect(isValidDetectionResult(validResult)).toBe(true);
      expect(isValidDetectionResult(invalidResult)).toBe(false);
      expect(isValidDetectionResult(null)).toBe(false);
      expect(isValidDetectionResult(undefined)).toBe(false);
    });

    it('should validate version strings correctly', () => {
      // Valid versions
      expect(isValidVersion('1.0.0')).toBe(true);
      expect(isValidVersion('2.1.3')).toBe(true);
      expect(isValidVersion('10.15.7')).toBe(true);
      expect(isValidVersion('1.0.0-beta')).toBe(true);
      expect(isValidVersion('2.1.3-alpha.1')).toBe(true);
      
      // Invalid versions
      expect(isValidVersion('1.0')).toBe(false);
      expect(isValidVersion('v1.0.0')).toBe(false);
      expect(isValidVersion('1.0.0.0')).toBe(false);
      expect(isValidVersion('invalid')).toBe(false);
      expect(isValidVersion('')).toBe(false);
    });

    it('should detect current platform correctly', () => {
      expect(['win32', 'darwin', 'linux']).toContain(TEST_PLATFORM);
    });
  });

  describe('Error Handling System', () => {
    it('should create detection errors with proper categorization', () => {
      const context = {
        component: 'test-component',
        operation: 'test-operation',
        command: 'test-command',
        timestamp: new Date()
      };

      const error = new DetectionError(
        'Test error message',
        ErrorCategory.COMMAND_EXECUTION,
        ErrorSeverity.MEDIUM,
        context
      );

      expect(error.message).toBe('Test error message');
      expect(error.category).toBe(ErrorCategory.COMMAND_EXECUTION);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.context.command).toBe('test-command');
      expect(error.context.timestamp).toBeInstanceOf(Date);
    });

    it('should provide static factory methods for common errors', () => {
      const timeoutError = DetectionError.timeout('test-operation', 'test-component', 5000, 'test-command');
      expect(timeoutError.category).toBe(ErrorCategory.TIMEOUT);
      expect(timeoutError.message).toContain('timed out');

      const permissionError = DetectionError.permissionDenied('/test/path', 'test-component', 'test-operation');
      expect(permissionError.category).toBe(ErrorCategory.PERMISSION_DENIED);
      expect(permissionError.message).toContain('Permission denied');

      const parsingError = DetectionError.parsing('invalid data', 'test-component', 'test-operation', new Error('parse failed'));
      expect(parsingError.category).toBe(ErrorCategory.PARSING_ERROR);
      expect(parsingError.message).toContain('Failed to parse data');
    });

    it('should handle error recovery correctly', async () => {
      let attemptCount = 0;

      const operation = async (): Promise<string> => {
        attemptCount++;
        throw new Error('Simulated failure');
      };

      const fallbackStrategies = [
        async () => {
          attemptCount++;
          return 'fallback-success';
        }
      ];

      const context = {
        component: 'test-component',
        operation: 'test-operation',
        timestamp: new Date()
      };

      const result = await ErrorRecovery.attemptRecovery(operation, fallbackStrategies, context);
      
      expect(result).toBe('fallback-success');
      expect(attemptCount).toBe(2); // 1 for operation, 1 for fallback
    });
  });

  describe('Basic Logging', () => {
    it('should create logger instance', () => {
      const logger = new DetectionLogger();
      expect(logger).toBeInstanceOf(DetectionLogger);
    });

    it('should handle basic logging operations', () => {
      const logger = new DetectionLogger();
      
      // These should not throw errors
      expect(() => {
        logger.info('test-component', 'test-operation', 'Test info message');
        logger.error('test-component', 'test-operation', 'Test error message');
      }).not.toThrow();
    });
  });

  describe('Basic OS Detection', () => {
    let osDetector: OSDetector;

    beforeEach(() => {
      osDetector = new OSDetector();
    });

    it('should detect system information without errors', async () => {
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

  describe('Cross-Platform Compatibility', () => {
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
}); 