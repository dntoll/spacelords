import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// isolerad-bordningsmodul / isolerad-rymdstridsmodul: feature modules under
// src/client. `depths` are the directory depths of their source files and
// `allowed` the paths, relative to src/client, they may import from outside.
const featureModules = [
  {
    dir: 'boarding',
    depths: [2, 3],
    allowed: [
      'space-battle/models/index\\.js$',
      'models/AppModel\\.js$',
      'views/(dom|ViewContracts|ShipImages|app/playerNoticeText)\\.js$',
      '\\.\\./shared/boarding/',
    ],
  },
  {
    dir: 'space-battle',
    depths: [2],
    allowed: [
      'models/(AppModel|Game|HexCoordinate)\\.js$',
      'views/(dom|ViewContracts|ShipImages|ShipView)\\.js$',
    ],
  },
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
    module.depths.map((depth) => ({
      // An import that climbs out of the module may only reach the shared game
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
                regex: `^(\\.\\./){${depth}}(?!(${module.allowed.join('|')}))`,
                message: `The ${module.dir} module may only use: ${module.allowed
                  .map((path) => path.replaceAll('\\', '').replace(/\$$/, ''))
                  .join(', ')}.`,
              },
            ],
          },
        ],
      },
    })),
  ),
  prettier,
);
