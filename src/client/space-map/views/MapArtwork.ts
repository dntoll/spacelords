import type p5 from 'p5';
import { PLANET_IMAGES, type PlanetArtwork } from './PlanetImages.js';

/** spelgrafik-planeter: each map loads its images once. */
export class MapArtwork {
  readonly #planets = new Map<PlanetArtwork, p5.Image>();
  #disposed = false;

  get planetCount(): number {
    return this.#planets.size;
  }
  planet(type: PlanetArtwork): p5.Image | undefined {
    return this.#planets.get(type);
  }

  load(sketch: p5, redraw: () => void): void {
    for (const type of Object.keys(PLANET_IMAGES) as PlanetArtwork[])
      void sketch
        .loadImage(PLANET_IMAGES[type])
        .then((image) => {
          if (this.#disposed || !image) return;
          this.#planets.set(type, image);
          redraw();
        })
        .catch(() => {
          /* Retain the map glyph when a picture cannot load. */
        });
  }

  dispose(): void {
    this.#disposed = true;
    this.#planets.clear();
  }
}
