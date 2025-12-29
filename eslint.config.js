
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  Object.assign({}, js.configs.recommended, {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        require: true,
        module: true,
        process: true,
        __dirname: true,
        console: true,
        setTimeout: true,
      },
    },
  }),
  {
    // Override para testes
    files: ["**/*.test.js", "**/__tests__/**/*.js"],
    languageOptions: {
      globals: {
        describe: true,
        it: true,
        test: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        jest: true,
      },
    },
  },
  prettier,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
