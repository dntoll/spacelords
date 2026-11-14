import assert from 'node:assert/strict';
import { test } from 'node:test';
import { featureModules, shellAreas } from '../../architecture.config.mjs';
import {
  buildDiagrams,
  outputDirectory,
  staleDiagrams,
} from '../../scripts/architecture-map.mjs';

test('arkitekturkarta: the diagrams in docs/architecture match the code', () => {
  assert.deepEqual(
    staleDiagrams(),
    [],
    'Run npm run architecture:map and commit docs/architecture.',
  );
});

test('arkitekturkarta: every module and shell area has a node and a level 2 diagram', () => {
  const diagrams = buildDiagrams();
  const overview = diagrams.get(`${outputDirectory}/overview.puml`);
  for (const { dir } of [...shellAreas, ...featureModules]) {
    assert.match(overview, new RegExp(` as ${dir.replace(/-/g, '_')}$`, 'm'));
    if (dir !== 'common')
      assert.ok(diagrams.has(`${outputDirectory}/${dir}.puml`), dir);
  }
});

test('arkitekturkarta: the overview draws real imports, dashed when they are type-only', () => {
  const overview = buildDiagrams().get(`${outputDirectory}/overview.puml`);
  // Game creates TacticalBattle instances: a value import.
  assert.match(overview, /^space_map --> space_battle : models$/m);
  // The space battle only needs AppModel and ViewContracts as types.
  assert.match(overview, /^space_battle \.\.> app : .*typer$/m);
  // common/ imports nothing, so it has no outgoing arrows.
  assert.doesNotMatch(overview, /^common (-->|\.\.>)/m);
});
