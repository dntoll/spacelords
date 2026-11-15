// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import pirateMap from '../../fixtures/boarding/pirate-boarding-fixture.txt?raw';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { BoardingEditorView } from '../../../src/client/boarding/views/editor/BoardingEditorView.js';
import type {
  AppIntent,
  MapFactory,
} from '../../../src/client/app/views/ViewContracts.js';

let root: HTMLElement;
const mapFactory: MapFactory = () => ({
  render: () => undefined,
  dispose: () => undefined,
});
const editorMap = () => ({
  render: () => undefined,
  dispose: () => undefined,
  fitView: () => undefined,
  resizeSprite: () => undefined,
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
  it('kategoriserad-bordningspalett: groups tools and describes their use', () => {
    const model = new AppModel();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    model.openEditor('pirate', pirateMap);
    const view = new BoardingEditorView(root, () => undefined, editorMap);
    view.render(model.snapshot);
    for (const label of ['Terrain', 'Objects', 'Rooms', 'Spawns', 'Lighting'])
      expect(
        root.querySelector(`section[aria-label="${label}"]`),
      ).not.toBeNull();
    expect(
      root.querySelector<HTMLButtonElement>('[aria-label="Outside"]')?.title,
    ).toContain('Outside');
    expect(
      root.querySelector<HTMLButtonElement>('[aria-label="Ceiling light"]')
        ?.title,
    ).toContain('Ceiling light');
    view.dispose();
  });
  it('sammanfogade-tunna-vaggar: offers one thin wall tool per height', () => {
    const model = new AppModel();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    model.openEditor('pirate', pirateMap);
    const view = new BoardingEditorView(root, () => undefined, editorMap);
    view.render(model.snapshot);
    const terrain = [
      ...root.querySelectorAll('section[aria-label="Terrain"] button'),
    ].map((button) => button.getAttribute('aria-label'));
    expect(terrain.filter((label) => label?.includes('hin wall'))).toEqual([
      'Thin wall',
      'Low thin wall',
    ]);
    // helhogt-fonster: the full-height pane has its own brush.
    expect(terrain).toContain('High window pane');
    view.dispose();
  });
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

describe('helskarms-bordningseditor', () => {
  it('lets the editor take the whole app area until it closes', () => {
    const model = new AppModel();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    model.openEditor('pirate', pirateMap);
    const view = new BoardingEditorView(root, () => undefined, editorMap);
    view.render(model.snapshot);
    expect(root.classList.contains('has-boarding-editor')).toBe(true);
    view.dispose();
    expect(root.classList.contains('has-boarding-editor')).toBe(false);
  });
});

describe('zooma-panorera-bordningseditor', () => {
  it('kamera-utan-lage-i-editor: has no pan mode to switch and fits the view from the toolbar', () => {
    const model = new AppModel();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    model.openEditor('pirate', pirateMap);
    let fits = 0;
    const view = new BoardingEditorView(
      root,
      () => undefined,
      () => ({
        ...editorMap(),
        fitView: () => {
          fits += 1;
        },
      }),
    );
    view.render(model.snapshot);
    expect(root.querySelector("[aria-label='Pan view']")).toBeNull();
    expect(root.textContent).toContain('Space + drag');
    click('Fit view');
    expect(fits).toBe(1);
    view.dispose();
  });

  it('skalbar-skeppsbild-i-editor: resizes the sprite from the toolbar while adjusting it', () => {
    const model = new AppModel();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    model.openEditor('pirate', pirateMap);
    const sizes: number[] = [];
    const view = new BoardingEditorView(
      root,
      () => undefined,
      () => ({
        ...editorMap(),
        resizeSprite: (scale: number) => {
          sizes.push(scale);
        },
      }),
    );
    view.render(model.snapshot);
    expect(root.querySelector("[aria-label='Larger sprite']")).toBeNull();
    model.editorAdjustSprite(true);
    view.render(model.snapshot);
    const scale = model.snapshot.editor!.sprite.scale;
    click('Larger sprite');
    click('Smaller sprite');
    const field = root.querySelector<HTMLInputElement>(
      "[aria-label='Sprite size']",
    )!;
    expect(Number(field.value)).toBeCloseTo(scale, 1);
    field.value = '20';
    field.dispatchEvent(new Event('change'));
    expect(sizes[0]).toBeCloseTo(scale * 1.05);
    expect(sizes[1]).toBeCloseTo(scale / 1.05);
    expect(sizes[2]).toBe(20);
    view.dispose();
  });

  it('kravlista-i-bordningseditor: lists the fixed layout rules as met or missing', () => {
    const model = new AppModel();
    model.setEditorCatalog([{ id: 'pirate', name: 'Space pirate' }]);
    model.openEditor('pirate', pirateMap);
    const view = new BoardingEditorView(root, () => undefined, editorMap);
    view.render(model.snapshot);
    const items = [
      ...root.querySelectorAll<HTMLElement>('.boarding-editor-requirements li'),
    ];
    expect(items.map((item) => item.dataset.requirement)).toEqual([
      'one-airlock',
      'airlock-on-hull-edge',
      'airlock-entry',
      'defender-spawn',
    ]);
    expect(items.every((item) => item.classList.contains('is-met'))).toBe(true);
    expect(root.textContent).not.toContain('right edge');
    view.dispose();
  });
});
