import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'
import globals from 'globals'

export default [
  // Ignore generated, test, and script directories
  {
    ignores: ['dist/**', 'node_modules/**', 'public/sw.js', 'tests/**', 'scripts/**', 'playwright.config.js'],
  },

  // Global language options — must come before recommended configs so JSX is understood
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
        google: 'readonly', // Google Maps global
      },
    },
  },

  js.configs.recommended,

  // React hooks
  {
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },

  // Accessibility
  jsxA11y.flatConfigs.recommended,

  // Import ordering (resolver-dependent static-analysis rules disabled for Vite)
  {
    plugins: { import: importPlugin },
    rules: {
      'import/order': ['warn', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'never',
      }],
    },
  },

  // Project-wide overrides
  {
    rules: {
      // Empty catch blocks are intentional in localStorage wrappers
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Downgrade debatable a11y rules for overlay/interactive elements
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      // Fires on role="dialog" backdrop divs — acceptable pattern
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    },
  },
]
