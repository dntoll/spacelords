/** speltexter-i-vy: outcomes describe what happened. The view chooses the sentence. */
export type DiscoveryFlash = {
  readonly kind: 'planet' | 'planet-explored' | 'star' | 'pirate' | 'wreck';
  readonly name: string;
};

export type PlayerNotice =
  | null
  | {
      readonly kind: 'action-failed';
      readonly reason: string;
    }
  | {
      readonly kind: 'discovery';
      readonly flash: DiscoveryFlash;
    };

export function actionFailed(error: unknown): PlayerNotice {
  return Object.freeze({
    kind: 'action-failed',
    reason:
      error instanceof Error
        ? error.message
        : 'The order could not be completed.',
  });
}
