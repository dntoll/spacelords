import { renderSaveSlots, clearSlotDialog } from './SaveSlotsView.js';
import type { MapCell } from '../models/Galaxy.js';
import type { AppReadModel, Screen } from '../models/AppModel.js';
import { HexCoordinate } from '../models/HexCoordinate.js';
import type { TurnFrame } from '../models/Game.js';
import type {
  AppPort,
  FleetPreviewFactory,
  IntentHandler,
  MapFactory,
  MapPort,
} from './ViewContracts.js';
import { renderBuildSelection } from './BuildSelectionView.js';
import { renderPlanet } from './PlanetView.js';
import { renderResearch } from './ResearchView.js';
import { renderFleetShips } from './ShipView.js';
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
  #previews: { dispose(): void }[] = [];
  #saveKey = '';
  #dialog: HTMLDialogElement | null = null;
  #clearReturnSlot: number | null = null;
  #fleetPreview: { dispose(): void } | null = null;
  #planetScroll = new Map<string, number>();

  constructor(
    root: HTMLElement,
    mapFactory: MapFactory,
    private readonly previewFactory?: (
      container: HTMLElement,
      cells: readonly MapCell[],
    ) => { dispose(): void },
    private readonly fleetPreviewFactory?: FleetPreviewFactory,
  ) {
    this.#root = root;
    this.#mapFactory = mapFactory;
  }

  bind(handler: IntentHandler): void {
    this.#emit = handler;
  }

  render(model: AppReadModel): void {
    this.#fleetPreview?.dispose();
    this.#fleetPreview = null;
    if (model.screen === 'saves') {
      const key = JSON.stringify(model.saveSlots);
      if (this.#screen !== 'saves' || this.#saveKey !== key) {
        this.#map?.dispose();
        this.#map = null;
        this.#previews.forEach((preview) => preview.dispose());
        this.#previews = [];
        this.#root.replaceChildren(this.#header('saves'));
        const main = element('main', 'page');
        main.append(renderSaveSlots(model, this.#emit));
        this.#root.append(main);
        for (const slot of model.saveSlots) {
          const container = main.querySelector<HTMLElement>(
            `[data-preview-slot="${slot.id}"]`,
          );
          if (container && slot.lastPlayed && this.previewFactory)
            this.#previews.push(this.previewFactory(container, slot.cells));
        }
        this.#saveKey = key;
      }
      if (model.pendingClearSlot !== null && !this.#dialog) {
        this.#clearReturnSlot = model.pendingClearSlot;
        this.#dialog = clearSlotDialog(model.pendingClearSlot, this.#emit);
        this.#root.append(this.#dialog);
        this.#dialog.showModal();
      } else if (model.pendingClearSlot === null && this.#dialog) {
        this.#dialog.close();
        this.#dialog.remove();
        this.#dialog = null;
        const card = this.#root.querySelector(
          `[data-slot="${this.#clearReturnSlot}"]`,
        );
        (
          card?.querySelector<HTMLElement>('.save-clear:not(:disabled)') ??
          card?.querySelector<HTMLElement>('.save-start')
        )?.focus();
        this.#clearReturnSlot = null;
      }
      this.#screen = 'saves';
      this.#renderNotice(model);
      return;
    }
    this.#previews.forEach((preview) => preview.dispose());
    this.#previews = [];
    this.#dialog?.close();
    this.#dialog?.remove();
    this.#dialog = null;
    const changedScreen = this.#screen !== model.screen;
    const fleetScroll =
      this.#root.querySelector('.fleet-collection')?.scrollTop ?? 0;
    const active = document.activeElement;
    const focusLabel = active?.getAttribute('aria-label');
    const focusScope = active?.closest(
      '[data-project-id], [data-site-index], .fleet-card',
    );
    const scopeSelector = focusScope?.hasAttribute('data-project-id')
      ? `[data-project-id="${focusScope.getAttribute('data-project-id')}"]`
      : focusScope?.hasAttribute('data-site-index')
        ? `[data-site-index="${focusScope.getAttribute('data-site-index')}"]`
        : focusScope?.hasAttribute('data-fleet-id')
          ? `[data-fleet-id="${focusScope.getAttribute('data-fleet-id')}"]`
          : null;
    if (this.#screen === 'planet') {
      const panel = this.#root.querySelector<HTMLElement>('.planet-content');
      if (panel?.dataset.planetId)
        this.#planetScroll.set(panel.dataset.planetId, panel.scrollTop);
    }
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
            this.#emit,
            model.fleets,
            model,
          ),
        );
      else if (model.screen === 'build-selection' && model.planet)
        main.append(renderBuildSelection(model, this.#emit));
      else if (model.screen === 'fleets')
        main.append(renderFleets(model, this.#emit));
      else
        main.append(
          renderResearch(
            model.research,
            model.phase !== 'planning',
            this.#emit,
          ),
        );
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
            this.#emit,
            model.fleets,
            model,
          ),
        );
    } else if (model.screen === 'build-selection') {
      const focused =
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.type === 'search';
      const selection = focused
        ? (document.activeElement as HTMLInputElement).selectionStart
        : null;
      const scroll =
        this.#root.querySelector('.planet-content')?.scrollTop ?? 0;
      this.#root
        .querySelector('main')
        ?.replaceChildren(renderBuildSelection(model, this.#emit));
      const panel = this.#root.querySelector('.planet-content');
      if (panel) panel.scrollTop = scroll;
      if (focused) {
        const search = this.#root.querySelector<HTMLInputElement>(
          'input[type="search"]',
        );
        search?.focus({ preventScroll: true });
        if (selection !== null) search?.setSelectionRange(selection, selection);
      }
    } else if (model.screen === 'fleets')
      this.#root
        .querySelector('main')
        ?.replaceChildren(renderFleets(model, this.#emit));
    if (!changedScreen && model.screen === 'fleets') {
      const collection = this.#root.querySelector('.fleet-collection');
      if (collection) collection.scrollTop = fleetScroll;
    }
    if (
      model.screen === 'fleets' &&
      model.selectedFleet &&
      this.fleetPreviewFactory
    ) {
      const container = this.#root.querySelector<HTMLElement>(
        '.fleet-location-map',
      );
      if (container)
        this.#fleetPreview = this.fleetPreviewFactory(
          container,
          model.cells,
          model.selectedFleet,
        );
    }
    if (
      !changedScreen &&
      (model.screen === 'planet' || model.screen === 'fleets') &&
      focusLabel
    ) {
      const scope = scopeSelector
        ? this.#root.querySelector(scopeSelector)
        : this.#root;
      const focus =
        [...(scope?.querySelectorAll<HTMLElement>('[aria-label]') ?? [])].find(
          (node) => node.getAttribute('aria-label') === focusLabel,
        ) ?? scope?.querySelector<HTMLElement>('.fleet-name-button');
      focus?.focus({ preventScroll: true });
    }
    if (model.screen === 'planet' && model.planet) {
      const panel = this.#root.querySelector<HTMLElement>('.planet-content');
      if (panel) {
        panel.dataset.planetId = model.planet.id;
        panel.scrollTop = this.#planetScroll.get(model.planet.id) ?? 0;
      }
      if (changedScreen && model.returnSite !== null)
        this.#root
          .querySelector<HTMLElement>(`[data-site-index="${model.returnSite}"]`)
          ?.focus({ preventScroll: true });
    }
    if (!changedScreen && model.screen === 'research')
      this.#root
        .querySelector('main')
        ?.replaceChildren(
          renderResearch(
            model.research,
            model.phase !== 'planning',
            this.#emit,
          ),
        );
    if (model.screen === 'map') {
      this.#map?.render(model);
      if (this.#known) {
        const options = model.cells
          .filter((cell) => cell.object)
          .toSorted(
            (a, b) => Number(b.object?.owned) - Number(a.object?.owned),
          );
        this.#known.replaceChildren(
          ...options.map((cell) => {
            const option = element('option', '', cell.object!.name);
            option.value = cell.position.key;
            return option;
          }),
        );
        this.#known.value = model.selected?.position.key ?? '';
      }
      if (this.#zoom)
        this.#zoom.value = `${Math.round(model.camera.zoom * 100)}%`;
      if (this.#coordinates)
        this.#coordinates.textContent = `X ${model.camera.center.x.toFixed(0)} · Y ${model.camera.center.y.toFixed(0)}`;
      const key = JSON.stringify({
        orders: model.planetOrders,
        phase: model.phase,
        selected: model.selected,
        mapFleet: model.fleets.find((fleet) => fleet.id === model.mapFleetId),
        preview: model.fleetDestinationPreview,
        dragging: model.fleetDragging,
        fleets: model.fleets.filter(
          (fleet) => fleet.position?.key === model.selected?.position.key,
        ),
        destination: model.destinationFleetId,
      });
      if (key !== this.#selectionKey) {
        this.#selectionKey = key;
        if (this.#known) this.#known.value = model.selected?.position.key ?? '';
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
    this.#renderNotice(model);
  }

  #renderNotice(model: AppReadModel): void {
    const existingNotice = this.#root.querySelector('.game-notice');
    if (model.notice) {
      const notice = element('p', 'game-notice', model.notice);
      notice.setAttribute('role', 'status');
      existingNotice?.replaceWith(notice);
      if (!existingNotice) this.#root.append(notice);
    } else existingNotice?.remove();
  }

  dispose(): void {
    this.#fleetPreview?.dispose();
    this.#fleetPreview = null;
    this.#previews.forEach((preview) => preview.dispose());
    this.#previews = [];
    this.#dialog?.close();
    this.#dialog?.remove();
    this.#dialog = null;
    this.#map?.dispose();
    this.#map = null;
    this.#root.replaceChildren();
    this.#screen = null;
  }

  #header(screen: Screen): HTMLElement {
    const header = element('header', 'app-header');
    const brand = button(
      'SPACELORDS',
      () => this.#emit({ type: 'open-saves' }),
      'brand',
    );
    brand.setAttribute('aria-label', 'Saved games');
    brand.title = 'Saved games';
    const emblem = element('span', 'brand-mark', '✦');
    emblem.setAttribute('aria-hidden', 'true');
    brand.prepend(emblem);
    const navigation = element('nav', 'main-nav');
    navigation.setAttribute('aria-label', 'Main navigation');
    if (screen === 'saves') {
      header.append(brand);
      return header;
    }
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
      const [q, r] = (this.#known?.value ?? '').split(',').map(Number);
      if (Number.isInteger(q) && Number.isInteger(r))
        this.#emit({ type: 'select', position: new HexCoordinate(q!, r!) });
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
      element(
        'p',
        'map-order-legend hud',
        'S: empty building sites · Q: idle shipyards',
      ),
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
    const selectedFleet = model.fleets.find(
      (fleet) =>
        !model.destinationFleetId &&
        fleet.id === model.mapFleetId &&
        Object.values(fleet.ships).some((count) => count > 0),
    );
    this.#panel.setAttribute(
      'aria-label',
      selectedFleet ? 'Selected fleet' : 'Selected hex',
    );
    if (selectedFleet) {
      const title = element('div', 'selection-heading');
      title.append(
        element('h2', '', selectedFleet.name),
        element(
          'span',
          'coordinate-label',
          `HEX ${selectedFleet.position?.q}, ${selectedFleet.position?.r}`,
        ),
      );
      const ships = Object.entries(selectedFleet.ships)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${count} ${type}`)
        .join(' · ');
      const destination = model.fleetDragging
        ? model.fleetDestinationPreview
          ? `Destination preview: HEX ${model.fleetDestinationPreview.key}`
          : 'Choose a destination on the map.'
        : selectedFleet.destination
          ? `Destination: HEX ${selectedFleet.destination.key}`
          : 'No destination';
      const status = element('p', 'fleet-destination-status', destination);
      status.setAttribute('aria-live', 'polite');
      const edit = button('Edit fleet', () =>
        this.#emit({ type: 'open-fleet', id: selectedFleet.id }),
      );
      const set = button('Set destination', () =>
        this.#emit({ type: 'begin-destination', id: selectedFleet.id }),
      );
      const actions = element('div', 'fleet-map-actions');
      set.disabled = model.phase !== 'planning';
      actions.append(edit, set);
      if (selectedFleet.destination) {
        const clear = button('Clear destination', () =>
          this.#emit({ type: 'clear-destination', id: selectedFleet.id }),
        );
        clear.disabled = model.phase !== 'planning';
        actions.append(clear);
      }
      this.#panel.replaceChildren(
        title,
        element('p', 'muted-note', ships),
        renderFleetShips(selectedFleet),
        status,
        actions,
      );
      return;
    }
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
      ? 'A colony of your empire.'
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
    const orderStatus = model.planetOrders.find(
      (status) => status.position.key === cell?.position.key,
    );
    if (orderStatus)
      contents.push(
        element(
          'p',
          'order-status',
          `${orderStatus.emptySites} empty building sites · ${orderStatus.emptyQueues} idle shipyards`,
        ),
      );
    if (cell)
      for (const fleet of model.fleets.filter(
        (candidate) =>
          candidate.position?.key === cell.position.key &&
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
        if (
          object?.kind === 'planet' &&
          !owned &&
          fleet.ships['Colony ship'] > 0
        ) {
          const colonize = button(
            'Colonize',
            () => this.#emit({ type: 'colonize', id: fleet.id }),
            'button',
          );
          colonize.disabled = model.phase !== 'planning';
          fleetInfo.append(colonize);
        }
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
