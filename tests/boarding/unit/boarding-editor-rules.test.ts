import { describe, expect, it } from 'vitest';
import { BoardingEditor } from '../../../src/client/boarding/models/editor/BoardingEditor.js';
import { boardingEditorStrokePreview } from '../../../src/client/boarding/models/editor/BoardingEditor.js';
import {
  editorPressMovesView,
  editorScaleSpriteAround,
  editorWheelZoomFactor,
} from '../../../src/client/boarding/views/editor/BoardingEditorPick.js';

// A fixture ship, independent of the layouts edited in the map editor.
const fixture = (terrain: string[], objects: string[], rooms?: string[]) => {
  const blank = terrain.map((row) => '-'.repeat(row.length)).join('\n');
  return (
    `[meta]\nname=Fixture\nwidth=${terrain[0]!.length}\nheight=${terrain.length}\nrules=campaign\n` +
    `[terrain]\n${terrain.join('\n')}\n[objects]\n${objects.join('\n')}\n` +
    `[rooms]\n${(rooms ?? []).join('\n') || blank}\n[spawns]\n${blank}\n`
  );
};

const SHIP = fixture(
  ['OOOOOOO', 'HHHHHHH', 'H..#..H', 'H..#..H', 'HHHHHHH', 'OOOOOOO'],
  ['-------', '-------', '-------', '-------', '---A---', '-------'],
);

const requirement = (editor: BoardingEditor, id: string) =>
  editor.snapshot.requirements.find((entry) => entry.id === id)?.met;

describe('foremal-lagger-golv', () => {
  it('turns the cell under a new object into floor and undoes both together', () => {
    const editor = new BoardingEditor('pirate', SHIP);
    editor.bindTool('primary', { layer: 'objects', symbol: 'D' });
    expect(editor.paintStroke('primary', [{ q: 3, r: 2 }])).toBe(true);
    expect(editor.snapshot.layers.terrain[2]![3]).toBe('.');
    expect(editor.snapshot.layers.objects[2]![3]).toBe('D');
    editor.undo();
    expect(editor.snapshot.layers.terrain[2]![3]).toBe('#');
    expect(editor.snapshot.layers.objects[2]![3]).toBe('-');
  });

  it('places no object in open space and clears an object when its floor becomes wall', () => {
    const editor = new BoardingEditor('pirate', SHIP);
    editor.bindTool('primary', { layer: 'objects', symbol: 'C' });
    expect(editor.paintStroke('primary', [{ q: 0, r: 0 }])).toBe(false);
    editor.paintStroke('primary', [{ q: 1, r: 2 }]);
    editor.bindTool('primary', { layer: 'terrain', symbol: '#' });
    editor.paintStroke('primary', [{ q: 1, r: 2 }]);
    expect(editor.snapshot.layers.objects[2]![1]).toBe('-');
  });

  it('shows the floor in the stroke preview before release', () => {
    const editor = new BoardingEditor('pirate', SHIP);
    editor.bindTool('primary', { layer: 'objects', symbol: 'R' });
    const preview = boardingEditorStrokePreview(editor.snapshot, 'primary', [
      { q: 3, r: 3 },
    ]);
    expect(preview.layers.terrain[3]![3]).toBe('.');
    expect(preview.layers.objects[3]![3]).toBe('R');
  });
});

describe('fast-airlock-i-bordningskarta', () => {
  it('moves the one airlock along the hull edge and restores the hull it leaves', () => {
    const editor = new BoardingEditor('pirate', SHIP);
    editor.bindTool('primary', { layer: 'objects', symbol: 'A' });
    expect(editor.paintStroke('primary', [{ q: 1, r: 1 }])).toBe(true);
    const { terrain, objects } = editor.snapshot.layers;
    expect(objects.join('').split('A')).toHaveLength(2);
    expect(objects[1]![1]).toBe('A');
    expect(terrain[1]![1]).toBe('.');
    expect(terrain[4]![3]).toBe('H');
    expect(objects[4]![3]).toBe('-');
    expect(requirement(editor, 'airlock-on-hull-edge')).toBe(true);
  });

  it('refuses an airlock inside the ship or one that would be erased', () => {
    const editor = new BoardingEditor('pirate', SHIP);
    editor.bindTool('primary', { layer: 'objects', symbol: 'A' });
    expect(editor.paintStroke('primary', [{ q: 2, r: 2 }])).toBe(false);
    editor.bindTool('primary', { layer: 'objects', symbol: '-' });
    expect(editor.paintStroke('primary', [{ q: 3, r: 4 }])).toBe(false);
    editor.bindTool('primary', { layer: 'terrain', symbol: 'H' });
    expect(editor.paintStroke('primary', [{ q: 3, r: 4 }])).toBe(false);
    // Nothing may block the open space outside it.
    expect(editor.paintStroke('primary', [{ q: 3, r: 5 }])).toBe(false);
    expect(editor.snapshot.layers.objects[4]![3]).toBe('A');
  });

  it('places a missing airlock and drops extra ones when a layout is opened', () => {
    const editor = new BoardingEditor(
      'pirate',
      fixture(
        ['HHHHH', 'H...H', 'H...H', 'HHHHH'],
        ['-----', '-A---', '---A-', '-----'],
      ),
    );
    const { objects, terrain } = editor.snapshot.layers;
    expect(objects.join('').split('A')).toHaveLength(2);
    expect(objects[3]![2]).toBe('A');
    expect(terrain[3]![2]).toBe('.');
    expect(editor.snapshot.dirty).toBe(true);
    expect(requirement(editor, 'one-airlock')).toBe(true);
  });

  it('keeps open space outside a bottom airlock when the grid grows', () => {
    const editor = new BoardingEditor('pirate', SHIP);
    editor.resize(7, 8);
    expect(editor.snapshot.layers.terrain[7]![3]).toBe('O');
    expect(requirement(editor, 'airlock-on-hull-edge')).toBe(true);
  });
});

