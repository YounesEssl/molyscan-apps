/**
 * Minimal Jest config for pure, RN-free unit tests (e.g. the outbox retry
 * policy). Uses ts-jest with a standalone tsconfig so it does not pull in
 * React Native / Expo ambient types.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          target: 'es2020',
          esModuleInterop: true,
          skipLibCheck: true,
          isolatedModules: true,
        },
      },
    ],
  },
};
