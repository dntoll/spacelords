import type { AppReadModel } from '../../../app/models/AppModel.js';
import type {
  BoardingEditorSnapshot,
  EditorBrushButton,
  EditorPaintCell,
  EditorProjection,
  EditorTool,
  SpriteAxisPlacement,
} from '../../models/editor/BoardingEditor.js';
import {
  BOARDING_EDITOR_MAX_SIZE,
  BOARDING_EDITOR_MIN_SIZE,
} from '../../models/editor/BoardingEditor.js';
import type {
  BoardingEditorLayer,
  BoardingMapId,
} from '../../../../shared/boarding/map-format.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { playerNoticeText } from '../../../app/views/playerNoticeText.js';
import { button, element } from '../../../common/dom.js';
import { BoardingEditorMapView } from './BoardingEditorMapView.js';
import { EDITOR_SPRITE_SCALE } from './BoardingEditorPick.js';
import type { BoardingMapRequirementId } from '../../../../shared/boarding/map-rules.js';

/** kravlista-i-bordningseditor: what each fixed layout rule asks for. */
const REQUIREMENT_TEXT: Readonly<Record<BoardingMapRequirementId, string>> = {
  'one-airlock': 'Exactly one airlock',
  'airlock-on-hull-edge':
    'Airlock on the top or bottom hull, open space outside',
  'airlock-entry': 'Empty floor just inside the airlock',
  'defender-spawn': 'At least one defender spawn',
  reactor: 'One reactor',
  breach: 'One breach',
};

/** kamera-utan-lage-i-editor */
const CAMERA_HELP =
  'Wheel zooms. Pan with the middle button, Space + drag or by dragging outside the ship. Two fingers pan and zoom.';

interface PaletteTile {
  readonly layer: BoardingEditorLayer;
  readonly symbol: string;
  readonly label: string;
}

const PALETTE: readonly PaletteTile[] = [
  { layer: 'terrain', symbol: '.', label: 'Floor' },
  { layer: 'terrain', symbol: '#', label: 'Wall' },
  { layer: 'terrain', symbol: 'H', label: 'Hull' },
  // sammanfogade-tunna-vaggar: the shape follows the neighbours, so one
  // tile per height is enough. R and r still load as the same walls.
  { layer: 'terrain', symbol: 'Q', label: 'Thin wall' },
  { layer: 'terrain', symbol: 'q', label: 'Low thin wall' },
  { layer: 'terrain', symbol: 'W', label: 'High window pane' },
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
  /** zooma-panorera-bordningseditor */
  fitView(): void;
  /** skalbar-skeppsbild-i-editor: width in cells, kept centred. */
  resizeSprite(scale: number): void;
  dispose(): void;
};

