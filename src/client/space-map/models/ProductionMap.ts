import type { BuildType, Cost, ProjectType } from './Game.js';
import type { Point } from '../../common/HexCoordinate.js';
import type { ProductionPresenceSnapshot } from './ProductionPresence.js';
import type { ShipProgressSnapshot } from './production/ShipProgress.js';

export type MapScreen = 'map' | 'fleets' | 'production' | 'orders';
export function isMapScreen(screen: string | null): screen is MapScreen {
  return (
    screen !== null &&
    ['map', 'fleets', 'production', 'orders'].includes(screen)
  );
}
export type MapProductionCategory = 'Buildings' | 'Components' | 'Ships';
export interface ProductionGuidance {
  readonly kind: 'factory' | 'dome' | 'research' | 'waiting' | 'full';
  readonly message: string;
  readonly dome: BuildType | null;
}
export interface ProductionOption extends ProductionPresenceSnapshot {
  readonly type: ProjectType;
  readonly category: MapProductionCategory;
  readonly description: string;
  readonly cost: Cost;
  readonly workers: number;
  readonly crew: number;
  readonly parts: Readonly<Record<string, number>>;
  readonly blockedReason: string | null;
  readonly dependencyWarning: string | null;
  readonly localCount: number;
  readonly empireCount: number;
}
export interface ProductionMapSnapshot {
  readonly page: number;
  readonly pages: number;
  readonly options: readonly ProductionOption[];
  readonly radius: number;
  readonly selectedOption: ProductionOption | null;
  readonly selectedProjectId: string | null;
  /** byggkons-framsteg: the planet's queued ships and their parts. */
  readonly queue: readonly ShipProgressSnapshot[];
}
export interface MapProblem {
  readonly decisionId: string;
  readonly planetId?: string | undefined;
  readonly routeId?: string | undefined;
  readonly screen: 'production';
  readonly explanation: string;
}
export interface MapViewport {
  readonly width: number;
  readonly height: number;
  readonly availableWidth: number;
  readonly availableHeight: number;
  readonly fontScale?: number;
  readonly ringLeft?: number;
  readonly ringRight?: number;
  readonly ringTop?: number;
  readonly ringBottom?: number;
}
export const BUILD_RING_EXTENT = 148;

// radiella-byggval: the same screen-space geometry drives camera fitting and HTML.
export function productionPosition(
  point: Point,
  camera: { readonly center: Point; readonly zoom: number },
  viewport: MapViewport,
): Point {
  return {
    x: viewport.width / 2 + (point.x - camera.center.x) * camera.zoom,
    y: viewport.height / 2 + (point.y - camera.center.y) * camera.zoom,
  };
}
