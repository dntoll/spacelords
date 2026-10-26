import { expect, test } from '@playwright/test';
import { TECHNOLOGIES } from '../../src/client/models/Game.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';
import { startFirstSlot } from './save-helpers.js';

test('produktionsval-efter-forekomst / produktionsberoenden-i-byggval: page through prioritized options and explain the missing producer without disabling Build', async ({
  page,
}, testInfo) => {
  const state = { ...tradeNetworkState(), researched: TECHNOLOGIES };
  state.colonies[1]![1].projects = [];
  state.colonies[1]![1].buildings = [
    { id: 'water', type: 'Water extractor', slotIndex: 0, demolition: false },
  ];
  await page.addInitScript((state) => {
    if (localStorage.getItem('production-priorities-seeded')) return;
    localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
    localStorage.setItem(
      'spacelords.save.v2.1',
      JSON.stringify({ lastPlayed: '2026-10-24T00:00:00Z', state }),
    );
    localStorage.setItem('production-priorities-seeded', 'yes');
  }, state);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  const ring = page.getByRole('group', { name: 'Build options' });
  const seen: string[] = [];
  for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
    seen.push(
      ...(await ring
        .getByRole('button')
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute('aria-label')!),
        )),
    );
    const fighter = ring.getByRole('button', {
      name: 'Show Fighter factory',
      exact: true,
    });
    if (await fighter.count()) {
      await expect(fighter.locator('.production-dependency-marker')).toHaveText(
        '!',
      );
      await expect(fighter).toHaveAttribute(
        'aria-description',
        /Weapons module factory/,
      );
      await fighter.click();
      await expect(
        page.locator('.production-dependency-warning'),
      ).toContainText('Weapons module factory');
      await expect(
        page
          .locator('.map-build-heading')
          .getByRole('button', { name: 'Build', exact: true }),
      ).toBeEnabled();
      await page.screenshot({
        path: testInfo.outputPath('production-dependencies.png'),
      });
    }
    const next = page.getByRole('button', {
      name: 'Next build options',
      exact: true,
    });
    if (!(await next.count()) || (await next.isDisabled())) break;
    await next.click();
  }
  expect(new Set(seen).size).toBe(seen.length);
  const index = (name: string) => {
    expect(seen).toContain(`Show ${name}`);
    return seen.indexOf(`Show ${name}`);
  };
  expect(index('Oil extractor')).toBeLessThan(index('Water extractor'));
  expect(index('Water extractor')).toBeLessThan(index('Iron mine'));
  expect(index('Weapons module factory')).toBeLessThan(
    index('Fighter factory'),
  );
});
