import type { MapCell } from '../models/Galaxy.js';
import type { Component } from '../models/Economy.js';
import type { AppReadModel } from '../models/AppModel.js';
import type {
  BuildType,
  FleetSnapshot,
  ShipType,
  TurnFrame,
  Technology,
} from '../models/Game.js';
import type { HexCoordinate, Point } from '../models/HexCoordinate.js';

export type AppIntent =
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
  | { readonly type: 'research-fit' | 'research-pointer-cancel' }
  | {
      readonly type:
        | 'research-pointer-start'
        | 'research-pointer-move'
        | 'research-pointer-end';
      readonly id: number;
      readonly point: Point;
    }
  | {
      readonly type:
        | 'open-trade-routes'
        | 'open-decisions'
        | 'next-decision'
        | 'confirm-end-turn'
        | 'cancel-end-turn'
        | 'confirm-research-removal'
        | 'cancel-research-removal';
    }
  | {
      readonly type:
        | 'open-decision'
        | 'skip-decision'
        | 'release-trade-fleet'
        | 'close-trade-route';
      readonly id: string;
    }
  | {
      readonly type: 'create-trade-route';
      readonly a: string;
      readonly b: string;
    }
  | {
      readonly type: 'assign-trade-fleet';
      readonly routeId: string;
      readonly fleetId: string;
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
        | 'open-planet'
        | 'open-research'
        | 'open-fleets'
        | 'home'
        | 'pointer-cancel'
        | 'map-leave'
        | 'end-turn'
        | 'produce-fighter';
    }
  | {
      readonly type: 'choose-ship-transfer';
      readonly fleetId: string;
      readonly ship: ShipType;
    }
  | { readonly type: 'transfer-chosen-ship'; readonly target: string }
  | { readonly type: 'cancel-ship-transfer' }
  | { readonly type: 'queue-component'; readonly component: Component }
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
        | 'delete-fleet';
      readonly id: string;
    }
  | { readonly type: 'create-fleet'; readonly id?: string }
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

export type FleetPreviewFactory = (
  container: HTMLElement,
  cells: readonly MapCell[],
  fleet: FleetSnapshot,
) => { dispose(): void };
