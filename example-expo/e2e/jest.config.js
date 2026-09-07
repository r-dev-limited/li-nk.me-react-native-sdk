module.exports = {
    rootDir: '..',
    testMatch: ['<rootDir>/e2e/**/*.e2e.[jt]s?(x)'],
    testTimeout: 180000,
    maxWorkers: 1,
    globalSetup: 'detox/runners/jest/globalSetup',
    globalTeardown: 'detox/runners/jest/globalTeardown',
    reporters: ['detox/runners/jest/reporter'],
    testEnvironment: 'detox/runners/jest/testEnvironment',
    // E2E files are plain CommonJS. Avoid the app's Expo Babel preset, which
    // injects the ESM-only expo/virtual/env module into Jest's Node runtime.
    transform: {},
};
