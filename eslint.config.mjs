import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// isolerad-bordningsmodul / isolerad-rymdstridsmodul / isolerad-rymdkartmodul /
// app-skal: the module boundaries come from architecture.config.mjs, which also
// drives docs/architecture/.
import { featureModules, sharedForModules } from './architecture.config.mjs';

const serverImport = {
  group: ['**/server/**'],
  message: 'Client code must not import server code.',
};

function moduleBarrelOnly({ dir }) {
  return {
    regex: `(^|/)${dir}/(?!(models|views|controllers)/index\\.js$)`,
    message: `Import ${dir} only through ${dir}/{models,views,controllers}/index.js.`,
  };
}

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
    ignores: featureModules.map(({ dir }) => `src/client/${dir}/**`),
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [serverImport, ...featureModules.map(moduleBarrelOnly)] },
      ],
    },
  },
  ...featureModules.flatMap((module) =>
    module.depths.map((depth) => {
      const allowed = [...sharedForModules, ...module.allowed];
      return {
        // An import that climbs out of the module may only reach the shared
        // files it is allowed to use, or another module's barrel.
        files: [`src/client/${module.dir}/${'*/'.repeat(depth - 1)}*.ts`],
        rules: {
          'no-restricted-imports': [
            'error',
            {
              patterns: [
                serverImport,
                ...featureModules
                  .filter((other) => other !== module)
                  .map(moduleBarrelOnly),
                {
                  regex: `^(\\.\\./){${depth}}(?!(${allowed.join('|')}))`,
                  message: `The ${module.dir} module may only use: ${allowed
                    .map((path) => path.replaceAll('\\', '').replace(/\$$/, ''))
                    .join(', ')}.`,
                },
              ],
            },
          ],
        },
      };
    }),
  ),
  {
    // app-skal: common/ is generic code that knows no game or module.
    files: ['src/client/common/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./',
              message: 'common/ may not import code outside common/.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
