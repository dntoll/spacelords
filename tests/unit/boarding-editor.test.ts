import { describe, expect, it } from 'vitest';
import pirateMap from '../../src/client/maps/pirate-boarding.txt?raw';
import colonyMap from '../../src/client/maps/colony-boarding.txt?raw';
import { BoardingEditor } from '../../src/client/models/boarding/BoardingEditor.js';
import { parseBoardingMapText } from '../../src/shared/boarding-map-format.js';
import { parseBoardingMap } from '../../src/client/models/boarding/BoardingMap.js';
import { boardingEditorCellAt } from '../../src/client/views/boarding/BoardingEditorPick.js';
import {
  boardingIsoCamera,
  boardingIsoCenter,
  boardingSpritePlaneTransform,
} from '../../src/client/views/boarding/BoardingProjection.js';

describe('lokal-bordningskarteditor', () => {
  it('paints left and right brushes on independent layers', () => {
    const editor = new BoardingEditor('pirate', pirateMap);
    editor.bindTool('primary', { layer: 'terrain', symbol: 'H' });
    editor.bindTool('secondary', { layer: 'objects', symbol: 'D' });
    expect(editor.paintStroke('primary', [{ q: 4, r: 2 }])).toBe(true);
    expect(editor.paintStroke('secondary', [{ q: 4, r: 2 }])).toBe(true);
    expect(editor.snapshot.layers.terrain[2]![4]).toBe('H');
    expect(editor.snapshot.layers.objects[2]![4]).toBe('D');
    expect(editor.snapshot.layers.rooms[2]![4]).toBe('-');
  });

  it('undoes a paint stroke as one command and redo restores it', () => {
    const editor = new BoardingEditor('pirate', pirateMap);
    editor.bindTool('primary', { layer: 'terrain', symbol: 'H' });
    const before = parseBoardingMapText(pirateMap).terrain[2]!.slice(3, 5);
    editor.paintStroke('primary', [
      { q: 3, r: 2 },
      { q: 4, r: 2 },
      { q: 4, r: 2 },
    ]);
    expect(editor.snapshot.layers.terrain[2]!.slice(3, 5)).toBe('HH');
    expect(editor.undo()).toBe(true);
    expect(editor.snapshot.layers.terrain[2]!.slice(3, 5)).toBe(before);
    expect(editor.redo()).toBe(true);
    expect(editor.snapshot.layers.terrain[2]!.slice(3, 5)).toBe('HH');
  });

  it('loads maps of different sizes and grows with hull', () => {
    const editor = new BoardingEditor('pirate', pirateMap);
    expect(editor.snapshot.width).toBe(9);
    editor.load('colony', colonyMap);
    expect(editor.snapshot.width).toBe(13);
    expect(editor.snapshot.height).toBe(9);
    expect(editor.snapshot.canUndo).toBe(false);
    expect(editor.resize(14, 9)).toBe(true);
    expect(editor.snapshot.width).toBe(14);
    expect(editor.snapshot.layers.terrain[1]![13]).toBe('H');
    expect(editor.snapshot.layers.objects[1]![13]).toBe('-');
    expect(editor.undo()).toBe(true);
    expect(editor.snapshot.width).toBe(13);
    expect(editor.snapshot.layers.terrain[1]).toHaveLength(13);
  });

  it('undoes a sprite pan and scale as one transform', () => {
    const editor = new BoardingEditor('pirate', pirateMap);
    expect(editor.setSpriteTransform({ x: 2.5, y: -1, scale: 11 })).toBe(true);
    expect(editor.snapshot.sprite).toEqual({ x: 2.5, y: -1, scale: 11 });
    expect(editor.source()).toContain('spriteX=2.5');
    expect(editor.undo()).toBe(true);
    expect(editor.snapshot.sprite).toEqual({ x: 0, y: 0, scale: 9 });
    expect(editor.source()).not.toContain('spriteX=');
  });

  it('keeps lights and the other layers when the map is saved', () => {
    const editor = new BoardingEditor('colony', colonyMap);
    const before = parseBoardingMapText(colonyMap);
    editor.bindTool('primary', { layer: 'terrain', symbol: 'H' });
    expect(editor.paintStroke('primary', [{ q: 2, r: 2 }])).toBe(true);
    editor.resize(14, 9);
    const saved = parseBoardingMapText(editor.source());
    expect(editor.source()).toContain('[lights]');
    expect(saved.campaign).toBe(before.campaign);
    expect(saved.name).toBe(before.name);
    expect(saved.spriteX).toBe(before.spriteX ?? 0);
    expect(saved.spriteY).toBe(before.spriteY ?? 0);
    expect(saved.spriteScale).toBe(before.spriteScale ?? before.width);
    expect(saved.objects.map((row) => row.slice(0, before.width))).toEqual([
      ...before.objects,
    ]);
    expect(saved.rooms.map((row) => row.slice(0, before.width))).toEqual([
      ...before.rooms,
    ]);
    expect(saved.spawns.map((row) => row.slice(0, before.width))).toEqual([
      ...before.spawns,
    ]);
    expect(saved.lights?.map((row) => row.slice(0, before.width))).toEqual(
      before.lights ? [...before.lights] : null,
    );
    expect(saved.lights?.[1]).toHaveLength(14);
    expect(saved.terrain[2]![2]).toBe('H');
  });
});

