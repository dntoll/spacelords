import { describe, expect, it } from 'vitest';
import {
  boardingEdgeTargetIndicators,
  boardingScreenRectangleVisible,
} from '../../../src/client/boarding/views/battle/BoardingTargetIndicatorLayout.js';

describe('kantindikator-for-synlig-fiende', () => {
  const viewport = { left: 100, top: 80, right: 500, bottom: 580 };

  it('projects every offscreen direction to an inset edge and keeps labels inward', () => {
    const indicators = boardingEdgeTargetIndicators(
      [
        { id: 'left', x: -100, y: 330 },
        { id: 'right', x: 900, y: 330 },
        { id: 'top', x: 450, y: -200 },
        { id: 'bottom', x: 300, y: 900 },
      ],
      viewport,
    );
    expect(indicators.find((entry) => entry.id === 'left')).toMatchObject({
      x: 122,
      labelSide: 'right',
    });
    expect(indicators.find((entry) => entry.id === 'right')).toMatchObject({
      x: 478,
      labelSide: 'left',
    });
    expect(indicators.find((entry) => entry.id === 'top')).toMatchObject({
      y: 102,
      labelSide: 'left',
    });
    expect(indicators.find((entry) => entry.id === 'bottom')?.y).toBe(558);
  });

  it('places the marker at the nearest edge point, beside a target just off a corner', () => {
    const [indicator] = boardingEdgeTargetIndicators(
      [{ id: 'corner', x: 700, y: 620 }],
      viewport,
    );
    expect(indicator).toMatchObject({ x: 478, y: 558 });
  });

  it('separates multiple targets on the same edge and distinguishes partial visibility', () => {
    const indicators = boardingEdgeTargetIndicators(
      [
        { id: 'a', x: 900, y: 300 },
        { id: 'b', x: 900, y: 305 },
      ],
      viewport,
    );
    expect(
      Math.abs(indicators[0]!.y - indicators[1]!.y),
    ).toBeGreaterThanOrEqual(44);
    expect(
      boardingScreenRectangleVisible(
        { left: 90, top: 100, right: 110, bottom: 120 },
        viewport,
      ),
    ).toBe(true);
    expect(
      boardingScreenRectangleVisible(
        { left: 0, top: 0, right: 99, bottom: 79 },
        viewport,
      ),
    ).toBe(false);
  });
});

describe('kantindikator-utanfor-granssnitt', () => {
  const viewport = { left: 0, top: 0, right: 800, bottom: 600 };
  const overlaps = (
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number },
  ) =>
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top;

  it('moves a marker off the combat log in the top-left corner', () => {
    const log = { left: 0, top: 0, right: 330, bottom: 240 };
    const [indicator] = boardingEdgeTargetIndicators(
      [{ id: 'upper-left', x: -50, y: 100 }],
      viewport,
      [log],
    );
    expect(overlaps(indicator!.hitBounds, log)).toBe(false);
    expect(indicator!.x).toBeLessThan(400);
  });

  it('keeps a bottom marker clear of the centred HUD but on the bottom edge', () => {
    const hud = { left: 200, top: 480, right: 600, bottom: 600 };
    const [indicator] = boardingEdgeTargetIndicators(
      [{ id: 'below', x: 380, y: 900 }],
      viewport,
      [hud],
    );
    expect(overlaps(indicator!.hitBounds, hud)).toBe(false);
    expect(indicator!.y).toBe(578);
  });

  it('leaves markers that are already clear exactly where they were', () => {
    const [plain] = boardingEdgeTargetIndicators(
      [{ id: 'right', x: 900, y: 300 }],
      viewport,
    );
    const [avoiding] = boardingEdgeTargetIndicators(
      [{ id: 'right', x: 900, y: 300 }],
      viewport,
      [{ left: 0, top: 0, right: 100, bottom: 100 }],
    );
    expect(avoiding).toEqual(plain);
  });
});
