import { expect, test, type Page } from '@playwright/test';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import {
  encounterGame,
  arrangeBattle,
} from '../../fixtures/battle-checkpoint.js';
import { fireAtBattleHex, showBattleHex } from './battle-helpers.js';
import { startFirstSlot } from './save-helpers.js';

async function seed(page: Page, game: Game) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-11-01', state }),
      );
  }, game.exportState());
  await page.goto('./');
  await startFirstSlot(page);
  return errors;
}

test('bilder-i-events / flottor-fore-planetdetaljer: pictures survive mobile rotation and planet details follow fleet controls', async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date('2026-11-01T00:00:00Z') });
  const game = new Game(createExampleGalaxy());
  game.scheduleBuild(game.galaxy.homePlanet, 'Research station');
  const errors = await seed(page, game);
  await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
  const fleets = page.locator('.map-fleet-management');
  const planet = page.locator('.planet-selection-details');
  await expect(fleets).not.toContainText('Tellus');
  await expect(planet).toContainText('Tellus');
  expect(
    await fleets.evaluate(
      (node) =>
        !!(
          node.compareDocumentPosition(
            document.querySelector('.planet-selection-details')!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await page.clock.pauseAt(new Date('2026-11-01T01:00:00Z'));
  await page.getByRole('button', { name: 'End turn', exact: true }).click();
  const warning = page.getByRole('dialog', { name: 'Decisions remaining' });
  if (await warning.isVisible())
    await warning
      .getByRole('button', { name: 'End turn anyway', exact: true })
      .click();
  const announcement = page.locator(
    '.event-announcement[data-stage="announcing"]',
  );
  for (let i = 0; i < 160 && !(await announcement.count()); i++)
    await page.clock.runFor(50);
  await expect(announcement).toContainText('Research station was completed');
  await expect(announcement.locator('img')).toHaveCount(2);
  for (const size of [
    { width: 393, height: 851 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await page.clock.runFor(50);
    const box = (await announcement.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    const production = (await announcement
      .locator('.event-content-row')
      .first()
      .boundingBox())!;
    expect(production.y + production.height).toBeLessThanOrEqual(
      box.y + box.height,
    );
    await page.screenshot({
      path: testInfo.outputPath(`event-${size.width}.png`),
    });
  }
  await page.clock.runFor(2200);
  const console = page.locator('.turn-console');
  if (!(await console.evaluate((node) => (node as HTMLDetailsElement).open)))
    await console.locator('summary').click();
  const entry = page
    .locator('.event-entries > li')
    .filter({ hasText: 'Research station was completed' });
  await expect(entry).toHaveCount(1);
  await expect(entry.locator('img')).toHaveCount(2);
  await expect(entry.locator('img').first()).toHaveJSProperty('complete', true);
  await page.screenshot({ path: testInfo.outputPath('event-history.png') });
  expect(errors).toEqual([]);
});

for (const reduced of [false, true]) {
  test(`animerade-stridsskott / skadepartiklar-i-strid: projectiles, impact and reload (reduced motion: ${reduced})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    await page.clock.install({ time: new Date('2026-11-01T00:00:00Z') });
    const game = arrangeBattle(encounterGame(), (state) => ({
      ...state,
      phase: 'fighting',
      round: 2,
      turn: 'player',
      asteroids: [],
      random: 12345,
      pieces: state.pieces.map((piece, i) => ({
        ...piece,
        position:
          piece.side === 'enemy'
            ? { q: 4, r: 4 }
            : i === 1
              ? { q: 1, r: 4 }
              : { q: 7, r: i },
        facing: piece.side === 'enemy' ? 3 : 0,
        hull: piece.side === 'enemy' ? 1 : piece.hull,
      })),
    }));
    const errors = await seed(page, game);
    const canvas = page.locator('.battle-canvas canvas');
    await expect(canvas).toBeVisible();
    await page.clock.pauseAt(new Date('2026-11-01T01:00:00Z'));
    await showBattleHex(page, { q: 4, r: 4 });
    await fireAtBattleHex(page, { q: 4, r: 4 });
    const surface = page.locator('.battle-canvas');
    const controls = page.locator('.battle-controls');
    if (!reduced) {
      await expect(surface).toHaveAttribute('data-shot-stage', 'flight');
      expect(
        await controls.evaluate((node) => (node as HTMLElement).inert),
      ).toBe(true);
      await page.clock.runFor(100);
      await page.screenshot({ path: testInfo.outputPath('shot-flight.png') });
      await page.clock.runFor(200);
      await expect(surface).toHaveAttribute('data-shot-stage', 'impact');
      await page.screenshot({ path: testInfo.outputPath('shot-impact.png') });
      await page.clock.runFor(400);
      await expect(surface).not.toHaveAttribute('data-shot-stage');
    } else await expect(surface).toHaveAttribute('data-shot-stage', 'static');
    await expect(page.locator('.battle-feedback')).toBeVisible();
    await page.reload();
    await startFirstSlot(page);
    await expect(page.locator('.battle-canvas[data-shot-stage]')).toHaveCount(
      0,
    );
    expect(errors).toEqual([]);
  });
}
