import p5 from 'p5';
import type { MapCell } from '../models/Galaxy.js';
import { HexGeometry } from '../models/HexCoordinate.js';

/** Read-only p5 instance; hidden cells never reach the preview. */
export class SaveMapPreview {
  readonly #instance: p5;
  readonly #observer: ResizeObserver;
  #ready = false;
  #disposed = false;

  constructor(container: HTMLElement, cells: readonly MapCell[]) {
    const visible = cells.filter((cell) => cell.explored);
    const points = visible.map((cell) => HexGeometry.toPoint(cell.position));
    const minX = Math.min(...points.map((point) => point.x), 0) - 45;
    const maxX = Math.max(...points.map((point) => point.x), 0) + 45;
    const minY = Math.min(...points.map((point) => point.y), 0) - 45;
    const maxY = Math.max(...points.map((point) => point.y), 0) + 45;
    this.#instance = new p5((sketch) => {
      sketch.setup = () => {
        if (this.#disposed) return;
        sketch.createCanvas(
          Math.max(container.clientWidth, 1),
          Math.max(container.clientHeight, 1),
        );
        sketch.pixelDensity(1);
        sketch.noLoop();
        sketch.describe('Overview of explored space.');
        this.#ready = true;
      };
      sketch.draw = () => {
        if (this.#disposed) return;
        sketch.background('#091520');
        sketch.push();
        sketch.translate(sketch.width / 2, sketch.height / 2);
        sketch.scale(
          Math.min(
            (sketch.width - 20) / (maxX - minX),
            (sketch.height - 20) / (maxY - minY),
          ),
        );
        sketch.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
        visible.forEach((cell, index) => {
          const point = points[index]!;
          sketch.stroke('#345160');
          sketch.fill('#142e3b');
          sketch.beginShape();
          for (let corner = 0; corner < 6; corner++) {
            const angle = (Math.PI / 3) * corner + Math.PI / 6;
            sketch.vertex(
              point.x + 34 * Math.cos(angle),
              point.y + 34 * Math.sin(angle),
            );
          }
          sketch.endShape(sketch.CLOSE);
          if (cell.object) {
            sketch.noStroke();
            sketch.fill(
              cell.object.owned
                ? '#b0e5ce'
                : cell.object.kind === 'star'
                  ? '#efcd85'
                  : '#86adc5',
            );
            sketch.circle(
              point.x,
              point.y,
              cell.object.kind === 'star' ? 14 : 10,
            );
          }
        });
        sketch.pop();
        container
          .querySelector('canvas')
          ?.setAttribute('data-preview-rendered', 'true');
      };
    }, container);
    this.#observer = new ResizeObserver(() => {
      if (this.#ready && !this.#disposed)
        this.#instance.resizeCanvas(
          Math.max(container.clientWidth, 1),
          Math.max(container.clientHeight, 1),
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
