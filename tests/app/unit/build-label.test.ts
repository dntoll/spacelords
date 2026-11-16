import { describe, expect, it } from 'vitest';
import {
  buildLabelText,
  parseBuildInfo,
} from '../../../src/client/app/views/buildLabel.js';

describe('synlig-byggversion', () => {
  it('names branch, short revision and Swedish build time', () => {
    const info = parseBuildInfo(
      JSON.stringify({
        branch: 'development',
        revision: '3f2a1c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
        builtAt: '2026-11-16T13:32:00.000Z',
        localChanges: false,
      }),
    );
    expect(info).not.toBeNull();
    expect(buildLabelText(info!)).toBe(
      'development · 3f2a1c4 · 2026-11-16 14:32',
    );
  });

  it('marks a build with uncommitted changes', () => {
    expect(
      buildLabelText({
        branch: 'claude/x',
        revision: 'abcdef0123',
        builtAt: '2026-07-01T10:00:00.000Z',
        localChanges: true,
      }),
    ).toBe('claude/x · abcdef0 · 2026-07-01 12:00 · local changes');
  });

  it('shows nothing for missing or malformed build data', () => {
    expect(parseBuildInfo(undefined)).toBeNull();
    expect(parseBuildInfo('not json')).toBeNull();
    expect(parseBuildInfo('null')).toBeNull();
    expect(
      parseBuildInfo(
        JSON.stringify({ branch: '', revision: 'a', builtAt: '' }),
      ),
    ).toBeNull();
    expect(
      parseBuildInfo(
        JSON.stringify({ branch: 'main', revision: 'a', builtAt: 'never' }),
      ),
    ).toBeNull();
  });
});
