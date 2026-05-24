// ESLint flat config (ESLint 9.x)
// Focus: catch obvious bugs (unused vars, no-empty) — NOT enforce style (Prettier handles that)
// Owner: BIG (admin tooling)

import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'data/**',
      'v3/kb*.json',
      'v3/master_dict.js',
      'tools/**',
      '*.html',
      'qrcode.min.js',
      'handoffs/archive/**',
      'dictionary_builder_v3.html',
      'extract_conditions.html',
      'kb_yaml_filled_*.json',
    ],
  },

  // Classic browser scripts (loaded via <script src=>, not modules)
  {
    files: ['script.js', 'sw.js', 'auth-pin.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
    },
  },

  // ES modules (V3 frontend + workers + admin scripts)
  {
    files: ['v3/**/*.js', 'workers/**/*.mjs', 'scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
    },
  },
];
