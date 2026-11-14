import { describe, expect, it } from 'vitest';
import {
  boardingSurfaceStyle,
  boardingWallFaceStyle,
} from '../../../src/client/boarding/views/rendering/BoardingSurfaceArtwork.js';
import { parseBoardingMap } from '../../../src/client/boarding/models/map/BoardingMap.js';

describe('rumsspecifika-bordningstexturer', () => {
  it('chooses each wall face independently and preserves cockpit semantics', () => {
    const source =
      '[meta]\nwidth=3\nheight=3\nrules=campaign\n[terrain]\n...\n.#.\n...\n[objects]\n---\n---\n---\n[rooms]\n---\n--B\n-EK\n[spawns]\n---\n---\n---\n';
    const map = parseBoardingMap(source);
    const roomAt = (position: { q: number; r: number }) => map.roomAt(position);
    expect(boardingWallFaceStyle(roomAt, { q: 1, r: 1 }, 'southEast')).toBe(
      'bridge',
    );
    expect(boardingWallFaceStyle(roomAt, { q: 1, r: 1 }, 'southWest')).toBe(
      'engineering',
    );
    expect(boardingSurfaceStyle(roomAt, { q: 2, r: 2 })).toBe('cockpit');
    expect(map.cockpits).toContainEqual({ q: 2, r: 2 });
    expect(boardingSurfaceStyle(roomAt, { q: 0, r: 0 })).toBe('default');
  });
});
