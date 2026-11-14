import type { Point } from '../../../common/HexCoordinate.js';
import { MapGesture } from '../star-map/MapGesture.js';

/** vy-plattformsgrans: research pointer motion becomes pan and zoom facts. */
export type ResearchPointerFact =
  | { readonly type: 'research-pan'; readonly delta: Point }
  | {
      readonly type: 'research-zoom';
      readonly factor: number;
      readonly anchor: Point;
    };

export class ResearchPointer {
  readonly #gesture = new MapGesture();

  start(id: number, point: Point): readonly ResearchPointerFact[] {
    this.#gesture.start(id, point);
    return [];
  }

  move(id: number, point: Point): readonly ResearchPointerFact[] {
    const action = this.#gesture.move(id, point);
    if (action.type === 'none') return [];
    if (action.type === 'pan')
      return [{ type: 'research-pan', delta: action.delta }];
    return [
      {
        type: 'research-zoom',
        factor: action.factor,
        anchor: action.previousCenter,
      },
      {
        type: 'research-pan',
        delta: {
          x: action.center.x - action.previousCenter.x,
          y: action.center.y - action.previousCenter.y,
        },
      },
    ];
  }

  end(id: number): readonly ResearchPointerFact[] {
    this.#gesture.end(id);
    return [];
  }

  cancel(): readonly ResearchPointerFact[] {
    this.#gesture.cancel();
    return [];
  }
}
