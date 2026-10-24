import { bindMapSelectionScroll } from './MapSelectionScroll.js';
import { renderMapTradeSelection } from './StarMapTradeView.js';
import { renderMapFleetPanel } from './FleetMapPanel.js';
import { renderMapLocationHeading } from './MapLocationHeading.js';
import { renderSaveSlots, clearSlotDialog } from './SaveSlotsView.js';
import { needsAttention } from '../models/Decisions.js';
import type { MapCell } from '../models/Galaxy.js';
import type { AppReadModel, Screen } from '../models/AppModel.js';
import { HexCoordinate } from '../models/HexCoordinate.js';
import type { TurnFrame } from '../models/Game.js';
import type {
  AppPort,
  IntentHandler,
  MapFactory,
  MapPort,
} from './ViewContracts.js';
import { renderBuildSelection } from './BuildSelectionView.js';
import { renderPlanet } from './PlanetView.js';
import { renderResearch } from './ResearchView.js';
import { updateResearchCamera } from './ResearchTreeView.js';
import { renderSupply } from './SupplyView.js';
import { button, element } from './dom.js';
import { renderDecisions, renderTurnWarning } from './EmpireView.js';
import { renderTurnActions } from './TurnActionsView.js';

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
  #cancelSelectionGesture: (() => void) | null = null;
  #previews: { dispose(): void }[] = [];
  #saveKey = '';
  #dialog: HTMLDialogElement | null = null;
  #clearReturnSlot: number | null = null;
  #planetScroll = new Map<string, number>();
  #decisionDialog: HTMLDialogElement | null = null;
  #researchKey = '';
  #researchViewport: HTMLElement | null = null;
  #researchObserver: ResizeObserver | null = null;
  #supplyScroll = 0;
  #supplyKey = '';

  constructor(
    root: HTMLElement,
    mapFactory: MapFactory,
    private readonly previewFactory?: (
      container: HTMLElement,
      cells: readonly MapCell[],
    ) => { dispose(): void },
  ) {
    this.#root = root;
    this.#mapFactory = mapFactory;
  }

  bind(handler: IntentHandler): void {
    this.#emit = handler;
  }

  render(model: AppReadModel): void {
    const supplyActive = document.activeElement;
    const supplyFocus =
      supplyActive instanceof HTMLElement
        ? supplyActive.dataset.focusKey
        : undefined;
    const supplyCaret =
      supplyActive instanceof HTMLInputElement
        ? supplyActive.selectionStart
        : null;
    const changedSupplyMaterial =
      this.#screen === 'supply' &&
      (this.#root.querySelector('.supply-material-heading h2')?.textContent ??
        null) !== model.supplySelection.material;
    if (this.#screen === 'supply')
      this.#supplyScroll =
        this.#root.querySelector('.supply-content')?.scrollTop ?? 0;
    if (model.screen !== 'research') {
      this.#researchObserver?.disconnect();
      this.#researchObserver = null;
      this.#researchViewport = null;
    }
    this.#decisionDialog?.close();
    this.#decisionDialog?.remove();
    this.#decisionDialog = null;
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
    const active = document.activeElement;
    const editingName =
      active instanceof HTMLInputElement &&
      active.classList.contains('fleet-name-input');
    // flottnamn-direktredigering: browser blur can fire before a replaced input disconnects.
    if (editingName) active.dataset.rendering = 'true';
    const nameCaret = editingName
      ? [active.selectionStart, active.selectionEnd]
      : null;
    const selectionScroll = this.#panel?.scrollTop ?? 0;
    const previousMapFleet = this.#panel
      ?.querySelector('.selected-fleet-card')
      ?.getAttribute('data-fleet-id');
    const wasChoosingDestination = !!this.#panel?.querySelector(
      '[aria-label="Destination hex"]',
    );
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
      if (model.screen === 'map' || model.screen === 'fleets')
        main.append(this.#mapPage(model.screen));
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
      else if (model.screen === 'supply')
        main.append(renderSupply(model, this.#emit));
      else if (model.screen === 'decisions')
        main.append(renderDecisions(model, this.#emit));
      else
        main.append(
          renderResearch(
            model.research,
            model.phase !== 'planning',
            this.#emit,
          ),
        );
      this.#root.append(main);
      if (
        (model.screen === 'map' || model.screen === 'fleets') &&
        this.#container
      ) {
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
    }
    if (!changedScreen && model.screen === 'planet' && focusLabel) {
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
    const previousResearchQueue =
      this.#root.querySelector<HTMLDetailsElement>('.research-queue');
    const researchQueueOpen = previousResearchQueue?.open ?? false;
    const researchQueueScroll =
      previousResearchQueue?.querySelector('.research-queue-content')
        ?.scrollTop ?? 0;
    const researchKey = JSON.stringify([model.research, model.phase]);
    if (
      !changedScreen &&
      model.screen === 'research' &&
      this.#researchKey !== researchKey
    )
      this.#root
        .querySelector('main')
        ?.replaceChildren(
          renderResearch(
            model.research,
            model.phase !== 'planning',
            this.#emit,
          ),
        );
    if (model.screen === 'research') {
      if (!changedScreen) {
        const queue =
          this.#root.querySelector<HTMLDetailsElement>('.research-queue');
        if (queue) queue.open = researchQueueOpen;
        const content = queue?.querySelector('.research-queue-content');
        if (content) content.scrollTop = researchQueueScroll;
        if (
          active instanceof HTMLElement &&
          !active.isConnected &&
          active.closest('.research-queue')
        ) {
          const control = [
            ...(queue?.querySelectorAll<HTMLElement>('[aria-label]') ?? []),
          ].find(
            (control) => control.getAttribute('aria-label') === focusLabel,
          );
          (control ?? queue?.querySelector<HTMLElement>('summary'))?.focus({
            preventScroll: true,
          });
        }
      }
      this.#researchKey = researchKey;
      updateResearchCamera(this.#root, model.researchCamera);
      const viewport = this.#root.querySelector<HTMLElement>(
        '.research-tree-viewport',
      );
      if (viewport && viewport !== this.#researchViewport) {
        this.#researchObserver?.disconnect();
        this.#researchViewport = viewport;
        if (typeof ResizeObserver !== 'undefined') {
          this.#researchObserver = new ResizeObserver((entries) => {
            const bounds = entries[0]?.contentRect;
            if (bounds && viewport.isConnected)
              this.#emit({
                type: 'research-size',
                width: bounds.width,
                height: bounds.height,
              });
          });
          this.#researchObserver.observe(viewport);
        }
      }
    }
    const supplyKey = JSON.stringify([
      model.supply,
      model.shipments,
      model.supplySelection,
      model.tradeRoutes,
    ]);
    if (
      !changedScreen &&
      model.screen === 'supply' &&
      this.#supplyKey !== supplyKey
    )
      this.#root
        .querySelector('main')
        ?.replaceChildren(renderSupply(model, this.#emit));
    if (model.screen === 'supply') {
      this.#supplyKey = supplyKey;
      if (
        !changedScreen &&
        changedSupplyMaterial &&
        (model.supplySelection.material !== null ||
          supplyFocus !== 'supply-search')
      ) {
        this.#root
          .querySelector<HTMLElement>(
            '.supply-material-heading h2, .supply-planet-summary',
          )
          ?.focus({ preventScroll: true });
      } else if (!changedScreen && supplyFocus) {
        const previous = [
          ...this.#root.querySelectorAll<HTMLElement>('[data-focus-key]'),
        ].find((node) => node.dataset.focusKey === supplyFocus);
        const focus =
          previous ??
          this.#root.querySelector<HTMLElement>(
            '.supply-material-heading h2, .supply-planet-summary',
          );
        focus?.focus({ preventScroll: true });
        if (focus instanceof HTMLInputElement && supplyCaret !== null)
          focus.setSelectionRange(supplyCaret, supplyCaret);
      }
      const content = this.#root.querySelector('.supply-content');
      if (content) content.scrollTop = this.#supplyScroll;
    }
    if (!changedScreen && model.screen === 'decisions') {
      const actions = this.#root.querySelector('.turn-actions');
      const page = renderDecisions(model, this.#emit);
      if (actions) page.querySelector('.turn-actions')?.replaceWith(actions);
      this.#root.querySelector('main')?.replaceChildren(page);
    }
    const counter = this.#root.querySelector('.decision-counter');
    if (counter)
      counter.textContent = `Decisions (${model.decisions.filter(needsAttention).length})`;
    if (model.screen === 'map' || model.screen === 'fleets') {
      this.#map?.render(model);
      if (this.#zoom)
        this.#zoom.value = `${Math.round(model.camera.zoom * 100)}%`;
      if (this.#coordinates)
        this.#coordinates.textContent = `X ${model.camera.center.x.toFixed(0)} · Y ${model.camera.center.y.toFixed(0)}`;
      const key = JSON.stringify({
        mapTrade: model.mapTrade,
        routes: model.tradeRoutes,
        routeFleets: model.fleets,
        research: model.research.completed,
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
        shipTransfer: model.shipTransfer,
        fleetNameEdit: model.fleetNameEdit,
      });
      if (key !== this.#selectionKey) {
        this.#selectionKey = key;
        this.#renderSelection(model);
        if (this.#panel)
          this.#panel.scrollTop =
            wasChoosingDestination !== !!model.destinationFleetId
              ? 0
              : selectionScroll;
        if (
          model.mapFleetId &&
          (changedScreen || previousMapFleet !== model.mapFleetId)
        )
          this.#panel
            ?.querySelector<HTMLElement>(
              '.selected-fleet-card .fleet-name-button',
            )
            ?.scrollIntoView?.({ block: 'nearest' });
      }
      const selected = !this.#panel?.hidden;
      this.#root
        .querySelector('.map-page')
        ?.classList.toggle('has-selection', selected);
      for (const control of this.#root.querySelectorAll<HTMLElement>(
        '.turn-console, .end-turn',
      ))
        control.hidden = selected;
    }
    if (
      model.screen === 'map' ||
      model.screen === 'fleets' ||
      model.screen === 'decisions'
    ) {
      const end = this.#root.querySelector<HTMLButtonElement>('.end-turn');
      if (end) end.disabled = model.phase !== 'planning';
      this.#renderTurnConsole(model);
    }
    const nameInput =
      this.#root.querySelector<HTMLInputElement>('.fleet-name-input');
    if (nameInput && model.fleetNameEdit) {
      nameInput.focus({ preventScroll: true });
      if (nameCaret)
        nameInput.setSelectionRange(nameCaret[0] ?? 0, nameCaret[1] ?? 0);
      else nameInput.select();
      if (!editingName) nameInput.scrollIntoView?.({ block: 'nearest' });
    } else if (
      (model.screen === 'map' || model.screen === 'fleets') &&
      active instanceof HTMLElement &&
      !active.isConnected &&
      focusLabel
    ) {
      const scope = scopeSelector
        ? this.#root.querySelector(scopeSelector)
        : this.#root;
      const restored =
        [...(scope?.querySelectorAll<HTMLElement>('[aria-label]') ?? [])].find(
          (node) => node.getAttribute('aria-label') === focusLabel,
        ) ?? scope?.querySelector<HTMLElement>('.fleet-name-button');
      restored?.focus({ preventScroll: true });
    }
    this.#renderNotice(model);
    if (editingName) delete active.dataset.rendering;
    if (model.pendingEndTurn) {
      this.#decisionDialog = renderTurnWarning(model, this.#emit);
    } else if (model.pendingResearchRemoval) {
      const dialog = element('dialog', 'decision-dialog');
      dialog.setAttribute('aria-label', 'Remove research');
      dialog.append(
        element('h2', '', `Remove ${model.pendingResearchRemoval}?`),
        element(
          'p',
          '',
          'Dependent technologies will also be removed from the queue.',
        ),
        button('Remove research', () =>
          this.#emit({ type: 'confirm-research-removal' }),
        ),
        button('Cancel', () => this.#emit({ type: 'cancel-research-removal' })),
      );
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        this.#emit({ type: 'cancel-research-removal' });
      });
      this.#decisionDialog = dialog;
    }
    if (this.#decisionDialog) {
      this.#root.append(this.#decisionDialog);
      this.#decisionDialog.showModal();
    }
  }

  #renderTurnConsole(model: AppReadModel): void {
    const log = this.#root.querySelector<HTMLElement>(
      '.turn-console [role="log"]',
    );
    if (!log || log.closest<HTMLElement>('.turn-console')?.hidden) return;
    const events = model.events.slice(-100);
    const key = events.at(-1)?.id ?? 'empty';
    if (log.dataset.lastEvent === key) return;
    const follow = log.scrollHeight - log.clientHeight - log.scrollTop < 8;
    const list = log.querySelector('ol')!;
    const ids = new Set(events.map((event) => event.id));
    for (const item of list.querySelectorAll<HTMLElement>('li'))
      if (!ids.has(item.dataset.eventId!)) item.remove();
    const existing = new Set(
      [...list.querySelectorAll<HTMLElement>('li')].map(
        (item) => item.dataset.eventId,
      ),
    );
    if (events.length) log.querySelector('.console-empty')?.remove();
    for (const event of events) {
      if (existing.has(event.id)) continue;
      const item = element('li', '', `Year ${event.round}: ${event.text}`);
      item.dataset.eventId = event.id;
      list.append(item);
    }
    log.dataset.lastEvent = key;
    if (follow) log.scrollTop = log.scrollHeight;
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
    this.#researchObserver?.disconnect();
    this.#researchViewport = null;
    this.#decisionDialog?.close();
    this.#decisionDialog?.remove();
    this.#decisionDialog = null;
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
      ['supply', 'Supply & production'],
      ['decisions', 'Decisions'],
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
                  : target === 'fleets'
                    ? 'open-fleets'
                    : target === 'supply'
                      ? 'open-supply'
                      : 'open-decisions',
          }),
        'nav-button',
      );
      if (target === 'supply') {
        choice.replaceChildren(
          element('span', 'nav-label-full', label),
          element('span', 'nav-label-compact', 'Supply'),
        );
        choice.title = label;
      }
      if (screen === target) choice.setAttribute('aria-current', 'page');
      if (target === 'decisions') choice.classList.add('decision-counter');
      navigation.append(choice);
    }
    header.append(brand, navigation);
    return header;
  }

  #mapPage(screen: 'map' | 'fleets'): HTMLElement {
    const page = element('section', 'map-page');
    page.dataset.mapScreen = screen;
    page.append(
      element(
        'h1',
        'visually-hidden',
        screen === 'fleets' ? 'Fleets' : 'Star map',
      ),
    );
    this.#container = element('div', 'map-container');
    this.#container.dataset.testid = 'map-container';
    this.#zoom = element('output', 'visually-hidden');
    this.#zoom.setAttribute('aria-label', 'Map zoom');
    this.#coordinates = element('span', 'map-coordinates visually-hidden');
    this.#coordinates.dataset.testid = 'camera-position';
    this.#panel = element('aside', 'selection-panel hud');
    this.#panel.setAttribute('aria-label', 'Selected hex');
    this.#cancelSelectionGesture = bindMapSelectionScroll(this.#panel, page);
    page.append(
      this.#container,
      this.#coordinates,
      this.#zoom,
      this.#panel,
      renderTurnActions(this.#emit),
    );
    return page;
  }

  #renderSelection(model: AppReadModel): void {
    if (!this.#panel) return;
    this.#cancelSelectionGesture?.();
    this.#panel.hidden = false;
    const trade =
      model.screen === 'map'
        ? renderMapTradeSelection(model, this.#emit)
        : null;
    if (trade) {
      this.#panel.setAttribute(
        'aria-label',
        model.mapTrade.routeId ? 'Selected route' : 'Trade route selection',
      );
      this.#panel.replaceChildren(trade);
      return;
    }
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
    if (selectedFleet?.position) {
      this.#panel.replaceChildren(
        renderMapFleetPanel(model, this.#emit, selectedFleet.position),
      );
      return;
    }
    const cell = model.selected;
    const object = cell?.object;
    const owned = object?.kind === 'planet' && object.owned;
    const source = model.ownedPlanets.find(
      (planet) => planet.position.key === cell?.position.key,
    );
    const title = renderMapLocationHeading(
      object?.name ?? 'Fleets',
      cell?.position,
      source?.id,
      this.#emit,
    );
    const description = owned
      ? 'A colony of your empire.'
      : object?.kind === 'star'
        ? 'A star shining through unexplored space.'
        : object?.kind === 'planet'
          ? 'An uninhabited world near your homeworld.'
          : '';
    const contents: HTMLElement[] =
      object && model.screen === 'map'
        ? [title, element('p', 'selection-description', description)]
        : [];
    const destinationFleet = model.destinationFleetId
      ? model.fleets.find((fleet) => fleet.id === model.destinationFleetId)
      : null;
    if (destinationFleet) {
      contents.push(
        element(
          'p',
          'destination-mode',
          `Choose a destination for ${destinationFleet.name}.`,
        ),
        button(
          'Cancel',
          () =>
            this.#emit({
              type: model.screen === 'fleets' ? 'open-fleets' : 'open-map',
            }),
          'button',
        ),
      );
      const picker = element('select');
      picker.setAttribute('aria-label', 'Destination hex');
      const placeholder = element('option', '', 'Choose destination hex');
      placeholder.value = '';
      picker.append(placeholder);
      for (const target of model.cells) {
        const option = element(
          'option',
          '',
          `${target.object?.name ?? 'HEX'} ${target.position.key}`,
        );
        option.value = target.position.key;
        picker.append(option);
      }
      picker.addEventListener('change', () => {
        if (!picker.value) return;
        const [q, r] = picker.value.split(',').map(Number);
        this.#emit({ type: 'select', position: new HexCoordinate(q!, r!) });
      });
      picker.addEventListener('keydown', (event) => {
        if (event.key === 'Escape')
          this.#emit({
            type: model.screen === 'fleets' ? 'open-fleets' : 'open-map',
          });
      });
      contents.push(picker);
    }
    if (model.screen === 'map' && object?.kind === 'planet')
      contents.push(
        element('span', 'pill', owned ? model.playerName : 'Uninhabited'),
      );
    if (model.screen === 'map' && owned && object) {
      const source = model.ownedPlanets.find(
        (p) => p.position.key === cell?.position.key,
      );
      if (source) {
        const routes = model.tradeRoutes.filter(
          (r) => r.a === source.id || r.b === source.id,
        );
        if (routes.length) contents.push(element('h3', '', 'Connected routes'));
        for (const route of routes)
          contents.push(
            button(
              `${route.from} ↔ ${route.to}`,
              () => this.#emit({ type: 'map-select-route', id: route.id }),
              'button secondary-button',
            ),
          );
      }
    }
    const orderStatus = model.planetOrders.find(
      (status) => status.position.key === cell?.position.key,
    );
    if (model.screen === 'map' && orderStatus)
      contents.push(
        element(
          'p',
          'order-status',
          `${orderStatus.emptySites} empty building sites · ${orderStatus.emptyQueues} idle planet build queue`,
        ),
      );
    if (model.screen === 'map' && cell && !model.destinationFleetId) {
      const fleets = renderMapFleetPanel(model, this.#emit, cell.position);
      if (
        model.fleets.some((fleet) => fleet.position?.key === cell.position.key)
      ) {
        // flottadministration: position and ships take priority over planet administration.
        if (object) contents.splice(0, 1);
        contents.unshift(fleets);
      }
    }
    this.#panel.replaceChildren(...contents);
    this.#panel.hidden = contents.length === 0;
  }

  animateTurnStep(frame: TurnFrame): Promise<void> {
    return this.#map?.animateTurnStep?.(frame) ?? Promise.resolve();
  }
}
