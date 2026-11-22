export type MapScreen = 'map' | 'fleets';
export function isMapScreen(screen: string | null): screen is MapScreen {
  return screen !== null && ['map', 'fleets'].includes(screen);
}
/** The map canvas size and the free space around overlays, in CSS pixels. */
export interface MapViewport {
  readonly width: number;
  readonly height: number;
  readonly availableWidth: number;
  readonly availableHeight: number;
  readonly fontScale?: number;
}
