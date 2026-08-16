import js from '@eslint/js';
import tsPlugin from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.next/**',
      'public/**',
      'Asset/**',
      '*.config.*',
      '*.cjs',
      '*.js',
      'scripts/**',
      'prisma/**'
    ]
  },
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'off',
      'no-case-declarations': 'off',
      'prefer-const': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-async-promise-executor': 'off',
      'no-useless-assignment': 'off'
    }
  }
];
