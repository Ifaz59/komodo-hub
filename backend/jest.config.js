module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setupEnv.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: ['routes/**/*.js', 'middleware/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 15000,
  verbose: true,
};
