import type p5 from 'p5';
import { PLANET_IMAGES, type PlanetArtwork } from './PlanetImages.js';
import shipyardSprite from '../assets/map/orbital-shipyard-sprite.webp';

/** spelgrafik-planeter / spelgrafik-kartstation: each map loads its images once. */
export class MapArtwork {
  readonly #planets = new Map<PlanetArtwork, p5.Image>();
  #station: p5.Image | undefined;
  #disposed = false;

  get planetCount(): number {
    return this.#planets.size;
  }
  get station(): p5.Image | undefined {
    return this.#station;
  }
  planet(type: PlanetArtwork): p5.Image | undefined {
    return this.#planets.get(type);
  }

  load(sketch: p5, redraw: () => void, includeStation = true): void {
    const load = (url: string, save: (image: p5.Image) => void) => {
      void sketch
        .loadImage(url)
        .then((image) => {
          if (this.#disposed || !image) return;
          save(image);
          redraw();
        })
        .catch(() => {
          /* Retain the map glyph when a picture cannot load. */
        });
    };
    for (const type of Object.keys(PLANET_IMAGES) as PlanetArtwork[])
      load(PLANET_IMAGES[type], (image) => this.#planets.set(type, image));
    if (includeStation)
      load(shipyardSprite, (image) => {
        this.#station = image;
      });
  }

  dispose(): void {
    this.#disposed = true;
    this.#planets.clear();
    this.#station = undefined;
  }
}
