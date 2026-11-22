import type { PlayerNotice } from '../models/PlayerNotice.js';

/** speltexter-i-vy: the view is the only place that turns an outcome into a sentence. */
export function playerNoticeText(notice: PlayerNotice): string | null {
  if (!notice) return null;
  switch (notice.kind) {
    case 'action-failed':
      return notice.reason;
  }
}
