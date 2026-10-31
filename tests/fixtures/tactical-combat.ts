import type { Game } from '../../src/client/models/Game.js';
import type { AppModel } from '../../src/client/models/AppModel.js';

/** Other subsystem scenarios fight using the actual rules, holding civilian ships. */
export function completeTacticalBattles(subject: Game | AppModel): void {
  const snapshot = () =>
    'snapshot' in subject
      ? subject.snapshot.tacticalBattle
      : subject.tacticalBattle;
  for (let attempts = 0; attempts < 1000; attempts++) {
    const state = snapshot();
    if (!state) return;
    if (state.phase === 'deployment') {
      subject.commandBattle({ type: 'auto-deploy' });
      subject.commandBattle({ type: 'start' });
    } else if (state.turn === 'player') {
      const piece = state.activation
        ? state.pieces.find((p) => p.id === state.activation!.id)!
        : (state.pieces.find(
            (p) =>
              p.side === 'player' &&
              p.status === 'active' &&
              !p.activated &&
              p.type === 'Fighter',
          ) ??
          state.pieces.find(
            (p) => p.side === 'player' && p.status === 'active' && !p.activated,
          )!);
      if (!state.activation)
        subject.commandBattle({ type: 'activate', id: piece.id });
      if (piece.type === 'Fighter') subject.playBattleActivation();
      else subject.commandBattle({ type: 'end-activation' });
    } else subject.playBattleActivation();
  }
  throw new Error('Tactical battle did not terminate.');
}
