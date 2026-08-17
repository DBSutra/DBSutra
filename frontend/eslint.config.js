import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // Base JS recommended rules
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'bindings/**',
      'wailsjs/**',
      'coverage/**',
      '*.js',
      '*.cjs',
      '*.mjs',
    ],
  },

  // TypeScript + React source files
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/test/**',
    ],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react': reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // TypeScript
      ...tseslint.configs['recommended'].rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

      // React
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // React Hooks
      ...reactHooks.configs.recommended.rules,

      // General
      'no-console': ['warn', { allow: ['warn', 'error', 'debug'] }],
      'no-debugger': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
    },
  },
]
