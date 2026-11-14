import { test } from '@playwright/test';

/**
 * utokad-testsvit: a long browser scenario gets its Chromium budget, scaled
 * by the project's timeoutScale (phone-webkit runs about three times slower).
 */
export function scenarioTimeout(milliseconds: number): void {
  const scale = Number(test.info().project.metadata?.timeoutScale ?? 1);
  test.setTimeout(milliseconds * scale);
}
