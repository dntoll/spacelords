import p5 from 'p5';
import type { FleetSnapshot } from '../models/Game.js';
import type { MapCell } from '../models/Galaxy.js';
import { HexGeometry } from '../models/HexCoordinate.js';

// flottbyggar-minikarta: only the same read data as Star map reaches this view.
export class FleetLocationPreview {
  readonly #instance: p5;
  readonly #observer: ResizeObserver;
  #ready = false;
  #disposed = false;
  constructor(
    container: HTMLElement,
    cells: readonly MapCell[],
    fleet: FleetSnapshot,
  ) {
    const points = cells.map((cell) => HexGeometry.toPoint(cell.position));
    const minX = Math.min(...points.map((point) => point.x)) - HexGeometry.size;
    const maxX = Math.max(...points.map((point) => point.x)) + HexGeometry.size;
    const minY = Math.min(...points.map((point) => point.y)) - HexGeometry.size;
    const maxY = Math.max(...points.map((point) => point.y)) + HexGeometry.size;
    this.#instance = new p5((sketch) => {
      sketch.setup = () => {
        if (this.#disposed) return;
        sketch.createCanvas(
          Math.max(1, container.clientWidth),
          Math.max(1, container.clientHeight),
        );
        sketch.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
        sketch.noLoop();
        sketch.describe(
          fleet.position
            ? `Location of ${fleet.name} on the star map.`
            : `${fleet.name} has no position until its first ship joins.`,
        );
        this.#ready = true;
      };
      sketch.draw = () => {
        if (this.#disposed) return;
        sketch.background('#091520');
        const scale = Math.min(
          (sketch.width - 20) / (maxX - minX),
          (sketch.height - 20) / (maxY - minY),
        );
        sketch.push();
        sketch.translate(sketch.width / 2, sketch.height / 2);
        sketch.scale(scale);
        sketch.translate(-(maxX + minX) / 2, -(maxY + minY) / 2);
        cells.forEach((cell, index) => {
          const point = points[index]!;
          sketch.stroke(cell.visible ? '#3e636b' : '#20323e');
          sketch.strokeWeight(0.6 / scale);
          sketch.fill(cell.visible ? '#16353d' : '#0e202c');
          sketch.beginShape();
          for (let corner = 0; corner < 6; corner++) {
            const angle = (Math.PI / 3) * corner - Math.PI / 6;
            sketch.vertex(
              point.x + HexGeometry.size * Math.cos(angle),
              point.y + HexGeometry.size * Math.sin(angle),
            );
          }
          sketch.endShape(sketch.CLOSE);
          if (cell.object) {
            sketch.noStroke();
            sketch.fill(cell.object.kind === 'star' ? '#efcd85' : '#aee5d0');
            sketch.circle(
              point.x,
              point.y,
              (cell.object.kind === 'star' ? 5 : 3) / scale,
            );
          }
        });
        if (fleet.position) {
          const position = HexGeometry.toPoint(fleet.position);
          sketch.noFill();
          sketch.stroke('#ffdc88');
          sketch.strokeWeight(2 / scale);
          sketch.circle(position.x, position.y, 16 / scale);
          sketch.line(
            position.x - 12 / scale,
            position.y,
            position.x + 12 / scale,
            position.y,
          );
          sketch.line(
            position.x,
            position.y - 12 / scale,
            position.x,
            position.y + 12 / scale,
          );
        }
        sketch.pop();
        const canvas = container.querySelector('canvas');
        if (canvas) {
          canvas.dataset.fleetPreviewRendered = 'true';
          canvas.dataset.fleetPosition = fleet.position?.key ?? '';
        }
      };
    }, container);
    this.#observer = new ResizeObserver(() => {
      if (this.#ready && !this.#disposed)
        this.#instance.resizeCanvas(
          Math.max(1, container.clientWidth),
          Math.max(1, container.clientHeight),
        );
    });
    this.#observer.observe(container);
  }
  dispose(): void {
    this.#disposed = true;
    this.#observer.disconnect();
    this.#instance.remove();
  }
}
