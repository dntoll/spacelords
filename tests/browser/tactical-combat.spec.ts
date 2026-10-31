import { expect, test, type Page } from '@playwright/test';
import { encounterGame, arrangeBattle } from '../fixtures/battle-checkpoint.js';
import { startFirstSlot, ignoreEventsUntil } from './save-helpers.js';
import type { SavedGame } from '../../src/client/models/SaveRepository.js';
import { battleHex } from '../../src/client/models/TacticalBattle.js';

async function saved(page: Page): Promise<SavedGame> {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('spacelords.save.v2.1')!) as SavedGame,
  );
}
async function prepare(
  page: Page,
  state: SavedGame['state'],
): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((state) => {
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    if (!localStorage.getItem('spacelords.save.v2.1'))
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-31', state }),
      );
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await expect(
    page.getByRole('dialog', { name: 'Tactical combat' }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Battle hex map/)).toBeVisible();
  return errors;
}

test('stridsutplacering / sparad-taktisk-strid: deploys all ships and resumes an unfinished activation without rerolling', async ({
  page,
}, testInfo) => {
  const game = encounterGame();
  const errors = await prepare(page, game.exportState());
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  await expect(
    dialog.getByRole('button', { name: 'Start combat', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('button', { name: 'Auto deploy', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Start combat', exact: true }),
  ).toBeEnabled();
  await dialog.getByLabel('Facing', { exact: true }).selectOption('3');
  await page.screenshot({ path: testInfo.outputPath('battle-deployment.png') });
  const deployment = (await saved(page)).state.simulation!.tacticalBattles![0]!;
  expect(deployment.pieces.every((p) => p.position)).toBe(true);
  await page.reload();
  await startFirstSlot(page);
  expect((await saved(page)).state.simulation!.tacticalBattles![0]).toEqual(
    deployment,
  );
  await expect(dialog.getByLabel('Facing', { exact: true })).toHaveValue('3');
  await dialog
    .getByRole('button', { name: 'Start combat', exact: true })
    .click();
  const fighter = deployment.pieces.find((p) => p.type === 'Fighter')!;
  await dialog
    .getByLabel('Your ship', { exact: true })
    .selectOption(fighter.id);
  await expect(
    dialog.getByRole('button', { name: 'Activate ship', exact: true }),
  ).toBeEnabled();
  await dialog
    .getByRole('button', { name: 'Activate ship', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Turn left 60°', exact: true })
    .click();
  const checkpoint = (await saved(page)).state.simulation!.tacticalBattles![0]!;
  await page.screenshot({ path: testInfo.outputPath('battle-activation.png') });
  await page.reload();
  await startFirstSlot(page);
  expect((await saved(page)).state.simulation!.tacticalBattles![0]).toEqual(
    checkpoint,
  );
  await expect(
    dialog.getByRole('button', { name: 'End activation', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await dialog
    .getByRole('button', { name: 'Fit battle map', exact: true })
    .click();
  await expect(page.getByLabel(/^Battle hex map/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('battle-landscape.png') });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('skeppets-framat-foljer-spriten / riktning-och-vapen / oppna-stridstarningar: shows a valid attack, records its dice and permits movement after firing', async ({
  page,
}, testInfo) => {
  const game = arrangeBattle(encounterGame(), (state) => ({
    ...state,
    asteroids: [],
    phase: 'fighting',
    round: 2,
    turn: 'player',
    random: 1,
    pieces: state.pieces.map((p, i) => ({
      ...p,
      position:
        p.side === 'enemy'
          ? { q: 4, r: 4 }
          : p.type === 'Fighter' &&
              i === state.pieces.findIndex((a) => a.type === 'Fighter')
            ? { q: 1, r: 4 }
            : { q: 7, r: i },
      facing: p.side === 'enemy' ? 3 : 0,
    })),
  }));
  const errors = await prepare(page, game.exportState());
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  const fighter = game.tacticalBattle!.pieces.find(
    (p) => p.type === 'Fighter',
  )!;
  await dialog
    .getByLabel('Your ship', { exact: true })
    .selectOption(fighter.id);
  await dialog
    .getByRole('button', { name: 'Activate ship', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Fire weapon', exact: true }),
  ).toBeEnabled();
  await expect(dialog.locator('.battle-shot-preview')).toContainText(
    '2D6, hit 4+',
  );
  await dialog
    .getByRole('button', { name: 'Fire weapon', exact: true })
    .click();
  await expect(dialog.locator('.battle-latest-roll')).toContainText(
    '2D6 [1, 1]',
  );
  await expect(
    dialog.getByRole('button', { name: 'Fire weapon', exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath('battle-forward-before.png'),
  });
  await dialog
    .getByRole('button', { name: 'Forward / escape', exact: true })
    .click();
  const checkpoint = (await saved(page)).state.simulation!.tacticalBattles![0]!;
  expect(checkpoint.pieces.find((p) => p.id === fighter.id)!.position).toEqual({
    q: 2,
    r: 4,
  });
  await page.screenshot({
    path: testInfo.outputPath('battle-forward-after.png'),
  });
  await page.reload();
  await startFirstSlot(page);
  expect((await saved(page)).state.simulation!.tacticalBattles![0]).toEqual(
    checkpoint,
  );
  expect(errors).toEqual([]);
});

test('skeppsvis-retratt / gemensamt-handelseflode: escapes each ship, regroups the fleet and resumes the paused year', async ({
  page,
}, testInfo) => {
  const game = arrangeBattle(encounterGame(), (state) => ({
    ...state,
    asteroids: [],
    phase: 'fighting',
    round: 2,
    turn: 'player',
    pieces: state.pieces.map((p, i) => ({
      ...p,
      position:
        p.side === 'player'
          ? battleHex(0, i + 1)
          : battleHex(state.width - 1, state.height - 1),
      facing: 3,
    })),
  }));
  const errors = await prepare(page, game.exportState());
  const dialog = page.getByRole('dialog', { name: 'Tactical combat' });
  const initial = game.tacticalBattle!;
  for (const ship of initial.pieces.filter((p) => p.side === 'player')) {
    await dialog.getByLabel('Your ship', { exact: true }).selectOption(ship.id);
    await expect(
      dialog.getByRole('button', { name: 'Activate ship', exact: true }),
    ).toBeEnabled();
    await dialog
      .getByRole('button', { name: 'Activate ship', exact: true })
      .click();
    await dialog
      .getByRole('button', { name: 'Forward / escape', exact: true })
      .click();
  }
  await expect(dialog).toHaveCount(0);
  const result = (await saved(page)).state;
  expect(
    result.events.filter((e) => e.text.startsWith('Combat at HEX')),
  ).toHaveLength(1);
  expect(
    result.events.find((e) => e.text.startsWith('Combat at HEX'))!.text,
  ).toContain('4 ships escaped');
  expect(result.fleets[0]!.position).toEqual(
    initial.fleets.find((f) => f.side === 'player')!.retreat,
  );
  await ignoreEventsUntil(page);
  await expect.poll(async () => (await saved(page)).state.round).toBe(2);
  await page.screenshot({ path: testInfo.outputPath('battle-result.png') });
  expect(errors).toEqual([]);
});
