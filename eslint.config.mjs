import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// isolerad-bordningsmodul / isolerad-rymdstridsmodul / isolerad-rymdkartmodul /
// app-skal: feature modules under src/client. `depths` are the directory depths
// of their source files and `allowed` the extra paths, relative to src/client,
// they may import from outside themselves. Every module may also use the app
// shell's AppModel and ViewContracts, `common/`, and the model and view barrels
// of the other modules. See docs/architecture/overview.puml.
const featureModules = [
  {
    dir: 'space-map',
    depths: [2, 3],
    allowed: ['app/models/PlayerNotice\\.js$'],
  },
  { dir: 'space-battle', depths: [2], allowed: [] },
  {
    dir: 'boarding',
    depths: [2, 3],
    allowed: ['app/views/playerNoticeText\\.js$', '\\.\\./shared/boarding/'],
  },
];

const sharedForModules = [
  'app/models/AppModel\\.js$',
  'app/views/ViewContracts\\.js$',
  'common/',
  `(${featureModules.map(({ dir }) => dir).join('|')})/(models|views)/index\\.js$`,
];

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
