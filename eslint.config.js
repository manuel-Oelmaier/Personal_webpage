import { defineConfig } from 'eslint/config';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...eslintPluginAstro.configs.recommended,
  ...eslintPluginAstro.configs['jsx-a11y-recommended'],
  {
    languageOptions: {
      parserOptions: {
        extraFileExtensions: ['.astro'],
        project: ['./tsconfig.json', './e2e/tsconfig.json'],
        tsconfigRootDir,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      curly: 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
      'no-implicit-coercion': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.astro'],
    rules: {
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['eslint.config.js', 'astro.config.mjs', 'playwright.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
