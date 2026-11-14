import type {
  ExplorationOrder,
  ShipOrder,
  OrderKind,
  MapProductionCategory,
  MapViewport,
  ProjectType,
  Component,
  BuildType,
  ShipType,
  TurnFrame,
  Technology,
  PlanetQueueKind,
} from '../../space-map/models/index.js';
import type {
  BattleCommand,
  BattleManeuver,
  BattleShot,
} from '../../space-battle/models/index.js';
import type {
  AppReadModel,
  BuildingCategory,
  PlanetTab,
  ProductionCategory,
} from '../models/AppModel.js';
import type { HexCoordinate, Point } from '../../common/HexCoordinate.js';
import type {
  BoardingCommand,
  BoardingMapId,
  EditorBrushButton,
  EditorPaintCell,
  EditorProjection,
  EditorTool,
  SpriteTransform,
} from '../../boarding/models/index.js';

export type AppIntent =
  | { readonly type: 'test-battle' }
  | { readonly type: 'test-boarding' | 'close-boarding' }
  | { readonly type: 'boarding-command'; readonly command: BoardingCommand }
  | { readonly type: 'open-fleet-orders'; readonly id: string }
  | {
      readonly type: 'open-ship-orders';
      readonly ship: ShipType;
      readonly projectId?: string;
    }
  | { readonly type: 'order-kind'; readonly kind: OrderKind }
  | { readonly type: 'apply-ship-order'; readonly order: ShipOrder }
  | { readonly type: 'order-back' | 'clear-start-order' }
  | { readonly type: 'battle-command'; readonly command: BattleCommand }
  | { readonly type: 'resume-fleet-orders'; readonly id: string }
  | {
      readonly type: 'move-repair';
      readonly yardId: string;
      readonly wreckId: string;
      readonly index: number;
    }
  | {
      readonly type: 'inspect-research';
      readonly technology: Technology | null;
    }
  | { readonly type: 'patrol-fleet'; readonly id: string }
  | {
      readonly type: 'salvage-wreck';
      readonly fleetId: string;
      readonly wreckId: string;
    }
  | {
      readonly type: 'release-wreck';
      readonly fleetId: string;
      readonly id: string;
    }
  | {
      readonly type: 'return-shipyard' | 'select-salvage' | 'rebuild-shipyard';
      readonly id: string;
    }
  | { readonly type: 'cancel-shipyard-placement' }
  | { readonly type: 'place-shipyard'; readonly position: HexCoordinate }
  | {
      readonly type: 'explore-fleet';
      readonly id: string;
      readonly order: ExplorationOrder;
    }
  | {
      readonly type:
        | 'handle-discoveries'
        | 'ignore-discoveries'
        | 'continue-turn'
        | 'allow-other-fleet-orders';
    }
  | {
      readonly type:
        'map-select-route' | 'map-select-fleet' | 'begin-map-route';
      readonly id: string;
    }
  | { readonly type: 'cancel-map-trade' }
  | {
      readonly type: 'open-route' | 'open-production';
      readonly planetId?: string;
    }
  | {
      readonly type: 'map-production-category';
      readonly category: MapProductionCategory;
    }
  | { readonly type: 'map-production-page'; readonly page: number }
  | {
      readonly type: 'map-production-option';
      readonly option: ProjectType | null;
    }
  | { readonly type: 'map-production-project'; readonly id: string }
  | { readonly type: 'map-production-build'; readonly option?: ProjectType }
  | { readonly type: 'map-size'; readonly viewport: MapViewport }
  | {
      readonly type: 'supply-open-planet' | 'supply-open-route';
      readonly id: string;
    }
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
  | {
      readonly type: 'add-salvage-queue' | 'remove-salvage-queue';
      readonly wreckId: string;
    }
  | {
      readonly type: 'move-salvage-queue';
      readonly wreckId: string;
      readonly index: number;
    }
  | { readonly type: 'research-fit' }
  | { readonly type: 'prepare-route-transport'; readonly routeId: string }
  | {
      readonly type:
        | 'open-decisions'
        | 'confirm-end-turn'
        | 'cancel-end-turn'
        | 'confirm-research-removal'
        | 'cancel-research-removal';
    }
  | {
      readonly type:
        | 'open-decision'
        | 'skip-decision'
        | 'mute-decision'
        | 'unmute-decision'
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
  | {
      readonly type: 'add-planet-queue' | 'remove-planet-queue';
      readonly kind: PlanetQueueKind;
      readonly planetId: string;
    }
  | {
      readonly type: 'move-planet-queue';
      readonly kind: PlanetQueueKind;
      readonly planetId: string;
      readonly index: number;
    }
  | {
      readonly type: 'add-attack-queue' | 'remove-attack-queue';
      readonly pirateId: string;
    }
  | {
      readonly type: 'move-attack-queue';
      readonly pirateId: string;
      readonly index: number;
    }
  | { readonly type: 'request-colony-ship'; readonly planetId: string }
  | { readonly type: 'start-slot' | 'request-clear-slot'; readonly id: number }
  | { readonly type: 'open-saves' | 'cancel-clear-slot' | 'confirm-clear-slot' }
  | {
      readonly type:
        | 'open-map'
        | 'open-research'
        | 'open-fleets'
        | 'home'
        | 'pointer-cancel'
        | 'map-leave'
        | 'end-turn'
        | 'produce-fighter';
    }
  | {
      readonly type: 'planet-tab';
      readonly tab: PlanetTab;
    }
  | {
      readonly type: 'production-selection';
      readonly category: ProductionCategory;
      readonly product: string | null;
    }
  | { readonly type: 'production-fleet'; readonly id: string | null }
  | {
      readonly type: 'project-supply';
      readonly id: string;
      readonly open: boolean;
    }
  | {
      readonly type: 'open-planet-project';
      readonly planetId: string;
      readonly projectId: string;
    }
  | { readonly type: 'open-planet'; readonly id?: string }
  | {
      readonly type: 'choose-ship-transfer';
      readonly shipId?: string | undefined;
      readonly fleetId: string;
      readonly ship: ShipType;
    }
  | { readonly type: 'transfer-chosen-ship'; readonly target: string | null }
  | {
      readonly type: 'begin-fleet-rename';
      readonly id: string;
    }
  | { readonly type: 'edit-fleet-name'; readonly draft: string }
  | { readonly type: 'cancel-fleet-rename'; readonly reason?: 'blur' }
  | { readonly type: 'submit-fleet-name' }
  | { readonly type: 'cancel-ship-transfer' }
  | { readonly type: 'queue-component'; readonly component: Component }
  | { readonly type: 'building-category'; readonly category: BuildingCategory }
  | { readonly type: 'building-selection'; readonly building: BuildType | null }
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
      readonly type:
        'cancel-project' | 'toggle-demolition' | 'upgrade-building';
      readonly id: string;
    }
  | {
      readonly type:
        | 'select-fleet'
        | 'open-fleet'
        | 'begin-destination'
        | 'begin-colonization'
        | 'begin-salvage'
        | 'auto-salvage'
        | 'guard-routes'
        | 'upgrade-fleet'
        | 'civilian-transport'
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
      readonly shipId?: string | undefined;
      readonly source: string;
      readonly ship: ShipType;
      readonly amount: number;
      readonly target: string | null;
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
      readonly sprite: SpriteTransform;
    }
  | { readonly type: 'editor-adjust-sprite'; readonly value: boolean }
  | { readonly type: 'editor-projection'; readonly value: EditorProjection }
  | { readonly type: 'editor-opacity'; readonly value: number }
  | {
      readonly type: 'pointer-start' | 'pointer-move' | 'pointer-end';
      readonly id: number;
      readonly point: Point;
    };

export type IntentHandler = (intent: AppIntent) => void;

export interface AppPort {
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
    onProgress?: (progress: number) => void,
    duration?: number,
  ): Promise<void>;
  dispose(): void;
}

export interface MapPort {
  render(model: AppReadModel): void;
  animateTurnStep?(
    frame: TurnFrame,
    onProgress?: (progress: number) => void,
    duration?: number,
  ): Promise<void>;
  dispose(): void;
}

export type MapFactory = (
  container: HTMLElement,
  emit: IntentHandler,
) => MapPort;
