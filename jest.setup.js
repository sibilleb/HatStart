// Add custom Jest matchers from jest-dom
import '@testing-library/jest-dom';

// Suppress React 18 act() warnings
// See: https://github.com/testing-library/react-testing-library/issues/1051
globalThis.IS_REACT_ACT_ENVIRONMENT = true; 