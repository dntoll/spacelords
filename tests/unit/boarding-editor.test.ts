import { describe, expect, it } from 'vitest';
import pirateMap from '../../src/client/maps/pirate-boarding.txt?raw';
import colonyMap from '../../src/client/maps/colony-boarding.txt?raw';
import { BoardingEditor } from '../../src/client/models/BoardingEditor.js';
import { parseBoardingMapText } from '../../src/client/models/BoardingMap.js';
import { boardingEditorCellAt } from '../../src/client/views/BoardingEditorPick.js';
import {
  boardingIsoCamera,
  boardingIsoCenter,
} from '../../src/client/views/BoardingProjection.js';

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
});

describe('isometrisk-bordningskarteditor', () => {
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
