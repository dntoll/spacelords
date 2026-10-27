import { expect, type Page } from '@playwright/test';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import type {
  Point,
  HexCoordinate,
} from '../../src/client/models/HexCoordinate.js';
import { HexGeometry } from '../../src/client/models/HexCoordinate.js';

// viewport-game-layout / gemensam-events-panel: use every pixel between shared controls.
export async function expectMapFillsGameArea(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.locator('canvas[data-rendered="true"]').evaluate((canvas) => {
        const map = canvas.getBoundingClientRect();
        const header = document
          .querySelector('.app-header')!
          .getBoundingClientRect();
        const footer = document
          .querySelector('.game-turn-actions')!
          .getBoundingClientRect();
        return Math.max(
          Math.abs(map.top - header.bottom),
          Math.abs(map.bottom - footer.top),
          Math.abs(map.width - innerWidth),
        );
      }),
    )
    .toBeLessThanOrEqual(2);
}

export async function selectMapObject(page: Page, name: string): Promise<void> {
  const galaxy = createExampleGalaxy();
  const object = galaxy.systems
    .flatMap((system) => [system.star, ...system.planets])
    .find((object) => object.name === name);
  if (!object) throw new Error(`Unknown example object: ${name}`);
  await selectMapHex(page, object.position);
}

export async function selectMapHex(
  page: Page,
  position: HexCoordinate,
): Promise<void> {
  await selectMapPoint(page, HexGeometry.toPoint(position));
}

export async function selectMapPoint(page: Page, target: Point): Promise<void> {
  const map = page.locator('canvas[data-rendered="true"]');
  await expect(map).toHaveCount(1);
  const reverse: string[] = [];
  // Temporarily pan covered targets into the exposed map, then restore the camera.
  for (let attempt = 0; attempt < 40; attempt++) {
    const camera = (await page.getByTestId('camera-position').textContent())!
      .match(/-?\d+/g)!
      .map(Number);
    const zoom =
      Number(
        (await page.getByLabel('Map zoom').textContent())!.replace('%', ''),
      ) / 100;
    const bounds = (await map.boundingBox())!;
    const dx = (target.x - camera[0]!) * zoom;
    const dy = (target.y - camera[1]!) * zoom;
    const point = {
      x: bounds.x + bounds.width / 2 + dx,
      y: bounds.y + bounds.height / 2 + dy,
    };
    const exposed = await map.evaluate(
      (canvas, point) => document.elementFromPoint(point.x, point.y) === canvas,
      point,
    );
    if (exposed) {
      await map.click({
        position: { x: bounds.width / 2 + dx, y: bounds.height / 2 + dy },
      });
      for (const key of reverse.reverse()) await map.press(key);
      await page.mouse.move(1, 1);
      return;
    }
    const key =
      Math.abs(dx) >= bounds.width / 2 - 20
        ? dx > 0
          ? 'ArrowRight'
          : 'ArrowLeft'
        : dy > -bounds.height / 2 + 20
          ? 'ArrowDown'
          : 'ArrowUp';
    reverse.push(
      {
        ArrowRight: 'ArrowLeft',
        ArrowLeft: 'ArrowRight',
        ArrowDown: 'ArrowUp',
        ArrowUp: 'ArrowDown',
      }[key],
    );
    await map.press(key);
  }
  throw new Error(`Could not reach map point ${target.x},${target.y}`);
}