export type EditorMapFactory = (
  container: HTMLElement,
  emitPaint: (
    button: EditorBrushButton,
    cells: readonly EditorPaintCell[],
  ) => void,
  emitSprite: (sprite: SpriteAxisPlacement) => void,
  emitPictureAspect: (aspect: number) => void,
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
  readonly #spriteSize = element('input', 'boarding-editor-size');
  readonly #leftSlot = element('button', 'boarding-editor-slot');
  readonly #rightSlot = element('button', 'boarding-editor-slot');
  readonly #help = element('p', 'boarding-editor-help');
  readonly #requirements = element('ul', 'boarding-editor-requirements');
  readonly #keys = new AbortController();
  #map: EditorMapPort | null = null;
  #bindTarget: EditorBrushButton | null = null;
  #dialog: HTMLDialogElement | null = null;
  readonly #fitView = button('Fit view', () => this.#map?.fitView());
  readonly #mapFactory: EditorMapFactory;

  constructor(
    root: HTMLElement,
    private readonly emit: IntentHandler,
    mapFactory?: EditorMapFactory,
  ) {
    this.#mapFactory =
      mapFactory ??
      ((container, emitPaint, emitSprite, emitPictureAspect) =>
        new BoardingEditorMapView(
          container,
          emitPaint,
          emitSprite,
          emitPictureAspect,
        ));
    this.#root = root;
    this.#leftSlot.type = 'button';
    this.#rightSlot.type = 'button';
    this.#help.setAttribute('role', 'status');
    this.#help.setAttribute('aria-live', 'polite');
    this.#requirements.setAttribute('aria-label', 'Layout requirements');
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
    this.#spriteSize.type = 'number';
    this.#spriteSize.min = String(EDITOR_SPRITE_SCALE.min);
    this.#spriteSize.max = String(EDITOR_SPRITE_SCALE.max);
    this.#spriteSize.step = '0.5';
    this.#spriteSize.setAttribute('aria-label', 'Sprite size');
    this.#spriteSize.addEventListener('change', () =>
      this.#map?.resizeSprite(Number(this.#spriteSize.value)),
    );
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
    // helskarms-bordningseditor: the editor owns every row of the app grid.
    this.#root.classList.add('has-boarding-editor');
    this.#toolbar.replaceChildren(
      this.#labeled('Ship', this.#ship),
      this.#labeled('Width', this.#width),
      this.#labeled('Height', this.#height),
      this.#labeled('View', this.#projection),
      button('Undo', () => this.emit({ type: 'editor-undo' })),
      button('Redo', () => this.emit({ type: 'editor-redo' })),
      this.#fitView,
      button('Fill rooms', () =>
        this.emit({ type: 'editor-fill-rooms', value: !editor.fillRooms }),
      ),
      button(editor.adjustSprite ? 'Paint tiles' : 'Adjust sprite', () =>
        this.emit({
          type: 'editor-adjust-sprite',
          value: !editor.adjustSprite,
        }),
      ),
      ...(editor.adjustSprite
        ? [
            button('Smaller sprite', () =>
              this.#map?.resizeSprite(editor.sprite.scale / 1.05),
            ),
            this.#labeled('Sprite size', this.#spriteSize),
            button('Larger sprite', () =>
              this.#map?.resizeSprite(editor.sprite.scale * 1.05),
            ),
          ]
        : []),
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
    const fill = this.#toolbar.querySelector<HTMLButtonElement>(
      '[aria-label="Fill rooms"]',
    )!;
    fill.setAttribute('aria-pressed', String(editor.fillRooms));
    fill.classList.toggle('is-active', editor.fillRooms);
    const descriptions: Readonly<Record<string, string>> = {
      Undo: 'Undo the last layout change.',
      Redo: 'Redo the last undone layout change.',
      'Fill rooms': 'Room brushes fill the floor enclosed by walls and doors.',
      'Fit view': 'Zoom and centre the view on the whole ship.',
      'Adjust sprite':
        'Move and resize the ship image in top-down view. Drag moves it; the wheel or the size controls resize it.',
      'Smaller sprite': 'Shrink the ship image around its centre.',
      'Larger sprite': 'Grow the ship image around its centre.',
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
    if (document.activeElement !== this.#spriteSize)
      this.#spriteSize.value = String(
        Math.round(editor.sprite.scale * 10) / 10,
      );
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
      playerNoticeText(model.notice),
    ]
      .filter((part) => part)
      .join(' ');
    this.#renderPalette(editor.primary, editor.secondary);
    this.#map ??= this.#mapFactory(
      this.#canvas,
      (button, cells) => this.emit({ type: 'editor-paint', button, cells }),
      (sprite) => this.emit({ type: 'editor-sprite-transform', sprite }),
      (value) => this.emit({ type: 'editor-picture-aspect', value }),
    );
    this.#map.render(editor);
    this.#renderRequirements(editor);
    if (!this.#help.textContent) this.#help.textContent = CAMERA_HELP;
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
    this.#root.classList.remove('has-boarding-editor');
    this.#keys.abort();
    this.#map?.dispose();
    this.#map = null;
    this.#dialog?.close();
    this.#dialog?.remove();
    this.#dialog = null;
  }

  #renderRequirements(editor: BoardingEditorSnapshot): void {
    this.#requirements.replaceChildren(
      ...editor.requirements.map((requirement) => {
        const item = element(
          'li',
          requirement.met ? 'is-met' : 'is-missing',
          `${requirement.met ? '✓' : '✗'} ${REQUIREMENT_TEXT[requirement.id]}`,
        );
        item.dataset.requirement = requirement.id;
        return item;
      }),
    );
    if (this.#requirements.parentElement !== this.#canvas)
      this.#canvas.append(this.#requirements);
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
      this.#help.textContent = CAMERA_HELP;
    };
    control.onpointerenter = () => {
      this.#help.textContent = description;
    };
    control.onpointerleave = () => {
      if (document.activeElement !== control)
        this.#help.textContent = CAMERA_HELP;
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
          tile.layer === 'objects' && tile.symbol === 'A'
            ? "Airlock — moves the ship's one airlock along the top or bottom hull"
            : `${tile.label} — click for left brush, right-click for right brush`,
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
