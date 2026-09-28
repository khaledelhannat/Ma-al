import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Architecture boundary: the domain layer is pure. It must not depend on
    // the UI, persistence, or AI layers, nor on React/Dexie/router libraries.
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'The domain layer must not depend on React.',
            },
            {
              name: 'react-dom',
              message: 'The domain layer must not depend on React.',
            },
            {
              name: 'react-router-dom',
              message: 'The domain layer must not depend on routing.',
            },
            {
              name: 'dexie',
              message:
                'The domain layer must not depend on Dexie; persistence maps domain types in src/data.',
            },
          ],
          patterns: [
            {
              group: [
                '**/app/**',
                '**/components/**',
                '**/features/**',
                '**/data/**',
                '**/services/**',
              ],
              message:
                'The domain layer must not import from UI, persistence, or AI layers.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
