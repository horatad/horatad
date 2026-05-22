// HORATAD — ESLint flat config (v9+)
// vanilla JS no-build project — script.js เป็น classic script, v3/*.js เป็น ES module, workers+scripts เป็น Node
// preset: js.configs.recommended (ระดับเข้มต่ำ — เน้น catch typo/dead code, ไม่บังคับ style)

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'data/**',
      'handoffs/**',
      'tools/**/*.html',
      '**/*.min.js',
      'v3/kb*.json',
      'v3/kb_master.json',
      'v3/kb_skeletons.json',
    ],
  },

  js.configs.recommended,

  // script.js — classic script (declare own globals; no module)
  // Note: ห้ามใส่ APP_VERSION/natal1/getNatal/etc. ใน globals — script.js declare เอง = no-redeclare error
  {
    files: ['script.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'off',
      'no-inner-declarations': 'off',
    },
  },

  // sw.js — service worker context
  {
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.serviceworker,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // v3/*.js — ES module browser (มี globals จาก script.js classic context)
  {
    files: ['v3/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        APP_VERSION: 'readonly',
        getNatal: 'readonly',
        getTransit: 'readonly',
        _showToast: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // workers/*.mjs + scripts/*.mjs — Node ES module
  {
    files: ['workers/**/*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // workers/*.js — CF Worker (ES module with Service Worker globals)
  {
    files: ['workers/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
