import type { AppReadModel } from '../models/AppModel.js';
import type { HexCoordinate, Point } from '../models/HexCoordinate.js';

export type AppIntent =
  | {
      readonly type:
        | 'open-map'
        | 'open-planet'
        | 'open-research'
        | 'home'
        | 'pointer-cancel';
    }
  | { readonly type: 'select'; readonly position: HexCoordinate }
  | { readonly type: 'pan'; readonly delta: Point }
  | { readonly type: 'zoom'; readonly factor: number; readonly anchor: Point }
  | {
      readonly type: 'pointer-start' | 'pointer-move' | 'pointer-end';
      readonly id: number;
      readonly point: Point;
    };

export type IntentHandler = (intent: AppIntent) => void;

export interface AppPort {
  bind(handler: IntentHandler): void;
  render(model: AppReadModel): void;
  dispose(): void;
}

export interface MapPort {
  render(model: AppReadModel): void;
  dispose(): void;
}

export type MapFactory = (
  container: HTMLElement,
  emit: IntentHandler,
) => MapPort;
