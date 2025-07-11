// eslint.config.js
'use strict';

// Import necessary packages
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Globally ignored files
  {
    ignores: ['dist/', 'node_modules/'],
  },

  // Base configuration for all JavaScript/TypeScript files
  js.configs.recommended,

  // TypeScript-specific configurations
  ...tseslint.configs.recommended,

  // Prettier configuration to disable conflicting rules
  // This MUST be the last configuration in the array.
  prettierConfig,
];