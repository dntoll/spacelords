import { MasterController } from './controllers/app/MasterController.js';
import { AppModel } from './models/AppModel.js';
import { AppView } from './views/app/AppView.js';
import { GalaxyMapView } from './views/star-map/GalaxyMapView.js';
import { BattleMapView } from './space-battle/views/index.js';
import { BoardingMapView } from './boarding/views/index.js';
import './styles.css';
import { SaveMapPreview } from './views/saves/SaveMapPreview.js';
import { BrowserSaveRepository } from './storage/BrowserSaveRepository.js';
import { createExpandedGalaxy } from './models/exampleGalaxy.js';
import { testBoardingMap } from './boarding/models/index.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('The application root #app is missing.');
}

const controller = new MasterController(
  new AppModel(
    createExpandedGalaxy(),
    new BrowserSaveRepository({
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    }),
  ),
  new AppView(
    root,
    (container, emit) => new GalaxyMapView(container, emit),
    (container, cells) => new SaveMapPreview(container, cells),
    (container, select, viewport) =>
      new BattleMapView(container, select, viewport),
    (container, select, map) =>
      new BoardingMapView(container, map ?? testBoardingMap, select),
  ),
);
controller.start();
if (import.meta.hot) import.meta.hot.dispose(() => controller.dispose());
