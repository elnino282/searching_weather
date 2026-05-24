/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    "index.js",
    "lib/**/*.js",
    "routes/**/*.js",
  ],
  coverageDirectory: "coverage",
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
};