describe('formbar-skeppskontur / redigerbara-bordningslampor', () => {
  const source =
    '[meta]\nwidth=3\nheight=2\nrules=campaign\n[terrain]\n...\nHHH\n[objects]\n-R-\n---\n[rooms]\n-B-\n---\n[spawns]\n-P-\n---\n[lights]\n-L-\n---\n';

  it('clears all content on Outside and restores it with a single undo', () => {
    const editor = new BoardingEditor('pirate', source);
    editor.bindTool('primary', { layer: 'terrain', symbol: 'O' });
    expect(editor.paintStroke('primary', [{ q: 1, r: 0 }])).toBe(true);
    const saved = parseBoardingMapText(editor.source());
    expect(saved.terrain[0]).toBe('.O.');
    expect([
      saved.objects[0],
      saved.rooms[0],
      saved.spawns[0],
      saved.lights?.[0],
    ]).toEqual(['---', '---', '---', '---']);
    expect(
      parseBoardingMap(editor.source()).terrainAt({ q: 1, r: 0 }),
    ).toBeNull();
    const map = parseBoardingMap(editor.source());
    expect(map.contains({ q: 1, r: 0 })).toBe(false);
    expect(
      map.features.some(
        (feature) => feature.position.q === 1 && feature.position.r === 0,
      ),
    ).toBe(false);
    editor.undo();
    expect(parseBoardingMapText(editor.source()).lights?.[0]).toBe('-L-');
    expect(editor.snapshot.layers.objects[0]).toBe('-R-');
  });

  it('places lights only on floor and restores them when a wall stroke is undone', () => {
    const editor = new BoardingEditor('pirate', source);
    editor.bindTool('primary', { layer: 'lights', symbol: 'L' });
    expect(editor.paintStroke('primary', [{ q: 0, r: 1 }])).toBe(false);
    expect(editor.paintStroke('primary', [{ q: 0, r: 0 }])).toBe(true);
    editor.bindTool('primary', { layer: 'terrain', symbol: '#' });
    editor.paintStroke('primary', [{ q: 0, r: 0 }]);
    expect(parseBoardingMapText(editor.source()).lights?.[0]).toBe('-L-');
    editor.undo();
    expect(parseBoardingMapText(editor.source()).lights?.[0]).toBe('LL-');
  });

  it('preserves an absent optional light layer after undoing its first lamp', () => {
    const editor = new BoardingEditor(
      'pirate',
      source.replace('[lights]\n-L-\n---\n', ''),
    );
    editor.bindTool('primary', { layer: 'lights', symbol: 'L' });
    editor.paintStroke('primary', [{ q: 0, r: 0 }]);
    expect(parseBoardingMapText(editor.source()).lights?.[0]).toBe('L--');
    editor.undo();
    expect(parseBoardingMapText(editor.source()).lights).toBeNull();
    editor.redo();
    expect(parseBoardingMapText(editor.source()).lights?.[0]).toBe('L--');
  });
});

describe('isometrisk-bordningskarteditor', () => {
  it('isometrisk-skeppsreferens: aligns the sprite plane with both axes of the cell grid', () => {
    const [a, b, c, d, x, y] = boardingSpritePlaneTransform();
    expect([x, y]).toEqual([0, -16]);
    expect([a, b]).toEqual([32, 16]);
    expect([c, d]).toEqual([-32, 16]);
  });
  it('defaults to isometric and switches to top-down for sprite adjustment', () => {
    const editor = new BoardingEditor('pirate', pirateMap);
    expect(editor.snapshot.projection).toBe('isometric');
    editor.setProjection('top-down');
    expect(editor.snapshot.projection).toBe('top-down');
    editor.setAdjustSprite(true);
    expect(editor.snapshot.projection).toBe('top-down');
    editor.setProjection('isometric');
    expect(editor.snapshot.projection).toBe('isometric');
    expect(editor.snapshot.adjustSprite).toBe(false);
  });

  it('maps an isometric screen point to the same cell as combat', () => {
    const map = { width: 9, height: 5 };
    const camera = boardingIsoCamera(map, { width: 800, height: 400 });
    const center = boardingIsoCenter({ q: 4, r: 2 });
    const point = {
      x: camera.offset.x + center.x * camera.scale,
      y: camera.offset.y + center.y * camera.scale,
    };
    expect(boardingEditorCellAt('isometric', point, camera, map)).toEqual({
      q: 4,
      r: 2,
    });
    expect(
      boardingEditorCellAt(
        'top-down',
        { x: 24 + 36 * 4 + 10, y: 24 + 36 * 2 + 10 },
        { offset: { x: 24, y: 24 }, scale: 1 },
        map,
      ),
    ).toEqual({ q: 4, r: 2 });
  });
});
