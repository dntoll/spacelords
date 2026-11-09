/** speltexter-i-vy: outcomes describe what happened. The view chooses the sentence. */
export type PlayerNotice =
  | null
  | { readonly kind: 'upgrade-ordered' }
  | { readonly kind: 'shipyard-queued' }
  | {
      readonly kind: 'transport-preparation-queued';
      readonly product: string;
      readonly planet: string | null;
    }
  | { readonly kind: 'discoveries'; readonly names: readonly string[] }
  | { readonly kind: 'action-failed'; readonly reason: string };

export function actionFailed(error: unknown): PlayerNotice {
  return Object.freeze({
    kind: 'action-failed',
    reason:
      error instanceof Error
        ? error.message
        : 'The order could not be completed.',
  });
}

export function discoveriesNotice(names: readonly string[]): PlayerNotice {
  return Object.freeze({
    kind: 'discoveries',
    names: Object.freeze([...names]),
  });
}
