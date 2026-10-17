import type { AppReadModel, Screen } from '../models/AppModel.js';
import type {
  AppPort,
  IntentHandler,
  MapFactory,
  MapPort,
} from './ViewContracts.js';
import { renderPlanet } from './PlanetView.js';
import { renderResearch } from './ResearchView.js';
import { button, element, planetIllustration } from './dom.js';

export class AppView implements AppPort {
  readonly #root: HTMLElement;
  readonly #mapFactory: MapFactory;
  #emit: IntentHandler = () => undefined;
  #screen: Screen | null = null;
  #map: MapPort | null = null;
  #container: HTMLElement | null = null;
  #panel: HTMLElement | null = null;
  #zoom: HTMLOutputElement | null = null;
  #coordinates: HTMLElement | null = null;
  #selectionKey = '';

  constructor(root: HTMLElement, mapFactory: MapFactory) {
    this.#root = root;
    this.#mapFactory = mapFactory;
  }

  bind(handler: IntentHandler): void {
    this.#emit = handler;
  }

  render(model: AppReadModel): void {
    const changedScreen = this.#screen !== model.screen;
    if (changedScreen) {
      this.#map?.dispose();
      this.#map = null;
      this.#selectionKey = '';
      this.#root.replaceChildren(this.#header(model.screen));
      const main = element('main', 'page');
      if (model.screen === 'map') main.append(this.#mapPage(model));
      else if (model.screen === 'planet' && model.planet)
        main.append(renderPlanet(model.planet, model.playerName, this.#emit));
      else main.append(renderResearch(this.#emit));
      this.#root.append(main);
      if (model.screen === 'map' && this.#container) {
        this.#map = this.#mapFactory(this.#container, (intent) =>
          this.#emit(intent),
        );
      }
      if (this.#screen !== null) {
        const heading = main.querySelector('h1');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus();
      }
      this.#screen = model.screen;
    }
    if (model.screen === 'map') {
      this.#map?.render(model);
      if (this.#zoom)
        this.#zoom.value = `${Math.round(model.camera.zoom * 100)} %`;
      if (this.#coordinates)
        this.#coordinates.textContent = `X ${model.camera.center.x.toFixed(0)} · Y ${model.camera.center.y.toFixed(0)}`;
      const key = model.selected?.position.key ?? '';
      if (key !== this.#selectionKey) {
        this.#selectionKey = key;
        this.#renderSelection(model);
      }
    }
  }

  dispose(): void {
    this.#map?.dispose();
    this.#map = null;
    this.#root.replaceChildren();
    this.#screen = null;
  }

  #header(screen: Screen): HTMLElement {
    const header = element('header', 'app-header');
    const brand = button(
      'SPACELORDS',
      () => this.#emit({ type: 'open-map' }),
      'brand',
    );
    const emblem = element('span', 'brand-mark', '✦');
    emblem.setAttribute('aria-hidden', 'true');
    brand.prepend(emblem);
    const navigation = element('nav', 'main-nav');
    navigation.setAttribute('aria-label', 'Huvudnavigation');
    const map = button(
      'Stjärnkarta',
      () => this.#emit({ type: 'open-map' }),
      screen === 'map' ? 'nav-button active' : 'nav-button',
    );
    const research = button(
      'Forskning',
      () => this.#emit({ type: 'open-research' }),
      screen === 'research' ? 'nav-button active' : 'nav-button',
    );
    if (screen === 'map') map.setAttribute('aria-current', 'page');
    if (screen === 'research') research.setAttribute('aria-current', 'page');
    navigation.append(map, research);
    header.append(
      brand,
      navigation,
      element('span', 'session-label', 'EXEMPELVÄRLD'),
    );
    return header;
  }

  #mapPage(model: AppReadModel): HTMLElement {
    const page = element('section', 'map-page');
    const titleRow = element('div', 'title-row');
    const titles = element('div');
    titles.append(
      element('p', 'eyebrow', 'DITT FÖRSTA IMPERIUM'),
      element('h1', '', 'Din plats i galaxen.'),
      element(
        'p',
        'page-description',
        'En hemvärld. En outforskad rymd. Början på något större.',
      ),
    );
    const summary = element('div', 'empire-summary');
    summary.append(element('span', '', '01'), element('p', '', 'hemvärld'));
    titleRow.append(titles, summary);
    const layout = element('div', 'map-layout');
    const frame = element('section', 'map-frame');
    frame.setAttribute('aria-label', 'Stjärnkarta och kartkontroller');
    const mapHeader = element('div', 'map-header');
    mapHeader.append(
      element('span', 'eyebrow', 'STJÄRNKARTA'),
      element('span', 'map-sector', 'SEKTOR 01'),
    );
    const container = element('div', 'map-container');
    this.#container = container;
    container.dataset.testid = 'map-container';
    const controls = element('div', 'map-controls');
    const home = button(
      'Hemplanet',
      () => this.#emit({ type: 'home' }),
      'map-control home-control',
    );
    const minus = button(
      '−',
      () =>
        this.#emit({ type: 'zoom', factor: 1 / 1.2, anchor: { x: 0, y: 0 } }),
      'map-control',
    );
    minus.setAttribute('aria-label', 'Zooma ut');
    const plus = button(
      '+',
      () => this.#emit({ type: 'zoom', factor: 1.2, anchor: { x: 0, y: 0 } }),
      'map-control',
    );
    plus.setAttribute('aria-label', 'Zooma in');
    this.#zoom = element('output', 'zoom-value');
    this.#zoom.setAttribute('aria-label', 'Kartans zoom');
    controls.append(home, minus, this.#zoom, plus);
    const status = element('div', 'map-status');
    this.#coordinates = element('span', 'map-coordinates');
    this.#coordinates.dataset.testid = 'camera-position';
    status.append(
      this.#coordinates,
      element(
        'span',
        'map-hint',
        'Dra för att panorera · Zooma med scroll eller två fingrar',
      ),
    );
    frame.append(mapHeader, container, controls, status);
    const legend = element('div', 'map-legend');
    for (const [color, label] of [
      ['star', 'Stjärna'],
      ['owned', 'Din koloni'],
      ['visible', 'Synlig rymd'],
      ['fog', 'Outforskat'],
    ]) {
      const item = element('span', 'legend-item');
      item.append(
        element('i', `legend-swatch ${color}`),
        element('span', '', label),
      );
      legend.append(item);
    }
    const mapColumn = element('div', 'map-column');
    mapColumn.append(frame, legend);
    this.#panel = element('aside', 'selection-panel panel');
    this.#panel.setAttribute('aria-label', 'Vald hexagon');
    layout.append(mapColumn, this.#panel);
    const known = element('section', 'known-objects');
    known.setAttribute('aria-label', 'Kända objekt');
    known.append(element('span', 'eyebrow', 'KÄNDA OBJEKT'));
    const objects = model.cells
      .filter((cell) => cell.object !== null)
      .toSorted(
        (left, right) =>
          Number(right.object?.owned) - Number(left.object?.owned),
      );
    for (const cell of objects) {
      const choice = button(
        cell.object?.name ?? '',
        () => this.#emit({ type: 'select', position: cell.position }),
        'object-chip',
      );
      known.append(choice);
    }
    page.append(
      titleRow,
      layout,
      known,
      element(
        'p',
        'example-note',
        'Första expeditionen · En fast exempelvärld. Byggande, forskning och spelår kommer i senare steg.',
      ),
    );
    return page;
  }

  #renderSelection(model: AppReadModel): void {
    if (!this.#panel) return;
    const cell = model.selected;
    const object = cell?.object;
    const contents: HTMLElement[] = [];
    const owned = object?.kind === 'planet' && object.owned;
    contents.push(
      element('p', 'eyebrow', owned ? 'DIN HEMVÄRLD' : 'VALD HEXAGON'),
    );
    if (owned) contents.push(planetIllustration());
    contents.push(
      element(
        'h2',
        'selection-title',
        object?.name ?? (cell?.visible ? 'Tom rymd' : 'Outforskat område'),
      ),
    );
    contents.push(
      element(
        'p',
        'selection-description',
        owned
          ? 'Din första koloni bland stjärnorna.'
          : object?.kind === 'star'
            ? 'En stjärna lyser genom den outforskade rymden.'
            : object?.kind === 'planet'
              ? 'En obebodd värld i din närmaste omgivning.'
              : cell?.visible
                ? 'Här finns inga kända himlakroppar.'
                : 'Det som finns här ligger ännu bortom din sikt.',
      ),
    );
    if (cell)
      contents.push(
        element(
          'p',
          'coordinate-label',
          `HEX ${cell.position.q}, ${cell.position.r}`,
        ),
      );
    if (object?.kind === 'planet')
      contents.push(
        element('span', 'pill', owned ? model.playerName : 'Obebodd'),
      );
    if (owned)
      contents.push(
        button(
          'Öppna planet',
          () => this.#emit({ type: 'open-planet' }),
          'button open-planet',
        ),
      );
    const note = element('div', 'sight-note');
    note.append(
      element('span', 'eyebrow', 'DIN HORISONT'),
      element(
        'p',
        '',
        'Du ser hemplaneten och dess sex grannhexagoner. Avlägsna stjärnor visar vägen vidare.',
      ),
    );
    contents.push(note);
    this.#panel.replaceChildren(...contents);
  }
}
