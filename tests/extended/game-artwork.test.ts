// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { BUILDINGS } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { catalogItem } from '../../src/client/views/CatalogControls.js';
import { buildingImage } from '../../src/client/views/BuildingImage.js';
import { planetIllustration } from '../../src/client/views/dom.js';
import { renderResearchTree } from '../../src/client/views/ResearchTreeView.js';
import type p5 from 'p5';
import { MapArtwork } from '../../src/client/views/MapArtwork.js';
import {
  renderPlanetGlyph,
  renderShipyardGlyph,
} from '../../src/client/views/PlanetGlyph.js';

it('spelgrafik-symboler: every building has a distinct decorative symbol while its action stays accessible', () => {
  const sources = new Set<string>();
  for (const type of Object.keys(BUILDINGS)) {
    const choose = vi.fn();
    const item = catalogItem(type, type, false, choose);
    const image = item.querySelector('img');
    expect(image, type).not.toBeNull();
    expect(image!.getAttribute('aria-hidden')).toBe('true');
    expect(image!.alt).toBe('');
    sources.add(image!.src);
    const control = item.querySelector('button')!;
    expect(control.getAttribute('aria-label')).toBe(`Show ${type}`);
    control.click();
    expect(choose).toHaveBeenCalledTimes(1);
    image!.dispatchEvent(new Event('error'));
    expect(item.querySelector('svg')).not.toBeNull();
    expect(control.getAttribute('aria-label')).toBe(`Show ${type}`);
  }
  expect(sources.size).toBe(24);
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
      stations: 1,
      queue: [],
      queueBlockedReason: null,
    },
    () => {},
  );
  const unknown = tree.querySelector(
    '[data-technology="Salvage ship factory"]',
  )!;
  expect(unknown.querySelector('img')).toBeNull();
  expect(unknown.textContent).toContain('Unknown');
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

it('spelgrafik-planeter: map snapshots expose environment only for discovered planets', () => {
  const galaxy = createExampleGalaxy();
  const planets = galaxy.systems.flatMap((system) => system.planets);
  const explored = new Set(planets.map((planet) => planet.position.key));
  const cells = galaxy.mapSnapshot(explored);
  for (const planet of planets) {
    const object = cells.find(
      (cell) => cell.position.key === planet.position.key,
    )!.object!;
    expect(object.environment).toBe(
      planet.type === 'gas' ? 'Gas' : planet.environment,
    );
    expect(Object.isFrozen(object)).toBe(true);
  }
  const hidden = galaxy.mapSnapshot(new Set());
  expect(hidden.filter((cell) => cell.object?.kind === 'planet')).toHaveLength(
    0,
  );
});

it('spelgrafik-planeter / spelgrafik-kartstation: loaded images replace glyphs without losing station selection', () => {
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
  renderShipyardGlyph(sketch as unknown as p5, true, image);
  expect(sketch.image).toHaveBeenLastCalledWith(image, -20, -20, 40, 40);
  expect(sketch.circle).toHaveBeenCalledWith(0, 0, 42);
  expect(sketch.rect).not.toHaveBeenCalled();
  renderShipyardGlyph(sketch as unknown as p5, false);
  expect(sketch.rect).toHaveBeenCalledWith(-10, -8, 20, 16);
  renderPlanetGlyph(sketch as unknown as p5, { x: 50, y: 60 }, 26, '#123');
  expect(sketch.circle).toHaveBeenCalledWith(50, 60, 26 * 0.65);
});

it('spelgrafik-planeter / spelgrafik-kartstation: disposal prevents late image callbacks from reviving a closed map', async () => {
  const completions: ((image: p5.Image) => void)[] = [];
  const sketch = {
    loadImage: vi.fn(
      () => new Promise<p5.Image>((resolve) => completions.push(resolve)),
    ),
  };
  const artwork = new MapArtwork();
  const redraw = vi.fn();
  artwork.load(sketch as unknown as p5, redraw);
  expect(sketch.loadImage).toHaveBeenCalledTimes(7);
  artwork.dispose();
  for (const complete of completions) complete({} as p5.Image);
  await Promise.resolve();
  expect(redraw).not.toHaveBeenCalled();
  expect(artwork.planetCount).toBe(0);
  expect(artwork.station).toBeUndefined();
});
