import { expect, test } from '@playwright/test';
import { researchStationState } from '../../fixtures/research-station.js';
import { startFirstSlot } from './save-helpers.js';
import { TECHNOLOGIES } from '../../../src/client/space-map/models/research/Research.js';

test('kompakt-forskningstrad: technology names fit two lines in narrow tiles', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(
    (state) => {
      localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-30T00:00:00Z', state }),
      );
    },
    { ...researchStationState(), researched: [...TECHNOLOGIES] },
  );
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  const labels = await page.locator('.research-node').evaluateAll((nodes) =>
    nodes.map((node) => {
      const label = node.querySelector<HTMLElement>('.research-node-name')!;
      const style = getComputedStyle(label);
      return {
        technology: (node as HTMLElement).dataset.technology!,
        name: label.textContent,
        width: (node as HTMLElement).offsetWidth,
        fits:
          label.scrollHeight <= label.clientHeight + 1 &&
          label.clientHeight <= 2 * Number.parseFloat(style.lineHeight) + 1,
      };
    }),
  );
  expect(labels.length).toBe(TECHNOLOGIES.length);
  for (const label of labels) {
    expect(label.name).toBe(label.technology);
    expect(label.width).toBeLessThanOrEqual(108);
    expect(label.fits, label.technology).toBe(true);
  }
  await page.screenshot({
    path: testInfo.outputPath('research-narrow-labels.png'),
  });
});

for (const size of [
  { width: 320, height: 568 },
  { width: 393, height: 851 },
  { width: 844, height: 390 },
]) {
  test(`forskningsdetaljer-vid-val / forskningstradets-utrymme: tree and selection remain visible at ${size.width}x${size.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(size);
    await page.addInitScript((state) => {
      localStorage.setItem('spacelords.expanded-galaxy-v12-reset', 'done');
      localStorage.setItem(
        'spacelords.save.v2.1',
        JSON.stringify({ lastPlayed: '2026-10-30T00:00:00Z', state }),
      );
    }, researchStationState());
    await page.goto('./');
    await startFirstSlot(page);
    await page.getByRole('button', { name: 'Research', exact: true }).click();
    const tree = page.getByRole('region', {
      name: 'Research tree',
      exact: true,
    });
    const details = page.getByRole('region', {
      name: 'Selected research',
      exact: true,
    });
    const stage = page.locator('.research-tree-stage');
    const before = (await tree.boundingBox())!;
    const rocket = page.getByRole('button', {
      name: 'Inspect Missiles',
      exact: true,
    });
    await rocket.focus();
    const camera = await stage.getAttribute('style');
    await rocket.click();
    await expect(details.getByRole('heading')).toHaveText('Missiles');
    await expect(stage).toHaveAttribute('style', camera!);
    expect(await tree.boundingBox()).toEqual(before);
    expect(
      await page
        .locator('[data-technology="Missiles"]')
        .evaluate((node) => (node as HTMLElement).offsetHeight),
    ).toBe(48);
    const selected = (await details.boundingBox())!;
    expect(before.height).toBeGreaterThan(100);
    if (size.width <= 640) {
      expect(selected.y).toBeGreaterThanOrEqual(before.y + before.height);
      expect(before.height).toBeGreaterThan(selected.height);
      expect(selected.height).toBeLessThanOrEqual(172);
    } else {
      expect(selected.x).toBeGreaterThanOrEqual(before.x + before.width);
    }
    const action = details.getByRole('button', {
      name: 'Research Missiles',
      exact: true,
    });
    const actionBounds = (await action.boundingBox())!;
    expect(actionBounds.height).toBeGreaterThanOrEqual(32);
    expect(actionBounds.height).toBeLessThanOrEqual(36);
    expect(actionBounds.width).toBeLessThanOrEqual(112);
    const title = (await details.getByRole('heading').boundingBox())!;
    expect(
      Math.abs(
        title.y + title.height / 2 - actionBounds.y - actionBounds.height / 2,
      ),
    ).toBeLessThan(3);
    const information = (await details
      .getByRole('region', { name: 'Technology information' })
      .boundingBox())!;
    expect(information.y).toBeLessThanOrEqual(
      actionBounds.y + actionBounds.height + 5,
    );
    if (size.width <= 640) {
      // detaljer-utan-scroll: every identified technology fits unscrolled.
      const names = await page
        .locator('.research-node-select[aria-label^="Inspect "]')
        .evaluateAll((nodes) =>
          nodes
            .map((node) => node.getAttribute('aria-label')!)
            .filter((label) => !label.startsWith('Inspect unknown')),
        );
      expect(names.length).toBeGreaterThan(1);
      for (const name of names) {
        await page
          .getByRole('button', { name, exact: true })
          .dispatchEvent('click');
        expect(
          await details
            .locator('.research-detail-content')
            .evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
          name,
        ).toBe(true);
      }
      expect(await tree.boundingBox()).toEqual(before);
      await rocket.click();
    }
    expect(actionBounds.y).toBeGreaterThanOrEqual(selected.y);
    expect(actionBounds.y + actionBounds.height).toBeLessThanOrEqual(
      selected.y + selected.height,
    );
    await page.screenshot({
      path: testInfo.outputPath('research-split-selection.png'),
    });
    await expect(action).toBeInViewport({ ratio: 1 });
    expect(await tree.boundingBox()).toEqual(before);
    await action.click();
    await expect(page.locator('.research-queue article')).toContainText(
      'Missiles',
    );
    await expect(action).toBeDisabled();
    await expect(details).toContainText('Researching');
    expect(
      await page.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth > innerWidth,
        vertical: document.documentElement.scrollHeight > innerHeight,
      })),
    ).toEqual({ horizontal: false, vertical: false });
  });
}
