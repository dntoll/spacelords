import { expect, type Page } from '@playwright/test';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../src/client/models/HexCoordinate.js';

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

export async function selectMapObject(
  page: Page,
  name: string,
  input: 'mouse' | 'touch' = 'mouse',
): Promise<void> {
  const position = await page.evaluate((objectName) => {
    const saved = JSON.parse(
      localStorage.getItem('spacelords.save.v2.1')!,
    ) as SavedGame;
    return saved.state.world.systems
      .flatMap((system) => [system.star, ...system.planets])
      .find((object) => object.name === objectName)?.position;
  }, name);
  if (!position) throw new Error(`Unknown saved object: ${name}`);
  await selectMapHex(page, new HexCoordinate(position.q, position.r), input);
}

export async function selectMapHex(
  page: Page,
  position: HexCoordinate,
  input: 'mouse' | 'touch' = 'mouse',
): Promise<void> {
  await selectMapPoint(page, HexGeometry.toPoint(position), input);
}

export async function selectMapPoint(
  page: Page,
  target: Point,
  input: 'mouse' | 'touch' = 'mouse',
): Promise<void> {
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
      if (input === 'touch') await page.touchscreen.tap(point.x, point.y);
      else
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
