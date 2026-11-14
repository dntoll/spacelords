import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['src/client/**/*.ts'],
    ignores: ['src/client/boarding/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/**'],
              message: 'Client code must not import server code.',
            },
            {
              // isolerad-bordningsmodul: the rest of the game sees only the barrels.
              regex: '(^|/)boarding/(?!(models|views|controllers)/index\\.js$)',
              message:
                'Import boarding only through boarding/{models,views,controllers}/index.js.',
            },
          ],
        },
      ],
    },
  },
  ...[2, 3].map((depth) => ({
    // isolerad-bordningsmodul: an import that climbs out of src/client/boarding
    // may only reach the shared game files the module is allowed to use.
    files: [`src/client/boarding/${'*/'.repeat(depth - 1)}*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^(\\.\\./){${depth}}(?!models/(TacticalBattle|AppModel)\\.js$|views/(dom|ViewContracts|ShipImages|app/playerNoticeText)\\.js$|\\.\\./shared/boarding/)`,
              message:
                'The boarding module may only use TacticalBattle, AppModel, dom, ViewContracts, ShipImages, playerNoticeText and shared/boarding.',
            },
          ],
        },
      ],
    },
  })),
  prettier,
);
