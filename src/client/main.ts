import { AppController } from './controllers/AppController.js';
import { AppModel } from './models/AppModel.js';
import { AppView } from './views/AppView.js';
import { GalaxyMapView } from './views/GalaxyMapView.js';
import './styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('The application root #app is missing.');
}

const controller = new AppController(
  new AppModel(),
  new AppView(root, (container, emit) => new GalaxyMapView(container, emit)),
);
controller.start();
if (import.meta.hot) import.meta.hot.dispose(() => controller.dispose());
