import type { AppReadModel, Screen } from '../models/AppModel.js';
import type { TurnFrame } from '../models/Game.js';
import type {
  AppPort,
  IntentHandler,
  MapFactory,
  MapPort,
} from './ViewContracts.js';
import { renderPlanet } from './PlanetView.js';
import { renderResearch } from './ResearchView.js';
import { renderFleets } from './FleetView.js';
import { button, element } from './dom.js';

export class AppView implements AppPort {
  readonly #root: HTMLElement;
  readonly #mapFactory: MapFactory;
  #emit: IntentHandler = () => undefined;
  #screen: Screen | null = null;
  #map: MapPort | null = null;
  #container: HTMLElement | null = null;
  #panel: HTMLElement | null = null;
  #known: HTMLSelectElement | null = null;
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
        main.append(
          renderPlanet(
            model.planet,
            model.playerName,
            model.planetTab,
            this.#emit,
            model.fleets,
          ),
        );
      else if (model.screen === 'fleets')
        main.append(renderFleets(model, this.#emit));
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
        heading?.focus({ preventScroll: true });
      }
      this.#screen = model.screen;
    } else if (model.screen === 'planet' && model.planet) {
      this.#root
        .querySelector('main')
        ?.replaceChildren(
          renderPlanet(
            model.planet,
            model.playerName,
            model.planetTab,
            this.#emit,
            model.fleets,
          ),
        );
      this.#root
        .querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
        ?.focus({ preventScroll: true });
    } else if (model.screen === 'fleets')
      this.#root
        .querySelector('main')
        ?.replaceChildren(renderFleets(model, this.#emit));
    if (model.screen === 'map') {
      this.#map?.render(model);
      if (this.#zoom)
        this.#zoom.value = `${Math.round(model.camera.zoom * 100)}%`;
      if (this.#coordinates)
        this.#coordinates.textContent = `X ${model.camera.center.x.toFixed(0)} · Y ${model.camera.center.y.toFixed(0)}`;
      const key = JSON.stringify({
        selected: model.selected,
        fleets: model.fleets.filter(
          (fleet) => fleet.position.key === model.selected?.position.key,
        ),
        destination: model.destinationFleetId,
      });
      if (key !== this.#selectionKey) {
        this.#selectionKey = key;
        if (this.#known) this.#known.value = key;
        this.#renderSelection(model);
      }
      const existing = this.#root.querySelector('.turn-summary');
      if (model.phase === 'summary') {
        const summary = element('section', 'turn-summary');
        summary.setAttribute('role', 'dialog');
        summary.append(
          element('h2', '', 'Turn summary'),
          ...model.events
            .filter((event) => event.round === model.round - 1)
            .map((event) => element('p', '', event.text)),
          button(
            'Continue',
            () => this.#emit({ type: 'continue-planning' }),
            'button',
          ),
        );
        existing?.replaceWith(summary);
        if (!existing) this.#root.append(summary);
      } else existing?.remove();
    }
    const existingNotice = this.#root.querySelector('.game-notice');
    if (model.notice) {
      const notice = element('p', 'game-notice', model.notice);
      notice.setAttribute('role', 'status');
      existingNotice?.replaceWith(notice);
      if (!existingNotice) this.#root.append(notice);
    } else existingNotice?.remove();
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
    navigation.setAttribute('aria-label', 'Main navigation');
    for (const [target, label] of [
      ['map', 'Star map'],
      ['research', 'Research'],
      ['fleets', 'Fleets'],
    ] as const) {
      const choice = button(
        label,
        () =>
          this.#emit({
            type:
              target === 'map'
                ? 'open-map'
                : target === 'research'
                  ? 'open-research'
                  : 'open-fleets',
          }),
        'nav-button',
      );
      if (screen === target) choice.setAttribute('aria-current', 'page');
      navigation.append(choice);
    }
    header.append(brand, navigation);
    return header;
  }

  #mapPage(model: AppReadModel): HTMLElement {
    const page = element('section', 'map-page');
    page.append(element('h1', 'visually-hidden', 'Star map'));
    this.#container = element('div', 'map-container');
    this.#container.dataset.testid = 'map-container';
    const known = element('label', 'known-objects hud');
    known.append(element('span', 'visually-hidden', 'Known objects'));
    this.#known = element('select');
    this.#known.append(element('option', '', 'Known objects'));
    this.#known.options[0]!.value = '';
    this.#known.options[0]!.disabled = true;
    const objects = model.cells
      .filter((cell) => cell.object !== null)
      .toSorted(
        (left, right) =>
          Number(right.object?.owned) - Number(left.object?.owned),
      );
    for (const cell of objects) {
      const option = element('option', '', cell.object?.name);
      option.value = cell.position.key;
      this.#known.append(option);
    }
    this.#known.addEventListener('change', () => {
      const selected = objects.find(
        (cell) => cell.position.key === this.#known?.value,
      );
      if (selected) this.#emit({ type: 'select', position: selected.position });
    });
    known.append(this.#known);
    const controls = element('div', 'map-controls hud');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Map controls');
    const home = button(
      'Homeworld',
      () => this.#emit({ type: 'home' }),
      'map-control home-control',
    );
    const minus = button(
      '−',
      () =>
        this.#emit({ type: 'zoom', factor: 1 / 1.2, anchor: { x: 0, y: 0 } }),
      'map-control',
    );
    minus.setAttribute('aria-label', 'Zoom out');
    const plus = button(
      '+',
      () => this.#emit({ type: 'zoom', factor: 1.2, anchor: { x: 0, y: 0 } }),
      'map-control',
    );
    plus.setAttribute('aria-label', 'Zoom in');
    this.#zoom = element('output', 'zoom-value');
    this.#zoom.setAttribute('aria-label', 'Map zoom');
    controls.append(home, minus, this.#zoom, plus);
    this.#coordinates = element('span', 'map-coordinates');
    this.#coordinates.dataset.testid = 'camera-position';
    this.#panel = element('aside', 'selection-panel hud');
    this.#panel.setAttribute('aria-label', 'Selected hex');
    page.append(
      this.#container,
      known,
      controls,
      this.#coordinates,
      this.#panel,
    );
    page.append(
      button('End turn', () => this.#emit({ type: 'end-turn' }), 'end-turn'),
    );
    return page;
  }

  #renderSelection(model: AppReadModel): void {
    if (!this.#panel) return;
    const cell = model.selected;
    const object = cell?.object;
    const owned = object?.kind === 'planet' && object.owned;
    const title = element('div', 'selection-heading');
    title.append(
      element(
        'h2',
        '',
        object?.name ?? (cell?.visible ? 'Empty space' : 'Unexplored space'),
      ),
    );
    if (cell)
      title.append(
        element(
          'span',
          'coordinate-label',
          `HEX ${cell.position.q}, ${cell.position.r}`,
        ),
      );
    const description = owned
      ? 'Your first colony among the stars.'
      : object?.kind === 'star'
        ? 'A star shining through unexplored space.'
        : object?.kind === 'planet'
          ? 'An uninhabited world near your homeworld.'
          : cell?.visible
            ? 'No known celestial bodies here.'
            : 'This region lies beyond your current sight.';
    const contents: HTMLElement[] = [
      title,
      element('p', 'selection-description', description),
    ];
    const destinationFleet = model.destinationFleetId
      ? model.fleets.find((fleet) => fleet.id === model.destinationFleetId)
      : null;
    if (destinationFleet)
      contents.push(
        element(
          'p',
          'destination-mode',
          `Choose a destination for ${destinationFleet.name}.`,
        ),
        button('Cancel', () => this.#emit({ type: 'open-map' }), 'button'),
      );
    if (object?.kind === 'planet')
      contents.push(
        element('span', 'pill', owned ? model.playerName : 'Uninhabited'),
      );
    if (owned)
      contents.push(
        button(
          'Open planet',
          () => this.#emit({ type: 'open-planet' }),
          'button open-planet',
        ),
      );
    if (cell)
      for (const fleet of model.fleets.filter(
        (candidate) =>
          candidate.position.key === cell.position.key &&
          Object.values(candidate.ships).some((count) => count > 0),
      )) {
        const fleetInfo = element('div', 'fleet-summary');
        const ships = Object.entries(fleet.ships)
          .filter(([, count]) => count > 0)
          .map(([type, count]) => `${count} ${type}`)
          .join(' · ');
        fleetInfo.append(
          element('h3', '', fleet.name),
          element(
            'p',
            'muted-note',
            `${ships}${fleet.destination ? ` · destination ${fleet.destination.key}` : ''}`,
          ),
          button(
            'Edit fleet',
            () => this.#emit({ type: 'open-fleet', id: fleet.id }),
            'button',
          ),
          button(
            'Set destination',
            () => this.#emit({ type: 'begin-destination', id: fleet.id }),
            'button',
          ),
        );
        if (fleet.destination)
          fleetInfo.append(
            button(
              'Clear destination',
              () => this.#emit({ type: 'clear-destination', id: fleet.id }),
              'button',
            ),
          );
        contents.push(fleetInfo);
      }
    this.#panel.replaceChildren(...contents);
  }

  animateTurnStep(frame: TurnFrame): Promise<void> {
    return this.#map?.animateTurnStep?.(frame) ?? Promise.resolve();
  }
}
