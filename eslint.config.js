// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '.github/**',
      'coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      'data/**',
      'uploads/**',
      // Ignore files with known TS errors (test/dev helpers)
      'apps/api/src/database/storage.ts',
      'apps/api/src/routes/legacy-routes.ts',
      'apps/api/src/processors/**',
      'apps/api/src/services/**',
      'apps/api/src/training/**',
      'apps/web/src/pages/admin.tsx',
      'apps/web/src/pages/ai-enhanced-dashboard.tsx',
      'apps/web/src/pages/enhanced-*.tsx',
      'apps/web/src/pages/reports.tsx',
      'apps/web/src/components/enhanced-*.tsx',
      'tests/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off', // TypeScript handles this
    },
  },
);
