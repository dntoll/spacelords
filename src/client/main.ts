import { AppController } from './controllers/AppController.js';
import { AppModel } from './models/AppModel.js';
import { AppView } from './views/AppView.js';
import { GalaxyMapView } from './views/GalaxyMapView.js';
import './styles.css';
import { SaveMapPreview } from './views/SaveMapPreview.js';
import { BrowserSaveRepository } from './storage/BrowserSaveRepository.js';
import { createExpandedGalaxy } from './models/exampleGalaxy.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('The application root #app is missing.');
}

const controller = new AppController(
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
  ),
);
controller.start();
if (import.meta.hot) import.meta.hot.dispose(() => controller.dispose());
