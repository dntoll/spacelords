// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

// snabb-testsvit: workers are reused without isolation, so a DOM left behind by
// one test file must not reach the next (it once broke dragbara-koer).
describe('snabb-testsvit', () => {
  it('leaves elements in the document', () => {
    const status = document.createElement('span');
    status.setAttribute('role', 'status');
    document.body.append(status);
    document.head.append(document.createElement('style'));
    expect(document.querySelector('[role="status"]')).not.toBeNull();
  });

  it('starts the next test with an empty document', () => {
    expect(document.body.childElementCount).toBe(0);
    expect(document.head.querySelector('style')).toBeNull();
  });
});
