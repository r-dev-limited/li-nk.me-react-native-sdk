module.exports = {
    rootDir: '..',
    testMatch: ['<rootDir>/e2e/**/*.e2e.[jt]s?(x)'],
    testTimeout: 180000,
    reporters: ['detox/runners/jest/reporter'],
    testEnvironment: 'detox/runners/jest/testEnvironment',
};
