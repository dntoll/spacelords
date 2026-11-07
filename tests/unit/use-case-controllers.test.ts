import { describe, expect, it } from 'vitest';
import { MasterController } from '../../src/client/controllers/app/MasterController.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import type { IntentHandler } from '../../src/client/views/ViewContracts.js';
import { BoardingFacade } from '../../src/client/models/boarding/BoardingFacade.js';
import { BattleFacade } from '../../src/client/models/battle/BattleFacade.js';
import { ResearchFacade } from '../../src/client/models/research/ResearchFacade.js';
import { BrowserSaveRepository } from '../../src/client/storage/BrowserSaveRepository.js';
import { playerNoticeText } from '../../src/client/views/app/playerNoticeText.js';
import { ResearchPointer } from '../../src/client/views/research/ResearchPointer.js';

function methodNames(type: { prototype: object }): string[] {
  return Object.getOwnPropertyNames(type.prototype).filter(
    (name) => name !== 'constructor',
  );
}

describe('master-controller', () => {
  it('changes case only for the fact the master receives', () => {
    const model = new AppModel();
    let emit: IntentHandler = () => {};
    new MasterController(model, {
      bind: (handler) => {
        emit = handler;
      },
      render: () => {},
      dispose: () => {},
    }).start();
    expect(model.snapshot.screen).not.toBe('research');
    emit({ type: 'open-research' });
    expect(model.snapshot.screen).toBe('research');
  });
});

describe('use-case-controller', () => {
  it('keeps boarding from opening research or battle', () => {
    const values = new Map<string, string>();
    const model = new AppModel(
      undefined,
      new BrowserSaveRepository({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      }),
    );
    const screen = model.snapshot.screen;
    const queue = model.snapshot.research.queue;
    model.startTestBoarding();
    model.commandBoarding({ type: 'turn', direction: 1 });
    expect(model.snapshot.screen).toBe(screen);
    expect(model.snapshot.research.queue).toEqual(queue);
    expect(model.snapshot.boardingBattle).not.toBeNull();
    expect(methodNames(BoardingFacade)).not.toEqual(
      expect.arrayContaining(['openResearch', 'commandBattle', 'openMap']),
    );
  });
});

describe('modell-facad', () => {
  it('exposes only the commands of that case', () => {
    const boarding = methodNames(BoardingFacade);
    const battle = methodNames(BattleFacade);
    const research = methodNames(ResearchFacade);
    expect(boarding).toEqual(
      expect.arrayContaining(['commandBoarding', 'finishBoarding']),
    );
    expect(battle).not.toEqual(expect.arrayContaining(boarding));
    expect(research).toEqual(
      expect.arrayContaining(['openResearch', 'research']),
    );
    expect(research).not.toEqual(
      expect.arrayContaining(['commandBoarding', 'commandBattle']),
    );
  });
});

describe('vy-plattformsgrans', () => {
  it('turns a research drag into a pan fact before it reaches a controller', () => {
    const pointer = new ResearchPointer();
    pointer.start(1, { x: 0, y: 0 });
    expect(pointer.move(1, { x: 40, y: 10 })).toEqual([
      { type: 'research-pan', delta: { x: 40, y: 10 } },
    ]);
  });
});

describe('speltexter-i-vy', () => {
  it('stores an upgrade as an outcome and lets the view choose the sentence', () => {
    const model = new AppModel();
    model.reportError(new Error('A Colony ship is required.'));
    expect(model.snapshot.notice).toEqual({
      kind: 'action-failed',
      reason: 'A Colony ship is required.',
    });
    expect(playerNoticeText(model.snapshot.notice)).toBe(
      'A Colony ship is required.',
    );
    expect(playerNoticeText({ kind: 'upgrade-ordered' })).toBe(
      'Upgrade ordered.',
    );
    expect(JSON.stringify({ kind: 'upgrade-ordered' })).not.toContain(
      'Upgrade ordered',
    );
  });
});
