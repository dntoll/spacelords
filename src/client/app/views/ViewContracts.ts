import type {
  MapViewport,
  TurnFrame,
  Technology,
} from '../../space-map/models/index.js';
import type {
  BattleCommand,
  BattleManeuver,
  BattleShot,
} from '../../space-battle/models/index.js';
import type { AppReadModel } from '../models/AppModel.js';
import type { HexCoordinate, Point } from '../../common/HexCoordinate.js';
import type {
  BoardingCommand,
  TestBoardingSelection,
  BoardingMapId,
  EditorBrushButton,
  EditorPaintCell,
  EditorProjection,
  EditorTool,
  SpriteAxisPlacement,
} from '../../boarding/models/index.js';

export type AppIntent =
  | {
      readonly type: 'reorder-ship';
      readonly shipId: string;
      readonly index: number;
    }
  | {
      readonly type: 'move-equipment';
      readonly from: {
        readonly shipId: string;
        readonly slot: number | 'engine' | 'weapon';
        readonly index?: number;
      };
      readonly to: {
        readonly shipId: string;
        readonly slot: number | 'engine' | 'weapon';
        readonly index?: number;
      };
    }
  | { readonly type: 'test-battle' }
  | {
      readonly type: 'test-boarding';
      readonly selection?: TestBoardingSelection;
    }
  | { readonly type: 'close-boarding' }
  | { readonly type: 'boarding-command'; readonly command: BoardingCommand }
  | { readonly type: 'battle-command'; readonly command: BattleCommand }
  | {
      readonly type: 'inspect-research';
      readonly technology: Technology | null;
    }
  | {
      readonly type:
        'handle-discoveries' | 'ignore-discoveries' | 'continue-turn';
    }
  | {
      readonly type: 'map-select-fleet';
      readonly id: string;
    }
  | { readonly type: 'open-production' }
  | { readonly type: 'map-size'; readonly viewport: MapViewport }
  | { readonly type: 'research-pan'; readonly delta: Point }
  | {
      readonly type: 'research-zoom';
      readonly factor: number;
      readonly anchor: Point;
    }
  | {
      readonly type: 'research-size';
      readonly width: number;
      readonly height: number;
    }
  | { readonly type: 'research-fit' }
  | {
      readonly type: 'confirm-research-removal' | 'cancel-research-removal';
    }
  | {
      readonly type: 'move-research';
      readonly technology: Technology;
      readonly index: number;
    }
  | { readonly type: 'remove-research'; readonly technology: Technology }
  | { readonly type: 'start-slot' | 'request-clear-slot'; readonly id: number }
  | { readonly type: 'open-saves' | 'cancel-clear-slot' | 'confirm-clear-slot' }
  | {
      readonly type:
        | 'open-map'
        | 'open-research'
        | 'open-fleets'
        | 'home'
        | 'pointer-cancel'
        | 'map-leave';
    }
  | {
      readonly type: 'begin-fleet-rename';
      readonly id: string;
    }
  | { readonly type: 'edit-fleet-name'; readonly draft: string }
  | { readonly type: 'cancel-fleet-rename'; readonly reason?: 'blur' }
  | { readonly type: 'submit-fleet-name' }
  | { readonly type: 'select'; readonly position: HexCoordinate }
  | { readonly type: 'pan'; readonly delta: Point }
  | { readonly type: 'zoom'; readonly factor: number; readonly anchor: Point }
  | { readonly type: 'research'; readonly technology: Technology | null }
  | {
      readonly type: 'open-fleet' | 'begin-destination' | 'clear-destination';
      readonly id: string;
    }
  | { readonly type: 'open-editor' | 'close-editor' }
  | { readonly type: 'editor-undo' | 'editor-redo' | 'editor-save' }
  | {
      readonly type: 'confirm-editor-switch' | 'cancel-editor-switch';
    }
  | { readonly type: 'editor-select-map'; readonly id: BoardingMapId }
  | {
      readonly type: 'editor-resize';
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly type: 'editor-bind-tool';
      readonly button: EditorBrushButton;
      readonly tool: EditorTool;
    }
  | {
      readonly type: 'editor-paint';
      readonly button: EditorBrushButton;
      readonly cells: readonly EditorPaintCell[];
    }
  | {
      readonly type: 'editor-sprite-transform';
      readonly sprite: SpriteAxisPlacement;
    }
  | { readonly type: 'editor-picture-aspect'; readonly value: number }
  | { readonly type: 'editor-adjust-sprite'; readonly value: boolean }
  | { readonly type: 'editor-projection'; readonly value: EditorProjection }
  | { readonly type: 'editor-opacity'; readonly value: number }
  | { readonly type: 'editor-fill-rooms'; readonly value: boolean }
  | {
      readonly type: 'pointer-start' | 'pointer-move' | 'pointer-end';
      readonly id: number;
      readonly point: Point;
    };

export type IntentHandler = (intent: AppIntent) => void;

export interface AppPort {
  /** Resolves when the boarding shot or move on screen has finished. */
  boardingPresentation?(): Promise<void> | null;
  animateBattleShot?(shot: BattleShot): Promise<void>;
  animateBattleManeuver?(maneuver: BattleManeuver): Promise<void>;
  bind(handler: IntentHandler): void;
  render(model: AppReadModel): void;
  renderCamera?(model: AppReadModel): void;
  animatePresentation?(
    duration: number,
    onProgress: (progress: number) => boolean | void,
  ): Promise<void>;
  animateTurnStep?(
    frame: TurnFrame,
    onProgress?: (progress: number, point?: Point, crossed?: boolean) => void,
    duration?: number,
    ends?: { readonly start: boolean; readonly end: boolean },
  ): Promise<void>;
  dispose(): void;
}

export interface MapPort {
  render(model: AppReadModel): void;
  animateTurnStep?(
    frame: TurnFrame,
    onProgress?: (progress: number, point?: Point, crossed?: boolean) => void,
    duration?: number,
    ends?: { readonly start: boolean; readonly end: boolean },
  ): Promise<void>;
  dispose(): void;
}

export type MapFactory = (
  container: HTMLElement,
  emit: IntentHandler,
) => MapPort;
