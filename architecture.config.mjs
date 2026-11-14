// isolerad-bordningsmodul / isolerad-rymdstridsmodul / isolerad-rymdkartmodul /
// app-skal / arkitekturkarta: the client's feature modules. ESLint enforces the
// boundaries from this list and scripts/architecture-map.mjs draws
// docs/architecture/ from it. Titles and descriptions are shown in the
// (Swedish) architecture documentation.
//
// `depths` are the directory depths of a module's source files below
// src/client/<dir>/. `allowed` lists the extra paths, relative to src/client,
// the module may import from outside itself. Every module may also use the
// shared paths in `sharedForModules`.
export const featureModules = [
  {
    dir: 'space-map',
    title: 'Space map',
    description: 'Stjärnkartespelet: galax, ekonomi, flottor och turer.',
    depths: [2, 3],
    allowed: ['app/models/PlayerNotice\\.js$'],
  },
  {
    dir: 'space-battle',
    title: 'Space battle',
    description: 'Den taktiska rymdstriden på hexrutnät.',
    depths: [2],
    allowed: [],
  },
  {
    dir: 'boarding',
    title: 'Boarding',
    description: 'Bordningsstriden inne i ett skepp och dess karteditor.',
    depths: [2, 3],
    allowed: ['app/views/playerNoticeText\\.js$', '\\.\\./shared/boarding/'],
  },
];

export const sharedForModules = [
  'app/models/AppModel\\.js$',
  'app/views/ViewContracts\\.js$',
  'common/',
  `(${featureModules.map(({ dir }) => dir).join('|')})/(models|views)/index\\.js$`,
];

// Areas of src/client outside the feature modules, as drawn in the overview.
export const shellAreas = [
  {
    dir: 'app',
    title: 'App shell',
    description:
      'Master-controller, AppModel och AppView som binder ihop modulerna.',
  },
  {
    dir: 'common',
    title: 'Common',
    description: 'Generisk kod utan spelkunskap.',
  },
];
