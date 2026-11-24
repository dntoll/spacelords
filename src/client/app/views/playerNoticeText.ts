import type { PlayerNotice } from '../models/PlayerNotice.js';

/** speltexter-i-vy: the view is the only place that turns an outcome into a sentence. */
export function playerNoticeText(notice: PlayerNotice): string | null {
  if (!notice) return null;
  switch (notice.kind) {
    case 'action-failed':
      return notice.reason;
    case 'discovery': {
      if (notice.flash.kind === 'event') return notice.flash.name;
      const label =
        notice.flash.kind === 'pirate'
          ? 'Pirate ship in sight'
          : notice.flash.kind === 'star'
            ? 'Star explored'
            : notice.flash.kind === 'planet-explored'
              ? 'Planet explored'
              : notice.flash.kind === 'wreck'
                ? 'Wreck discovered'
                : 'Planet discovered';
      return `${label}: ${notice.flash.name}.`;
    }
  }
}
