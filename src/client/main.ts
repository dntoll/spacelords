import { AppController } from './controllers/AppController.js';
import { AppModel } from './models/AppModel.js';
import { AppView } from './views/AppView.js';
import './styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('The application root #app is missing.');
}

new AppController(new AppModel(), new AppView(root)).start();
