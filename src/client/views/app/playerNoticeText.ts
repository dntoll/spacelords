import type { PlayerNotice } from '../../models/app/PlayerNotice.js';

/** speltexter-i-vy: the view is the only place that turns an outcome into a sentence. */
export function playerNoticeText(notice: PlayerNotice): string | null {
  if (!notice) return null;
  switch (notice.kind) {
    case 'upgrade-ordered':
      return 'Upgrade ordered.';
    case 'shipyard-queued':
      return 'Shipyard construction queued.';
    case 'discoveries':
      return `New discoveries: ${notice.names.join(', ')}.`;
    case 'action-failed':
      return notice.reason;
  }
}
