module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@harsi/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@harsi/market-data$': '<rootDir>/packages/market-data/src/index.ts',
    '^@harsi/strategies$': '<rootDir>/packages/strategies/src/index.ts',
    '^@harsi/broker-adapters$': '<rootDir>/packages/broker-adapters/src/index.ts',
    '^@harsi/trading-engine$': '<rootDir>/packages/trading-engine/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          target: 'ES2022',
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          skipLibCheck: true,
        },
      },
    ],
  },
};