describe('kravlista-i-bordningseditor', () => {
  it('reports a blocked airlock entry and missing defenders', () => {
    const editor = new BoardingEditor('pirate', SHIP);
    // The fixture has a wall just inside the airlock.
    expect(requirement(editor, 'airlock-entry')).toBe(false);
    editor.bindTool('primary', { layer: 'terrain', symbol: '.' });
    editor.paintStroke('primary', [{ q: 3, r: 3 }]);
    expect(requirement(editor, 'airlock-entry')).toBe(true);
    expect(requirement(editor, 'defender-spawn')).toBe(false);
    editor.bindTool('primary', { layer: 'objects', symbol: 'C' });
    editor.paintStroke('primary', [{ q: 3, r: 3 }]);
    expect(requirement(editor, 'airlock-entry')).toBe(false);
    editor.bindTool('primary', { layer: 'spawns', symbol: 'D' });
    editor.paintStroke('primary', [{ q: 1, r: 2 }]);
    expect(requirement(editor, 'defender-spawn')).toBe(true);
  });
});

describe('fyll-rum-i-editor', () => {
  it('fills the floor enclosed by walls and doors with one stroke', () => {
    const editor = new BoardingEditor(
      'pirate',
      fixture(
        ['HHHHHHH', 'H..#..H', 'H.....H', 'HHHHHHH'],
        ['-------', '-------', '---D---', '---A---'],
      ),
    );
    editor.bindTool('primary', { layer: 'rooms', symbol: 'B' });
    editor.setFillRooms(true);
    expect(editor.snapshot.fillRooms).toBe(true);
    expect(editor.paintStroke('primary', [{ q: 1, r: 1 }])).toBe(true);
    expect(editor.snapshot.layers.rooms.slice(1, 3)).toEqual([
      '-BB----',
      '-BB----',
    ]);
    editor.undo();
    expect(editor.snapshot.layers.rooms[1]).toBe('-------');
    editor.setFillRooms(false);
    editor.paintStroke('primary', [{ q: 1, r: 1 }]);
    expect(editor.snapshot.layers.rooms[2]).toBe('-------');
  });
});

describe('kamera-utan-lage-i-editor', () => {
  it('moves the view without a mode switch and paints otherwise', () => {
    const press = { button: 0, spaceHeld: false, pointers: 1, onGrid: true };
    expect(editorPressMovesView(press)).toBe(false);
    expect(editorPressMovesView({ ...press, button: 2 })).toBe(false);
    expect(editorPressMovesView({ ...press, button: 1 })).toBe(true);
    expect(editorPressMovesView({ ...press, spaceHeld: true })).toBe(true);
    expect(editorPressMovesView({ ...press, pointers: 2 })).toBe(true);
    expect(editorPressMovesView({ ...press, onGrid: false })).toBe(true);
  });

  it('zooms in proportion to the wheel and keeps each step bounded', () => {
    const wheel = { deltaMode: 0, ctrlKey: false };
    const small = editorWheelZoomFactor({ ...wheel, deltaY: -4 });
    const notch = editorWheelZoomFactor({ ...wheel, deltaY: -100 });
    expect(small).toBeGreaterThan(1);
    expect(small).toBeLessThan(1.01);
    expect(notch).toBeGreaterThan(small);
    expect(editorWheelZoomFactor({ ...wheel, deltaY: 100 })).toBeLessThan(1);
    expect(editorWheelZoomFactor({ ...wheel, deltaY: -1e6 })).toBe(2);
    expect(
      editorWheelZoomFactor({ deltaMode: 1, ctrlKey: false, deltaY: -3 }),
    ).toBeCloseTo(editorWheelZoomFactor({ ...wheel, deltaY: -48 }));
  });
});

describe('skalbar-skeppsbild-i-editor', () => {
  it('resizes the ship image around a fixed point and within limits', () => {
    const sprite = { x: -2, y: -1, scale: 10 };
    const anchor = { x: 3, y: 1 };
    const grown = editorScaleSpriteAround(sprite, 20, anchor);
    expect(grown.scale).toBe(20);
    // The anchor stays on the same fraction of the image.
    expect((anchor.x - grown.x) / grown.scale).toBeCloseTo(
      (anchor.x - sprite.x) / sprite.scale,
    );
    expect((anchor.y - grown.y) / grown.scale).toBeCloseTo(
      (anchor.y - sprite.y) / sprite.scale,
    );
    expect(editorScaleSpriteAround(sprite, 0.1, anchor).scale).toBe(1);
    expect(editorScaleSpriteAround(sprite, 1000, anchor).scale).toBe(128);
  });
});
