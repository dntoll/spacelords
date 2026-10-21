import { type Page } from '@playwright/test';

export async function chooseFleetDestination(
  page: Page,
  name = 'Home Fleet',
): Promise<void> {
  const card = page.locator('.map-fleet-cards .fleet-card').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
  await card.locator('.fleet-orders > summary').click();
  await card
    .getByRole('button', {
      name: `Choose destination for ${name}`,
      exact: true,
    })
    .click();
}
