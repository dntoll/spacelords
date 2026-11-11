import type { AppReadModel } from '../../models/AppModel.js';
import type {
  BoardingEditorSnapshot,
  EditorBrushButton,
  EditorPaintCell,
  EditorProjection,
  EditorTool,
  SpriteTransform,
} from '../../models/boarding/BoardingEditor.js';
import {
  BOARDING_EDITOR_MAX_SIZE,
  BOARDING_EDITOR_MIN_SIZE,
} from '../../models/boarding/BoardingEditor.js';
import type {
  BoardingEditorLayer,
  BoardingMapId,
} from '../../../shared/boarding-map-format.js';
import type { IntentHandler } from '../ViewContracts.js';
import { playerNoticeText } from '../app/playerNoticeText.js';
import { button, element } from '../dom.js';
import { BoardingEditorMapView } from './BoardingEditorMapView.js';

interface PaletteTile {
  readonly layer: BoardingEditorLayer;
  readonly symbol: string;
  readonly label: string;
}

const PALETTE: readonly PaletteTile[] = [
  { layer: 'terrain', symbol: '.', label: 'Floor' },
  { layer: 'terrain', symbol: '#', label: 'Wall' },
  { layer: 'terrain', symbol: 'H', label: 'Hull' },
  { layer: 'terrain', symbol: 'Q', label: 'Thin wall q' },
  { layer: 'terrain', symbol: 'R', label: 'Thin wall r' },
  { layer: 'terrain', symbol: 'q', label: 'Low thin wall q' },
  { layer: 'terrain', symbol: 'r', label: 'Low thin wall r' },
  { layer: 'terrain', symbol: 'O', label: 'Outside' },
  { layer: 'objects', symbol: '-', label: 'No object' },
  { layer: 'objects', symbol: 'D', label: 'Door' },
  { layer: 'objects', symbol: 'L', label: 'Locked door' },
  { layer: 'objects', symbol: 'R', label: 'Reactor' },
  { layer: 'objects', symbol: 'C', label: 'Half cover' },
  { layer: 'objects', symbol: 'B', label: 'Breach' },
  { layer: 'objects', symbol: 'X', label: 'Escape pod' },
  { layer: 'objects', symbol: 'A', label: 'Airlock' },
  { layer: 'rooms', symbol: '-', label: 'No room' },
  { layer: 'rooms', symbol: 'B', label: 'Bridge' },
  { layer: 'rooms', symbol: 'E', label: 'Engineering' },
  { layer: 'rooms', symbol: 'K', label: 'Cockpit' },
  { layer: 'spawns', symbol: '-', label: 'No spawn' },
  { layer: 'spawns', symbol: 'P', label: 'Player spawn' },
  { layer: 'spawns', symbol: 'D', label: 'Defender spawn' },
  { layer: 'spawns', symbol: 'C', label: 'Civilian spawn' },
  { layer: 'lights', symbol: 'L', label: 'Ceiling light' },
  { layer: 'lights', symbol: '-', label: 'No light' },
];

function sameTool(a: EditorTool, b: EditorTool): boolean {
  return a.layer === b.layer && a.symbol === b.symbol;
}

function toolLabel(tool: EditorTool): string {
  return (
    PALETTE.find(
      (tile) => tile.layer === tool.layer && tile.symbol === tool.symbol,
    )?.label ?? tool.symbol
  );
}

export type EditorMapPort = {
  render(snapshot: BoardingEditorSnapshot): void;
  dispose(): void;
};

export type EditorMapFactory = (
  container: HTMLElement,
  emitPaint: (
    button: EditorBrushButton,
    cells: readonly EditorPaintCell[],
  ) => void,
  emitSprite: (sprite: SpriteTransform) => void,
) => EditorMapPort;

/** lokal-bordningskarteditor: HTML chrome around the map canvas. */
export class BoardingEditorView {
  readonly #root: HTMLElement;
  readonly #page = element('section', 'boarding-editor-page');
  readonly #toolbar = element('div', 'boarding-editor-toolbar');
  readonly #canvas = element('div', 'boarding-editor-canvas');
  readonly #palette = element('div', 'boarding-editor-palette');
  readonly #status = element('p', 'boarding-editor-status');
  readonly #ship = element('select', 'boarding-editor-ship');
  readonly #width = element('input', 'boarding-editor-size');
  readonly #height = element('input', 'boarding-editor-size');
  readonly #projection = element('select', 'boarding-editor-ship');
  readonly #opacity = element('input', 'boarding-editor-opacity');
  readonly #leftSlot = element('button', 'boarding-editor-slot');
  readonly #rightSlot = element('button', 'boarding-editor-slot');
  readonly #help = element('p', 'boarding-editor-help');
  readonly #keys = new AbortController();
  #map: EditorMapPort | null = null;
  #bindTarget: EditorBrushButton | null = null;
  #dialog: HTMLDialogElement | null = null;
  readonly #mapFactory: EditorMapFactory;

