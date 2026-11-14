import { describe, expect, it } from 'vitest';
import {
  canBeBoarded,
  canInitiateDock,
  dockIssue,
  portStarboardContact,
} from '../../../src/client/space-battle/models/Docking.js';

describe('docka-babord-styrbord', () => {
  it('allows the same heading along a side hex and rejects nose-to-nose or T-bone contact', () => {
    const origin = [{ q: 0, r: 0 }];
    expect(portStarboardContact(origin, 0, [{ q: 1, r: -1 }], 0)).toBe(true);
    expect(portStarboardContact(origin, 0, [{ q: 0, r: 1 }], 0)).toBe(true);
    expect(portStarboardContact(origin, 0, [{ q: 1, r: 0 }], 0)).toBe(false);
    expect(portStarboardContact(origin, 0, [{ q: 1, r: 0 }], 3)).toBe(false);
    expect(portStarboardContact(origin, 0, [{ q: 1, r: -1 }], 1)).toBe(false);
  });

  it('lets opposite headings dock along a shared side', () => {
    expect(
      portStarboardContact([{ q: 0, r: 0 }], 0, [{ q: 1, r: -1 }], 3),
    ).toBe(true);
  });

  it('restricts who may dock and who may be boarded', () => {
    expect(canInitiateDock('Space pirate')).toBe(true);
    expect(canInitiateDock('Raptor')).toBe(true);
    expect(canInitiateDock('Transport ship')).toBe(false);
    expect(canBeBoarded('Colony ship')).toBe(true);
    expect(canBeBoarded('Fighter')).toBe(false);
    const pirate = {
      id: 'pirate',
      type: 'Space pirate' as const,
      side: 'enemy' as const,
      status: 'active' as const,
    };
    const transport = {
      id: 'hauler',
      type: 'Transport ship' as const,
      side: 'player' as const,
      status: 'active' as const,
    };
    expect(
      dockIssue(
        pirate,
        transport,
        [{ q: 0, r: 0 }],
        0,
        [{ q: 1, r: -1 }],
        0,
        false,
      ),
    ).toBeNull();
    expect(
      dockIssue(
        transport,
        pirate,
        [{ q: 1, r: -1 }],
        0,
        [{ q: 0, r: 0 }],
        0,
        false,
      ),
    ).toBe('Only pirates and Raptors can dock.');
  });
});
