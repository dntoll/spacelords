import type { AppReadModel } from '../models/AppModel.js';
import type {
  BuildType,
  ShipType,
  TurnFrame,
  Technology,
} from '../models/Game.js';
import type { HexCoordinate, Point } from '../models/HexCoordinate.js';

export type AppIntent =
  | {
      readonly type:
        | 'open-map'
        | 'open-planet'
        | 'open-research'
        | 'open-fleets'
        | 'home'
        | 'pointer-cancel'
        | 'map-leave'
        | 'end-turn'
        | 'continue-planning'
        | 'produce-fighter';
    }
  | { readonly type: 'build-search'; readonly query: string }
  | { readonly type: 'select'; readonly position: HexCoordinate }
  | { readonly type: 'pan'; readonly delta: Point }
  | { readonly type: 'zoom'; readonly factor: number; readonly anchor: Point }
  | {
      readonly type: 'queue-ship';
      readonly ship: ShipType;
      readonly factoryId?: string;
      readonly fleetId: string | null;
    }
  | {
      readonly type: 'move-project';
      readonly id: string;
      readonly index: number;
    }
  | {
      readonly type: 'project-fleet';
      readonly id: string;
      readonly fleetId: string | null;
    }
  | {
      readonly type: 'build';
      readonly building: BuildType;
      readonly slotIndex?: number;
    }
  | { readonly type: 'build-site'; readonly index: number | null }
  | { readonly type: 'shipyard-menu'; readonly id: string | null }
  | { readonly type: 'research'; readonly technology: Technology | null }
  | { readonly type: 'colonize'; readonly id: string }
  | {
      readonly type: 'cancel-project' | 'toggle-demolition';
      readonly id: string;
    }
  | {
      readonly type:
        | 'select-fleet'
        | 'open-fleet'
        | 'begin-destination'
        | 'clear-destination'
        | 'delete-fleet'
        | 'create-fleet';
      readonly id: string;
    }
  | {
      readonly type: 'rename-fleet';
      readonly id: string;
      readonly name: string;
    }
  | {
      readonly type: 'transfer-ships';
      readonly source: string;
      readonly ship: ShipType;
      readonly amount: number;
      readonly target: string | null;
    }
  | {
      readonly type: 'pointer-start' | 'pointer-move' | 'pointer-end';
      readonly id: number;
      readonly point: Point;
    };

export type IntentHandler = (intent: AppIntent) => void;

export interface AppPort {
  bind(handler: IntentHandler): void;
  render(model: AppReadModel): void;
  animateTurnStep?(frame: TurnFrame): Promise<void>;
  dispose(): void;
}

export interface MapPort {
  render(model: AppReadModel): void;
  animateTurnStep?(frame: TurnFrame): Promise<void>;
  dispose(): void;
}

export type MapFactory = (
  container: HTMLElement,
  emit: IntentHandler,
) => MapPort;
