// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import pirateMap from '../../src/client/maps/pirate-boarding.txt?raw';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppView } from '../../src/client/views/AppView.js';
import { BoardingEditorView } from '../../src/client/views/boarding/BoardingEditorView.js';
import type {
  AppIntent,
  MapFactory,
} from '../../src/client/views/ViewContracts.js';

let root: HTMLElement;
const mapFactory: MapFactory = () => ({
  render: () => undefined,
  dispose: () => undefined,
});
const editorMap = () => ({
  render: () => undefined,
  dispose: () => undefined,
});

beforeEach(() => {
  document.body.replaceChildren();
  root = document.createElement('div');
  document.body.append(root);
});

function click(label: string): void {
  const button = [...root.querySelectorAll('button')].find(
    (candidate) =>
      candidate.textContent === label ||
      candidate.getAttribute('aria-label') === label,
  );
  expect(button).toBeDefined();
  button?.click();
}

describe('lokal-bordningskarteditor', () => {
  it('hides Ship layouts until the local map catalog is available', () => {
    const model = new AppModel();
    const view = new AppView(root, mapFactory);
    view.render(model.snapshot);
    expect(root.querySelector('[aria-label="Ship layouts"]')).toBeNull();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    view.render(model.snapshot);
    expect(root.querySelector('[aria-label="Ship layouts"]')).not.toBeNull();
  });

  it('binds left and right palette tiles, paints, resizes, undoes and asks before switching ship', () => {
    const model = new AppModel();
    model.setEditorCatalog([
      { id: 'pirate', name: 'Space pirate' },
      { id: 'colony', name: 'Colony ship' },
    ]);
    model.openEditor('pirate', pirateMap);
    const view = new BoardingEditorView(
      root,
      (intent: AppIntent) => {
        if (intent.type === 'editor-bind-tool')
          model.editorBindTool(intent.button, intent.tool);
        else if (intent.type === 'editor-paint')
          model.editorPaint(intent.button, intent.cells);
        else if (intent.type === 'editor-resize')
          model.editorResize(intent.width, intent.height);
        else if (intent.type === 'editor-undo') model.editorUndo();
        else if (intent.type === 'editor-adjust-sprite')
          model.editorAdjustSprite(intent.value);
        else if (intent.type === 'editor-projection')
          model.editorProjection(intent.value);
        else if (intent.type === 'editor-select-map')
          model.requestEditorMap(intent.id);
        view.render(model.snapshot);
      },
      editorMap,
    );
    view.render(model.snapshot);
    expect(root.querySelector('.boarding-editor-page')).not.toBeNull();
    expect(root.querySelector('[aria-label="Ship"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Width"]')).not.toBeNull();
    const viewMode = root.querySelector<HTMLSelectElement>(
      '[aria-label="View"]',
    );
    expect(viewMode?.value).toBe('isometric');
    viewMode!.value = 'top-down';
    viewMode!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model.snapshot.editor?.projection).toBe('top-down');

    click('Floor');
    const door = [...root.querySelectorAll('button')].find(
      (candidate) => candidate.getAttribute('aria-label') === 'Door',
    );
    door?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
    expect(model.snapshot.editor?.primary).toEqual({
      layer: 'terrain',
      symbol: '.',
    });
    expect(model.snapshot.editor?.secondary).toEqual({
      layer: 'objects',
      symbol: 'D',
    });

    model.editorPaint('secondary', [{ q: 4, r: 2 }]);
    view.render(model.snapshot);
    expect(model.snapshot.editor?.layers.objects[2]![4]).toBe('D');
    click('Undo');
    expect(model.snapshot.editor?.layers.objects[2]![4]).toBe('-');

    const width = root.querySelector<HTMLInputElement>('[aria-label="Width"]');
    width!.value = '10';
    width!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model.snapshot.editor?.width).toBe(10);

    click('Adjust sprite');
    expect(model.snapshot.editor?.adjustSprite).toBe(true);

    const ship = root.querySelector<HTMLSelectElement>('[aria-label="Ship"]');
    ship!.value = 'colony';
    ship!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(model.snapshot.pendingEditorDiscard).toBe('colony');
    expect(root.querySelector('dialog')?.textContent).toContain('Discard');
  });
});

describe('isometrisk-bordningskarteditor', () => {
  it('opens in isometric view and returns to top-down when adjusting the sprite', () => {
    const model = new AppModel();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    model.openEditor('pirate', pirateMap);
    const view = new BoardingEditorView(
      root,
      (intent: AppIntent) => {
        if (intent.type === 'editor-projection')
          model.editorProjection(intent.value);
        else if (intent.type === 'editor-adjust-sprite')
          model.editorAdjustSprite(intent.value);
        view.render(model.snapshot);
      },
      editorMap,
    );
    view.render(model.snapshot);
    expect(
      root.querySelector<HTMLSelectElement>('[aria-label="View"]')?.value,
    ).toBe('isometric');
    click('Adjust sprite');
    expect(model.snapshot.editor?.projection).toBe('top-down');
    expect(model.snapshot.editor?.adjustSprite).toBe(true);
  });
});
