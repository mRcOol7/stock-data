// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock config
jest.mock('./config', () => ({
  apiBaseUrl: 'http://localhost:5000'
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn((url) => {
    // Mock different responses based on the URL
    if (url.includes('/api/indices')) {
      return Promise.resolve({
        data: [
          { symbol: 'NIFTY', value: 19000 },
          { symbol: 'BANKNIFTY', value: 44000 }
        ]
      });
    }
    if (url.includes('/api/nifty')) {
      return Promise.resolve({
        data: [
          { symbol: 'RELIANCE', price: 2500 },
          { symbol: 'TCS', price: 3500 }
        ]
      });
    }
    if (url.includes('/api/banknifty')) {
      return Promise.resolve({
        data: [
          { symbol: 'HDFCBANK', price: 1600 },
          { symbol: 'ICICIBANK', price: 950 }
        ]
      });
    }
    // Default response
    return Promise.resolve({ data: [] });
  })
}));
