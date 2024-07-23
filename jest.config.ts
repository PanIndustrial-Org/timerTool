import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  watch: false,
  preset: 'ts-jest/presets/js-with-babel',
  verbose: true,
  globalSetup: '<rootDir>/pic/global-setup.ts',
  globalTeardown: '<rootDir>/pic/global-teardown.ts',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  maxWorkers: 1,
  testEnvironment: "node",
  testTimeout: 360000,
  testPathIgnorePatterns: ["/node_modules/", "/frontend/", "/scratch_tests/"],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

module.exports = config;
