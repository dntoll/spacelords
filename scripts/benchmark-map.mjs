import { AppController } from '../src/client/controllers/AppController.ts';
import { AppModel } from '../src/client/models/AppModel.ts';
import { createExampleGalaxy } from '../src/client/models/exampleGalaxy.ts';
import { HexGeometry } from '../src/client/models/HexCoordinate.ts';
import { MapViewport } from '../src/client/models/MapViewport.ts';

// responsiv-stjarnkarta / rumsligt-kartindex: diagnostic timings, never CI thresholds.
function measure(action, iterations = 200) {
  for (let i = 0; i < 20; i++) action(i);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) action(i);
  return Number(((performance.now() - start) / iterations).toFixed(4));
}

const model = new AppModel(createExampleGalaxy(true));
let emit;
const controller = new AppController(model, {
  bind: (handler) => {
    emit = handler;
  },
  render() {},
  renderCamera() {},
  dispose() {},
});
controller.start();
const cells = model.snapshot.cells;
const index = new MapViewport(cells);
const camera = { center: { x: 0, y: 0 }, zoom: 1 };
const scan = () =>
  cells.filter((cell) => {
    const point = HexGeometry.toPoint(cell.position);
    return (
      Math.abs(point.x) <= 390 / 2 + 108 && Math.abs(point.y) <= 660 / 2 + 108
    );
  });
console.log(
  JSON.stringify(
    {
      worldCells: cells.length,
      viewportCells: index.query(camera, 390, 660).length,
      millisecondsPerOperation: {
        fullWorldScan: measure(scan),
        indexedViewport: measure(() => index.query(camera, 390, 660)),
        panControllerWithoutRendering: measure((i) =>
          emit({ type: 'pan', delta: { x: i % 2 ? -1 : 1, y: 0 } }),
        ),
        panGestureControllerWithoutRendering: measure((i) => {
          emit({ type: 'pointer-start', id: 1, point: { x: 180, y: 150 } });
          const point = { x: 180 + (i % 2 ? -20 : 20), y: 150 };
          emit({ type: 'pointer-move', id: 1, point });
          emit({ type: 'pointer-end', id: 1, point });
        }),
      },
    },
    null,
    2,
  ),
);
controller.dispose();
