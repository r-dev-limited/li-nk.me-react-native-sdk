module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      lines: 75,
      statements: 75,
      functions: 60,
      branches: 60
    }
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/test/react-native-mock.ts'
  }
};
