import { Camera, type CameraSnapshot } from './Camera.js';
import { createExampleGalaxy } from './exampleGalaxy.js';
import type { Galaxy, MapCell } from './Galaxy.js';
import {
  type HexCoordinate,
  HexGeometry,
  type Point,
} from './HexCoordinate.js';
import type { PlanetSnapshot } from './Planet.js';

export type PlanetTab = 'overview' | 'resources' | 'buildings';

export type Screen = 'map' | 'planet' | 'research';

export interface AppReadModel {
  readonly screen: Screen;
  readonly planetTab: PlanetTab;
  readonly playerName: string;
  readonly radius: number;
  readonly cells: readonly MapCell[];
  readonly selected: MapCell | null;
  readonly camera: CameraSnapshot;
  readonly planet: PlanetSnapshot | null;
}

export class AppModel {
  readonly #galaxy: Galaxy;
  readonly #camera: Camera;
  #selected: HexCoordinate;
  #screen: Screen = 'map';
  #planetTab: PlanetTab = 'overview';

  constructor(galaxy = createExampleGalaxy()) {
    this.#galaxy = galaxy;
    this.#camera = new Camera(galaxy.homePlanet.position, galaxy.radius);
    this.#selected = galaxy.homePlanet.position;
  }

  // mvc-arkitektur: no write operations or hidden world data cross into views.
  get snapshot(): AppReadModel {
    return Object.freeze({
      screen: this.#screen,
      planetTab: this.#planetTab,
      playerName: this.#galaxy.player.name,
      radius: this.#galaxy.radius,
      cells: this.#galaxy.mapSnapshot(),
      selected: this.#galaxy.cellAt(this.#selected) ?? null,
      camera: this.#camera.snapshot,
      planet:
        this.#screen === 'planet'
          ? (this.#galaxy.ownedPlanetAt(this.#selected)?.snapshot ?? null)
          : null,
    });
  }

  select(position: HexCoordinate): void {
    if (this.#screen === 'map' && this.#galaxy.cellAt(position))
      this.#selected = position;
  }

  selectPoint(point: Point): void {
    this.select(HexGeometry.fromPoint(this.#camera.screenToWorld(point)));
  }

  openPlanet(): void {
    if (this.#galaxy.ownedPlanetAt(this.#selected)) this.#screen = 'planet';
  }

  showPlanetTab(tab: PlanetTab): void {
    if (this.#screen === 'planet') this.#planetTab = tab;
  }

  openResearch(): void {
    this.#screen = 'research';
  }
  openMap(): void {
    this.#screen = 'map';
  }
  pan(delta: Point): void {
    this.#camera.panBy(delta);
  }
  zoom(factor: number, anchor: Point): void {
    this.#camera.zoomAt(factor, anchor);
  }

  home(): void {
    this.#camera.reset();
    this.#selected = this.#galaxy.homePlanet.position;
  }
}
