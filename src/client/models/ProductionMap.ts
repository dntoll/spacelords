import type { Cost, ProjectType } from './Game.js';
import type { Point } from './HexCoordinate.js';

export type MapScreen = 'map' | 'fleets' | 'route' | 'production';
export function isMapScreen(screen: string | null): screen is MapScreen {
  return (
    screen !== null && ['map', 'fleets', 'route', 'production'].includes(screen)
  );
}
export type MapProductionCategory = 'Buildings' | 'Components' | 'Ships';
export interface ProductionOption {
  readonly type: ProjectType;
  readonly category: MapProductionCategory;
  readonly description: string;
  readonly cost: Cost;
  readonly workers: number;
  readonly crew: number;
  readonly parts: Readonly<Record<string, number>>;
  readonly blockedReason: string | null;
  readonly localCount: number;
  readonly empireCount: number;
}
export interface ProductionMapSnapshot {
  readonly category: MapProductionCategory;
  readonly page: number;
  readonly pages: number;
  readonly categorized: boolean;
  readonly options: readonly ProductionOption[];
  readonly radius: number;
  readonly selectedOption: ProductionOption | null;
  readonly selectedProjectId: string | null;
}
export interface MapProblem {
  readonly decisionId: string;
  readonly planetId?: string | undefined;
  readonly routeId?: string | undefined;
  readonly screen: 'route' | 'production';
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
