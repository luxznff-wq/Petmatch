import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Configuración de ESLint (formato plano, ESLint 9).
 *
 * Backend y frontend comparten las reglas base y añaden cada uno las suyas:
 * el backend corre en Node y el frontend en el navegador con React.
 */
export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
  },

  js.configs.recommended,

  // Reglas comunes a todo el proyecto.
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module'
    },
    rules: {
      // Los argumentos sin usar con prefijo _ son intencionales (Express los
      // exige por posición en los manejadores de error).
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'off',
      'object-shorthand': 'error',
      'no-implicit-coercion': ['error', { boolean: false }]
    }
  },

  // Backend: Node.js.
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },

  // Frontend: navegador + React.
  {
    files: ['frontend/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      // Sin TypeScript ni prop-types: los contratos se documentan con JSDoc.
      'react/prop-types': 'off'
    }
  },

  // Pruebas del frontend: Vitest expone sus globales.
  {
    files: ['frontend/src/tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, vi: 'readonly' }
    }
  },

  // Configuración del propio proyecto.
  {
    files: ['**/*.config.js'],
    languageOptions: { globals: { ...globals.node } }
  }
];
