import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import pirateMap from '../../src/client/maps/pirate-boarding.txt?raw';
import {
  formatBoardingMap,
  parseBoardingMapText,
} from '../../src/shared/boarding-map-format.js';
import { BoardingMapsModel } from '../../src/server/models/BoardingMapsModel.js';

const directories: string[] = [];

function mapsDir(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'spacelords-maps-'));
  directories.push(directory);
  writeFileSync(path.join(directory, 'pirate-boarding.txt'), pirateMap);
  return directory;
}

afterEach(() => {
  while (directories.length) {
    const directory = directories.pop();
    if (directory) rmSync(directory, { recursive: true, force: true });
  }
});

describe('lokal-bordningskarteditor', () => {
  it('lists, reads and writes a whitelisted map in a temp directory', () => {
    const directory = mapsDir();
    const model = new BoardingMapsModel(directory);
    expect(model.list()).toEqual([{ id: 'pirate', name: 'Space pirate' }]);
    expect(model.read('pirate')).toContain('name=Space pirate');
    const edited = parseBoardingMapText(pirateMap);
    const source = formatBoardingMap({
      ...edited,
      spriteX: 1,
      spriteY: 2,
      spriteScale: 8,
    });
    model.write('pirate', source);
    expect(
      readFileSync(path.join(directory, 'pirate-boarding.txt'), 'utf8'),
    ).toContain('spriteX=1');
    expect(model.read('pirate')).toContain('spriteScale=8');
    expect(model.read('pirate')).toContain('[lights]');
    expect(model.read('pirate')).toContain('----L----');
  });

  it('rejects unknown ids and path traversal', () => {
    const model = new BoardingMapsModel(mapsDir());
    expect(() => model.read('../pirate')).toThrow('Unknown boarding map.');
    expect(() => model.read('missing')).toThrow('Unknown boarding map.');
    expect(() => model.write('pirate', 'not a map')).toThrow(
      /Missing \[terrain]/,
    );
  });
});
