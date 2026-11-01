import { describe, expect, it } from 'vitest';
import transportMap from '../../src/client/maps/transport-boarding.txt?raw';
import {
  BoardingMap,
  parseBoardingMap,
} from '../../src/client/models/BoardingMap.js';

describe('datadriven-bordningskarta', () => {
  it('parses the editable transport layers into immutable domain data', () => {
    const map = parseBoardingMap(transportMap);
    expect(map).toBeInstanceOf(BoardingMap);
    expect(map.name).toBe('Transport boarding');
    expect(map.width).toBe(17);
    expect(map.height).toBe(11);
    expect(map.spawns.player).toHaveLength(4);
    expect(map.spawns.defender).toHaveLength(3);
    expect(map.spawns.civilian).toHaveLength(3);
    expect(map.features.filter((feature) => feature.kind === 'door')).toHaveLength(
      2,
    );
    expect(map.features.some((feature) => feature.kind === 'reactor')).toBe(true);
    expect(map.features.filter((feature) => feature.kind === 'exit')).toHaveLength(
      3,
    );
    expect(map.roomAt({ q: 1, r: 1 })).toBe('bridge');
    expect(map.roomAt({ q: 11, r: 1 })).toBe('engineering');
    expect(Object.isFrozen(map.features)).toBe(true);
  });

  it('reports the layer and row when a hand-edited map has the wrong width', () => {
    const broken = transportMap.replace(
      'H.......#.......H',
      'H......#.......H',
    );
    expect(() => parseBoardingMap(broken)).toThrow(
      /terrain row 2.*expected 17/i,
    );
  });

  it('rejects unknown symbols with an exact location', () => {
    const broken = transportMap.replace('-------------R---', '-------------?---');
    expect(() => parseBoardingMap(broken)).toThrow(/objects.*row 3.*column 14/i);
  });
});
