import { expect, test } from '@playwright/test';
import { startFirstSlot, endTurn, chooseResearch } from './save-helpers.js';

test('forskning-kraver-station / dubbelklick-bygger-pa-kartan / byggknapp-vid-titel: complete a station before queuing research and keep Build beside its title', async ({
  page,
}, testInfo) => {
  // Completing a station and prerequisite research spans several narrated years.
  test.setTimeout(90_000);
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect Rocket engine factory', exact: true })
    .click();
  const research = page.getByRole('button', {
    name: 'Research Rocket engine factory',
    exact: true,
  });
  await expect(research).toBeDisabled();
  await expect(page.locator('.research-station-required')).toBeVisible();
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .dblclick();
  await expect(page.locator('.map-queue-row')).toHaveCount(1);
  await expect(page.locator('.map-queue-row')).toContainText(
    'Research station',
  );
  const header = page.locator('.map-build-heading');
  const build = header.getByRole('button', { name: 'Build', exact: true });
  await expect(build).toBeInViewport();
  const buttonBounds = (await build.boundingBox())!;
  const titleBounds = (await header.getByRole('heading').boundingBox())!;
  expect(buttonBounds.x).toBeGreaterThanOrEqual(
    titleBounds.x + titleBounds.width,
  );
  expect(buttonBounds.y).toBeLessThan(titleBounds.y + titleBounds.height);
  expect(buttonBounds.y + buttonBounds.height).toBeGreaterThan(titleBounds.y);
  expect(buttonBounds.height).toBeGreaterThanOrEqual(44);
  // radiella-byggval: a hovered choice must stay readable after selection.
  const contrast = await page
    .getByRole('button', { name: 'Show Research station', exact: true })
    .evaluate((button) => {
      const style = getComputedStyle(button);
      const luminance = (color: string) => {
        const channels = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map((value) => {
            const channel = Number(value) / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
        );
      };
      const text = luminance(style.color),
        background = luminance(style.backgroundColor);
      return (
        (Math.max(text, background) + 0.05) /
        (Math.min(text, background) + 0.05)
      );
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({
    path: testInfo.outputPath('build-next-to-title.png'),
  });
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(research).toBeDisabled();
  await endTurn(page);
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page
    .getByRole('button', { name: 'Inspect Rocket engine factory', exact: true })
    .click();
  await expect(research).toBeEnabled();
  await chooseResearch(page, 'Colony ship factory');
  await expect(page.locator('.research-queue article')).toHaveCount(1);
});

test('dubbelklick-bygger-pa-kartan: double tap queues one order while single tap only selects', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Native touch requires a mobile device.');
  await page.goto('./');
  await startFirstSlot(page);
  await page.getByRole('button', { name: 'Production', exact: true }).click();
  const mine = page.getByRole('button', {
    name: 'Show Iron mine',
    exact: true,
  });
  await mine.tap();
  await expect(page.locator('.map-queue-row')).toHaveCount(0);
  // Select another item so the following pair starts a separate gesture.
  await page
    .getByRole('button', { name: 'Show Water extractor', exact: true })
    .tap();
  await mine.tap();
  await mine.tap();
  await expect(page.locator('.map-queue-row')).toHaveCount(1);
  await expect(page.locator('.map-queue-row')).toContainText('Iron mine');
});
