import { describe, expect, it } from 'vitest';
import {
  BoardingEditor,
  boardingShipAxisY,
  spriteZoomAlongAxis,
} from '../../../src/client/boarding/models/editor/BoardingEditor.js';

// Fixture map: the shipped maps are edited freely, so these tests own theirs.
function fixtureMap(meta = ''): string {
  return [
    '[meta]',
    'name=Axis fixture',
    'width=10',
    'height=6',
    'rules=campaign',
    meta,
    '',
    '[terrain]',
    'HHHHHHHHHH',
    'H........H',
    'H........H',
    'H........H',
    'H........H',
    'HHHHHHHHHH',
    '',
    '[objects]',
    '----------',
    '----------',
    '--------A-',
    '----R-----',
    '----------',
    '----------',
    '',
    '[rooms]',
    '----------',
    '----------',
    '----------',
    '----------',
    '----------',
    '----------',
    '',
    '[spawns]',
    '----------',
    '-----D----',
    '-----D----',
    '-----D----',
    '----------',
    '----------',
    '',
  ].join('\n');
}

/** Where the picture's middle line falls, in cells from the top of the map. */
function pictureMiddle(editor: BoardingEditor, aspect: number): number {
  const { sprite } = editor.snapshot;
  return sprite.y + (sprite.scale * aspect) / 2;
}

describe('skeppsbild-last-till-skeppsaxeln', () => {
  it('runs the ship axis along the middle of the map', () => {
    expect(boardingShipAxisY(6)).toBe(3);
    expect(boardingShipAxisY(11)).toBe(5.5);
  });

  it('slides the picture only along the ship axis', () => {
    const editor = new BoardingEditor('pirate', fixtureMap());
    editor.setPictureAspect(0.5);
    expect(editor.setSpriteTransform({ x: 2, scale: 8 })).toBe(true);
    expect(editor.snapshot.sprite).toEqual({ x: 2, y: 1, scale: 8 });
    expect(editor.setSpriteTransform({ x: -1.5, scale: 8 })).toBe(true);
    expect(editor.snapshot.sprite.x).toBe(-1.5);
    expect(pictureMiddle(editor, 0.5)).toBe(3);
  });

  it('stays centred on the axis when the picture is zoomed', () => {
    const editor = new BoardingEditor('pirate', fixtureMap());
    editor.setPictureAspect(0.5);
    editor.setSpriteTransform({ x: 2, scale: 8 });
    editor.setSpriteTransform(
      spriteZoomAlongAxis(editor.snapshot.sprite, 6, 2),
    );
    expect(editor.snapshot.sprite.scale).toBe(16);
    expect(pictureMiddle(editor, 0.5)).toBe(3);
  });

  it('zooms around the point under the pointer and keeps it there at the size limit', () => {
    expect(spriteZoomAlongAxis({ x: 2, scale: 8 }, 6, 2)).toEqual({
      x: -2,
      scale: 16,
    });
    const capped = spriteZoomAlongAxis({ x: 0, scale: 100 }, 50, 2);
    expect(capped.scale).toBe(128);
    // The anchor stays at the same fraction across the picture.
    expect((50 - capped.x) / capped.scale).toBeCloseTo(0.5);
    expect(spriteZoomAlongAxis({ x: 0, scale: 1 }, 0, 0.5).scale).toBe(1);
  });

  it('snaps an off-axis picture to the axis as one undoable step when alignment starts', () => {
    const editor = new BoardingEditor(
      'pirate',
      fixtureMap('spriteX=-1\nspriteY=-5\nspriteScale=12'),
    );
    editor.setPictureAspect(0.5);
    expect(editor.snapshot.dirty).toBe(false);
    editor.setAdjustSprite(true);
    expect(editor.snapshot.sprite).toEqual({ x: -1, y: 0, scale: 12 });
    expect(editor.snapshot.dirty).toBe(true);
    expect(editor.undo()).toBe(true);
    expect(editor.snapshot.sprite.y).toBe(-5);
  });

  it('leaves a picture that is already on the axis untouched when alignment starts', () => {
    const editor = new BoardingEditor(
      'pirate',
      fixtureMap('spriteX=-1\nspriteY=0\nspriteScale=12'),
    );
    editor.setPictureAspect(0.5);
    editor.setAdjustSprite(true);
    expect(editor.snapshot.dirty).toBe(false);
    expect(editor.snapshot.canUndo).toBe(false);
  });

  it('follows the axis when the map changes height and undoes both together', () => {
    const editor = new BoardingEditor(
      'pirate',
      fixtureMap('spriteX=-1\nspriteY=0\nspriteScale=12'),
    );
    editor.setPictureAspect(0.5);
    expect(editor.resize(10, 8)).toBe(true);
    expect(pictureMiddle(editor, 0.5)).toBe(4);
    expect(editor.undo()).toBe(true);
    expect(editor.snapshot.height).toBe(6);
    expect(editor.snapshot.sprite.y).toBe(0);
  });

  it('keeps the saved height of the picture until its proportions are known', () => {
    const editor = new BoardingEditor(
      'pirate',
      fixtureMap('spriteX=-1\nspriteY=-5\nspriteScale=12'),
    );
    editor.setSpriteTransform({ x: 3, scale: 12 });
    expect(editor.snapshot.sprite).toEqual({ x: 3, y: -5, scale: 12 });
  });

  it('forgets the picture proportions when another ship is loaded', () => {
    const editor = new BoardingEditor('pirate', fixtureMap());
    editor.setPictureAspect(0.5);
    editor.load('colony', fixtureMap('spriteX=-1\nspriteY=-5\nspriteScale=12'));
    editor.setSpriteTransform({ x: 3, scale: 12 });
    expect(editor.snapshot.sprite.y).toBe(-5);
  });

  it('ignores proportions that cannot describe a picture', () => {
    const editor = new BoardingEditor(
      'pirate',
      fixtureMap('spriteX=-1\nspriteY=-5\nspriteScale=12'),
    );
    editor.setPictureAspect(0);
    editor.setPictureAspect(Number.NaN);
    editor.setSpriteTransform({ x: 3, scale: 12 });
    expect(editor.snapshot.sprite.y).toBe(-5);
  });
});
