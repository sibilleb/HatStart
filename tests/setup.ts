// Global test setup for HatStart Detection Testing Framework

// Set global test timeout
jest.setTimeout(30000);

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.HATSTART_TEST_MODE = 'true';
process.env.HATSTART_LOG_LEVEL = 'ERROR'; // Reduce log noise during tests

// Mock console methods in test environment to reduce noise
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  // Keep error and warn for important messages
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Preserve warn and error for test debugging
  warn: originalConsole.warn,
  error: originalConsole.error
};

// Restore console after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  // Restore original console
  global.console = originalConsole;
}); 