  constructor(
    root: HTMLElement,
    private readonly emit: IntentHandler,
    mapFactory?: EditorMapFactory,
  ) {
    this.#mapFactory =
      mapFactory ??
      ((container, emitPaint, emitSprite) =>
        new BoardingEditorMapView(container, emitPaint, emitSprite));
    this.#root = root;
    this.#leftSlot.type = 'button';
    this.#rightSlot.type = 'button';
    this.#help.setAttribute('role', 'status');
    this.#help.setAttribute('aria-live', 'polite');
    this.#ship.setAttribute('aria-label', 'Ship');
    this.#width.type = 'number';
    this.#width.min = String(BOARDING_EDITOR_MIN_SIZE);
    this.#width.max = String(BOARDING_EDITOR_MAX_SIZE);
    this.#width.setAttribute('aria-label', 'Width');
    this.#height.type = 'number';
    this.#height.min = String(BOARDING_EDITOR_MIN_SIZE);
    this.#height.max = String(BOARDING_EDITOR_MAX_SIZE);
    this.#height.setAttribute('aria-label', 'Height');
    this.#opacity.type = 'range';
    this.#opacity.min = '0';
    this.#opacity.max = '1';
    this.#opacity.step = '0.05';
    this.#opacity.setAttribute('aria-label', 'Sprite opacity');
    this.#projection.setAttribute('aria-label', 'View');
    for (const option of [
      { value: 'isometric', label: 'Isometric' },
      { value: 'top-down', label: 'Top-down' },
    ] as const) {
      const node = element('option');
      node.value = option.value;
      node.textContent = option.label;
      this.#projection.append(node);
    }
    this.#projection.addEventListener('change', () =>
      this.emit({
        type: 'editor-projection',
        value: this.#projection.value as EditorProjection,
      }),
    );
    this.#ship.addEventListener('change', () =>
      this.emit({
        type: 'editor-select-map',
        id: this.#ship.value as BoardingMapId,
      }),
    );
    this.#width.addEventListener('change', () =>
      this.emit({
        type: 'editor-resize',
        width: Number(this.#width.value),
        height: Number(this.#height.value),
      }),
    );
    this.#height.addEventListener('change', () =>
      this.emit({
        type: 'editor-resize',
        width: Number(this.#width.value),
        height: Number(this.#height.value),
      }),
    );
    this.#opacity.addEventListener('input', () =>
      this.emit({ type: 'editor-opacity', value: Number(this.#opacity.value) }),
    );
    this.#leftSlot.addEventListener('click', () => {
      this.#bindTarget = 'primary';
    });
    this.#rightSlot.addEventListener('click', () => {
      this.#bindTarget = 'secondary';
    });
    window.addEventListener(
      'keydown',
      (event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'z'
        ) {
          event.preventDefault();
          this.emit({ type: event.shiftKey ? 'editor-redo' : 'editor-undo' });
        } else if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === 'y'
        ) {
          event.preventDefault();
          this.emit({ type: 'editor-redo' });
        }
      },
      { signal: this.#keys.signal },
    );
    this.#page.append(
      this.#toolbar,
      this.#canvas,
      this.#status,
      this.#help,
      this.#palette,
    );
  }

  render(model: AppReadModel): void {
    const editor = model.editor;
    if (!editor) return;
    this.#root.replaceChildren(this.#page);
    this.#root.classList.remove('has-game-footer', 'has-local-editor-nav');
    this.#toolbar.replaceChildren(
      this.#labeled('Ship', this.#ship),
      this.#labeled('Width', this.#width),
      this.#labeled('Height', this.#height),
      this.#labeled('View', this.#projection),
      button('Undo', () => this.emit({ type: 'editor-undo' })),
      button('Redo', () => this.emit({ type: 'editor-redo' })),
      button(editor.adjustSprite ? 'Paint tiles' : 'Adjust sprite', () =>
        this.emit({
          type: 'editor-adjust-sprite',
          value: !editor.adjustSprite,
        }),
      ),
      this.#labeled('Opacity', this.#opacity),
      button('Save', () => this.emit({ type: 'editor-save' })),
      button('Close', () => this.emit({ type: 'close-editor' })),
    );
    this.#toolbar.querySelector<HTMLButtonElement>(
      '[aria-label="Undo"]',
    )!.disabled = !editor.canUndo;
    this.#toolbar.querySelector<HTMLButtonElement>(
      '[aria-label="Redo"]',
    )!.disabled = !editor.canRedo;
    this.#toolbar.querySelector<HTMLButtonElement>(
      '[aria-label="Save"]',
    )!.disabled = !!editor.parseError;
    const descriptions: Readonly<Record<string, string>> = {
      Undo: 'Undo the last layout change.',
      Redo: 'Redo the last undone layout change.',
      'Adjust sprite': 'Move and resize the ship image in top-down view.',
      'Paint tiles': 'Finish adjusting the ship image and paint tiles.',
      Save: 'Save this layout to the local map file.',
      Close: 'Close the ship layout editor.',
    };
    for (const control of this.#toolbar.querySelectorAll('button')) {
      const label = control.getAttribute('aria-label') ?? '';
      this.#tooltip(control, descriptions[label] ?? label);
    }
    this.#ship.replaceChildren();
    for (const option of model.editorCatalog) {
      const node = element('option');
      node.value = option.id;
      node.textContent = option.name;
      this.#ship.append(node);
    }
    this.#ship.value = editor.mapId;
    this.#width.value = String(editor.width);
    this.#height.value = String(editor.height);
    this.#projection.value = editor.projection;
    this.#opacity.value = String(editor.spriteOpacity);
    this.#leftSlot.textContent = `L ${toolLabel(editor.primary)}`;
    this.#rightSlot.textContent = `R ${toolLabel(editor.secondary)}`;
    this.#tooltip(this.#leftSlot, 'Choose the left brush, then select a tool.');
    this.#tooltip(
      this.#rightSlot,
      'Choose the right brush, then select a tool.',
    );
    this.#status.textContent = [
      editor.dirty ? 'Unsaved changes.' : 'Saved.',
      editor.parseError,
      editor.airlockWarning
        ? 'Airlock is not on the right edge; docking may face the wrong way.'
        : '',
      playerNoticeText(model.notice),
    ]
      .filter((part) => part)
      .join(' ');
    this.#renderPalette(editor.primary, editor.secondary);
    this.#map ??= this.#mapFactory(
      this.#canvas,
      (button, cells) => this.emit({ type: 'editor-paint', button, cells }),
      (sprite) => this.emit({ type: 'editor-sprite-transform', sprite }),
    );
    this.#map.render(editor);
    if (model.pendingEditorDiscard && !this.#dialog) {
      this.#dialog = this.#confirmDialog();
      this.#page.append(this.#dialog);
      this.#dialog.showModal();
    } else if (!model.pendingEditorDiscard && this.#dialog) {
      this.#dialog.close();
      this.#dialog.remove();
      this.#dialog = null;
    }
  }

  dispose(): void {
    this.#keys.abort();
    this.#map?.dispose();
    this.#map = null;
    this.#dialog?.close();
    this.#dialog?.remove();
    this.#dialog = null;
  }

  #labeled(label: string, control: HTMLElement): HTMLElement {
    const wrap = element('label', 'boarding-editor-field');
    wrap.append(element('span', '', label), control);
    return wrap;
  }

  #tooltip(control: HTMLButtonElement, description: string): void {
    control.title = description;
    control.onfocus = () => {
      this.#help.textContent = description;
    };
    control.onblur = () => {
      this.#help.textContent = '';
    };
    control.onpointerenter = () => {
      this.#help.textContent = description;
    };
    control.onpointerleave = () => {
      if (document.activeElement !== control) this.#help.textContent = '';
    };
  }

  #renderPalette(primary: EditorTool, secondary: EditorTool): void {
    this.#palette.replaceChildren(this.#leftSlot, this.#rightSlot);
    const groups: readonly [BoardingEditorLayer, string][] = [
      ['terrain', 'Terrain'],
      ['objects', 'Objects'],
      ['rooms', 'Rooms'],
      ['spawns', 'Spawns'],
      ['lights', 'Lighting'],
    ];
    for (const [layer, label] of groups) {
      const group = element('section', 'boarding-editor-group');
      group.setAttribute('aria-label', label);
      group.append(element('h3', '', label));
      for (const tile of PALETTE.filter((entry) => entry.layer === layer)) {
        const choice = button(
          tile.label,
          () => undefined,
          'boarding-editor-tile',
        );
        this.#tooltip(
          choice,
          `${tile.label} — click for left brush, right-click for right brush`,
        );
        if (sameTool(primary, tile)) choice.classList.add('is-primary');
        if (sameTool(secondary, tile)) choice.classList.add('is-secondary');
        choice.addEventListener('click', () =>
          this.emit({
            type: 'editor-bind-tool',
            button: this.#bindTarget ?? 'primary',
            tool: tile,
          }),
        );
        choice.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          this.emit({
            type: 'editor-bind-tool',
            button: 'secondary',
            tool: tile,
          });
        });
        group.append(choice);
      }
      this.#palette.append(group);
    }
    this.#bindTarget = null;
  }

  #confirmDialog(): HTMLDialogElement {
    const dialog = element('dialog', 'decision-dialog');
    dialog.append(
      element('h2', '', 'Discard unsaved layout?'),
      element(
        'p',
        '',
        'Switching ship drops unsaved tile, size and sprite changes.',
      ),
      button('Discard', () => this.emit({ type: 'confirm-editor-switch' })),
      button('Cancel', () => this.emit({ type: 'cancel-editor-switch' })),
    );
    for (const control of dialog.querySelectorAll('button'))
      this.#tooltip(control, control.getAttribute('aria-label') ?? '');
    return dialog;
  }
}
