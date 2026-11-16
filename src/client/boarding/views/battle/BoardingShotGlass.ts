import {
  boardingBrokenPane,
  type BoardingBattleState,
  type BoardingShotPane,
} from '../../models/battle/BoardingBattle.js';

/**
 * glas-krossas-nar-skottet-passerar: the state as shown while a bullet flies,
 * with every pane it has reached at `progress` already broken. The same state
 * comes back when no pane changes, so callers can skip a rebuild.
 */
export function boardingShotGlassState(
  state: BoardingBattleState,
  panes: readonly BoardingShotPane[],
  progress: number,
): BoardingBattleState {
  const reached = new Set(
    panes.filter((pane) => pane.at <= progress).map((pane) => pane.id),
  );
  const breaks = state.features.some(
    (feature) =>
      reached.has(feature.id) && !feature.destroyed && !feature.shattered,
  );
  if (!breaks) return state;
  return {
    ...state,
    features: state.features.map((feature) =>
      reached.has(feature.id) && !feature.destroyed && !feature.shattered
        ? boardingBrokenPane(feature)
        : feature,
    ),
  };
}
