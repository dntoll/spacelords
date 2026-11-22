// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { BUILDINGS } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { catalogIcon } from '../../../src/client/space-map/views/CatalogControls.js';
import { buildingImage } from '../../../src/client/space-map/views/BuildingImage.js';
import { planetIllustration } from '../../../src/client/space-map/views/PlanetImages.js';
import { renderResearchTree } from '../../../src/client/space-map/views/research/ResearchTreeView.js';
import type p5 from 'p5';
import { MapArtwork } from '../../../src/client/space-map/views/MapArtwork.js';
import { renderPlanetGlyph } from '../../../src/client/space-map/views/PlanetGlyph.js';

it('spelgrafik-symboler: every building has a distinct decorative symbol with a fallback', () => {
  const sources = new Set<string>();
  for (const type of Object.keys(BUILDINGS)) {
    const holder = document.createElement('span');
    holder.append(catalogIcon(type));
    const image = holder.querySelector('img');
    expect(image, type).not.toBeNull();
    expect(image!.getAttribute('aria-hidden')).toBe('true');
    expect(image!.alt).toBe('');
    sources.add(image!.src);
    image!.dispatchEvent(new Event('error'));
    expect(holder.querySelector('svg')).not.toBeNull();
  }
  expect(sources.size).toBe(Object.keys(BUILDINGS).length);
});

it('spelgrafik-symboler: a missing portrait uses its symbol while supplied portraits stay intact', () => {
  expect(buildingImage('Iron mine').querySelector('img')?.src).toContain(
    'iron-mine-symbol',
  );
  expect(buildingImage('Research station').querySelector('img')?.src).toContain(
    'research-station.webp',
  );
});

it('spelgrafik-symboler: unidentified research never reveals its symbol or name', () => {
  const tree = renderResearchTree(
    {
      available: [
        'Rocket engine factory',
        'Orbital shipyard',
        'Salvage ship factory',
      ],
      completed: [],
      selected: null,
      queue: [],
    },
    () => {},
  );
  const unknown = tree.querySelector(
    '[data-technology="Salvage ship factory"]',
  )!;
  expect(unknown.querySelector('img')).toBeNull();
  // forskningslov-som-symbol: an unknown leaf shows only '?'.
  expect(unknown.textContent).toContain('?');
  expect(unknown.querySelector('button')!.getAttribute('aria-label')).toContain(
    'unknown technology',
  );
  expect(
    tree
      .querySelector('[data-technology="Rocket engine factory"] img')
      ?.getAttribute('src'),
  ).toContain('rocket-engine-factory-symbol');
});

it('spelgrafik-planeter: all six detail illustrations are distinct and recover from a loading failure', () => {
  const sources = new Set<string>();
  for (const type of [
    'Temperate',
    'Ice',
    'Desert',
    'Ocean',
    'Toxic',
    'Gas',
  ] as const) {
    const illustration = planetIllustration(true, type);
    const image = illustration.querySelector('img')!;
    expect(image, type).not.toBeNull();
    sources.add(image.src);
    expect(illustration.getAttribute('aria-hidden')).toBe('true');
    image.dispatchEvent(new Event('error'));
    expect(illustration.querySelector('.planet-sphere')).not.toBeNull();
  }
  expect(sources.size).toBe(6);
});

it('spelgrafik-planeter: map snapshots expose environment only for surveyed planets', () => {
  const galaxy = createExampleGalaxy();
  const planets = galaxy.systems.flatMap((system) => system.planets);
  const explored = new Set(planets.map((planet) => planet.position.key));
  const concealed = galaxy.mapSnapshot(explored);
  for (const planet of planets) {
    const object = concealed.find(
      (cell) => cell.position.key === planet.position.key,
    )!.object!;
    expect(object.environment).toBeUndefined();
    expect(object.surveyed).toBe(false);
    expect(Object.isFrozen(object)).toBe(true);
  }
  const revealed = galaxy.mapSnapshot(
    explored,
    undefined,
    explored,
    explored,
    new Map(),
    new Set(planets.map((planet) => planet.id)),
  );
  for (const planet of planets) {
    const object = revealed.find(
      (cell) => cell.position.key === planet.position.key,
    )!.object!;
    expect(object.environment).toBe(
      planet.type === 'gas' ? 'Gas' : planet.environment,
    );
    expect(object.surveyed).toBe(true);
  }
  const hidden = galaxy.mapSnapshot(new Set());
  expect(hidden.filter((cell) => cell.object?.kind === 'planet')).toHaveLength(
    0,
  );
});

it('spelgrafik-planeter: loaded images replace planet glyphs', () => {
  const sketch = {
    image: vi.fn(),
    circle: vi.fn(),
    rect: vi.fn(),
    noFill: vi.fn(),
    noStroke: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
  };
  const image = {} as p5.Image;
  renderPlanetGlyph(
    sketch as unknown as p5,
    { x: 50, y: 60 },
    26,
    '#123',
    image,
  );
  expect(sketch.image).toHaveBeenCalledWith(image, 37, 47, 26, 26);
  expect(sketch.circle).not.toHaveBeenCalled();
  renderPlanetGlyph(sketch as unknown as p5, { x: 50, y: 60 }, 26, '#123');
  expect(sketch.circle).toHaveBeenCalledWith(50, 60, 26 * 0.65);
});

it('spelgrafik-planeter: disposal prevents late image callbacks from reviving a closed map', async () => {
  const completions: ((image: p5.Image) => void)[] = [];
  const sketch = {
    loadImage: vi.fn(
      () => new Promise<p5.Image>((resolve) => completions.push(resolve)),
    ),
  };
  const artwork = new MapArtwork();
  const redraw = vi.fn();
  artwork.load(sketch as unknown as p5, redraw);
  expect(sketch.loadImage).toHaveBeenCalledTimes(6);
  artwork.dispose();
  for (const complete of completions) complete({} as p5.Image);
  await Promise.resolve();
  expect(redraw).not.toHaveBeenCalled();
  expect(artwork.planetCount).toBe(0);
});
