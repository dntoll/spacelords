import { renderOrders } from './OrdersView.js';
import { gameText } from './GameText.js';
import { BattleView, type BattleMapFactory } from './BattleView.js';
import { discoveryControls } from './DiscoveryView.js';
import { pirateAsFleet } from '../models/PirateFleet.js';
import { updateDecisionGuidance } from './DecisionGuidanceView.js';
import {
  isMapScreen,
  productionPosition,
  type MapScreen,
} from '../models/ProductionMap.js';
import {
  renderProductionRing,
  renderProductionMapPanel,
  renderRoutePlanet,
} from './ProductionMapView.js';
import { bindMapSelectionScroll } from './MapSelectionScroll.js';
import { renderMapTradeSelection } from './StarMapTradeView.js';
import { renderMapFleetPanel } from './FleetMapPanel.js';
import { renderMapLocationHeading } from './MapLocationHeading.js';
import { renderSaveSlots, clearSlotDialog } from './SaveSlotsView.js';
import { needsAttention } from '../models/Decisions.js';
import type { MapCell } from '../models/Galaxy.js';
import type { AppReadModel, Screen } from '../models/AppModel.js';
import { HexGeometry, HexCoordinate } from '../models/HexCoordinate.js';
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
import { renderResearchSelection } from './ResearchDetailsView.js';
import { updateResearchCamera } from './ResearchTreeView.js';
import { button, element, planetIllustration } from './dom.js';
import { renderDecisions, renderTurnWarning } from './EmpireView.js';
import { renderTurnActions } from './TurnActionsView.js';
import { renderEvents, renderCombatLog } from './EventsView.js';

export class AppView implements AppPort {
  #battleView: BattleView | null = null;
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
  readonly #fleetOrderScroll = new Map<string, number>();
  #cancelSelectionGesture: (() => void) | null = null;
  #previews: { dispose(): void }[] = [];
  #saveKey = '';
  #dialog: HTMLDialogElement | null = null;
  #clearReturnSlot: number | null = null;
  #planetScroll = new Map<string, number>();
  #planetFocusTarget: string | null = null;
  #catalogDetailKey: string | null = null;
  #catalogReturnKey: string | null = null;
  #decisionDialog: HTMLDialogElement | null = null;
  #researchKey = '';
  #inspectedResearch: AppReadModel['inspectedResearch'] = null;
  #researchViewport: HTMLElement | null = null;
  #researchObserver: ResizeObserver | null = null;
  #mapObserver: ResizeObserver | null = null;
  #ring: HTMLElement | null = null;
  #ringKey = '';
  #viewportKey = '';
  #mapFocusRevision = 0;
  #resizeFrame = 0;
  #productionDetailType: string | null = null;
  #eventsExpanded = false;
  #playingEvents = false;
  #turnActions: HTMLElement | null = null;
  #consoleObserver: ResizeObserver | null = null;
  #announcementObserver: ResizeObserver | null = null;
  #announcementModel: AppReadModel | null = null;
  #presentationFrame = 0;
  #finishPresentation: (() => void) | null = null;
  #disposed = false;

  constructor(
    root: HTMLElement,
    mapFactory: MapFactory,
    private readonly previewFactory?: (
      container: HTMLElement,
      cells: readonly MapCell[],
    ) => { dispose(): void },
    private readonly battleMapFactory?: BattleMapFactory,
  ) {
    this.#root = root;
    this.#mapFactory = mapFactory;
  }

  bind(handler: IntentHandler): void {
    this.#emit = (intent) => {
      // symbolbaserade-kataloger: touch browsers can blur before the Back click.
      if (
        (intent.type === 'building-selection' && intent.building === null) ||
        (intent.type === 'production-selection' && intent.product === null)
      )
        this.#catalogReturnKey = this.#catalogDetailKey;
      handler(intent);
    };
  }

  render(model: AppReadModel): void {
    if (
      model.tacticalBattle &&
      !model.turnMovement &&
      model.screen !== 'saves'
    ) {
      this.#battleView ??= new BattleView(
        this.#root,
        (intent) => this.#emit(intent),
        this.battleMapFactory,
      );
      this.#battleView.render(model.tacticalBattle, model.notice);
      return;
    }
    this.#battleView?.dispose();
    this.#battleView = null;
    const currentEvent = model.eventPlayback?.events[model.eventPlayback.index];
    this.#root.classList.toggle(
      'has-interactive-event',
      !!currentEvent?.decision,
    );
    if (model.screen === 'saves') this.#fleetOrderScroll.clear();
    for (const toolbar of this.#root.querySelectorAll<HTMLElement>(
      '.fleet-order-toolbar',
    )) {
      const id =
        toolbar.closest<HTMLElement>('[data-fleet-id]')?.dataset.fleetId;
      if (id) this.#fleetOrderScroll.set(id, toolbar.scrollLeft);
    }
    const previousActions = this.#turnActions;
    const previousConsole =
      previousActions?.querySelector<HTMLDetailsElement>('.turn-console');
    if (previousConsole && !previousConsole.hidden && !this.#playingEvents)
      this.#eventsExpanded = previousConsole.open;
    this.#playingEvents = !!(model.eventPlayback || model.turnMovement);
    const previousEventScroll =
      previousActions?.querySelector<HTMLElement>('[role="log"]')?.scrollTop ??
      0;
    if (model.screen !== 'research') {
      this.#researchObserver?.disconnect();
      this.#researchObserver = null;
      this.#researchViewport = null;
    }
    this.#decisionDialog?.close();
    this.#decisionDialog?.remove();
    this.#decisionDialog = null;
    if (model.screen === 'saves') {
      this.#root.classList.remove('has-game-footer');
      this.#turnActions = null;
      this.#eventsExpanded = false;
      this.#consoleObserver?.disconnect();
      this.#consoleObserver = null;
      const key = JSON.stringify(model.saveSlots);
      if (this.#screen !== 'saves' || this.#saveKey !== key) {
        this.#mapObserver?.disconnect();
        this.#mapObserver = null;
        if (typeof cancelAnimationFrame !== 'undefined')
          cancelAnimationFrame(this.#resizeFrame);
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
    const wasChoosingDestination =
      !!this.#panel?.querySelector('.destination-mode');
    const focusLabel = active?.getAttribute('aria-label');
    const focusKey =
      active instanceof HTMLElement ? active.dataset.focusKey : undefined;
    const focusScope = active?.closest(
      '[data-project-id], [data-site-index], .fleet-card, .catalog-categories',
    );
    const scopeSelector = focusScope?.classList.contains('catalog-categories')
      ? `.catalog-categories[aria-label="${focusScope.getAttribute('aria-label')}"]`
      : focusScope?.hasAttribute('data-project-id')
        ? `[data-project-id="${focusScope.getAttribute('data-project-id')}"]`
        : focusScope?.hasAttribute('data-site-index')
          ? `[data-site-index="${focusScope.getAttribute('data-site-index')}"]`
          : focusScope?.hasAttribute('data-fleet-id')
            ? `[data-fleet-id="${focusScope.getAttribute('data-fleet-id')}"]`
            : null;
    if (this.#screen === 'planet') {
      const panel = this.#root.querySelector<HTMLElement>('.planet-content');
      if (panel?.dataset.planetId)
        this.#planetScroll.set(
          `${panel.dataset.planetId}:${panel.dataset.planetTab}`,
          panel.scrollTop,
        );
    }
    if (
      changedScreen &&
      isMapScreen(this.#screen) &&
      isMapScreen(model.screen)
    ) {
      this.#root
        .querySelector('header')
        ?.replaceWith(this.#header(model.screen));
      const page = this.#root.querySelector<HTMLElement>('.map-page');
      if (page) page.dataset.mapScreen = model.screen;
      const heading = page?.querySelector('h1');
      if (heading)
        heading.textContent =
          model.screen === 'map'
            ? 'Star map'
            : model.screen === 'fleets'
              ? 'Fleets'
              : model.screen === 'route'
                ? 'Route'
                : model.screen === 'orders'
                  ? 'Orders'
                  : 'Production';
      this.#selectionKey = '';
      this.#ringKey = '';
      this.#screen = model.screen;
    } else if (changedScreen) {
      this.#mapObserver?.disconnect();
      this.#mapObserver = null;
      this.#ring?.remove();
      this.#ring = null;
      this.#ringKey = '';
      this.#viewportKey = '';
      this.#map?.dispose();
      this.#map = null;
      this.#selectionKey = '';
      this.#root.replaceChildren(this.#header(model.screen));
      const main = element('main', 'page');
      if (isMapScreen(model.screen)) main.append(this.#mapPage(model.screen));
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
      else if (model.screen === 'decisions')
        main.append(renderDecisions(model, this.#emit));
      else
        main.append(
          renderResearch(
            model.research,
            model.phase !== 'planning',
            this.#emit,
            model.inspectedResearch,
          ),
        );
      this.#root.append(main);
      if (isMapScreen(model.screen) && this.#container) {
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
    if (
      !changedScreen &&
      (model.screen === 'planet' || model.screen === 'build-selection') &&
      focusLabel
    ) {
      const scope = scopeSelector
        ? this.#root.querySelector(scopeSelector)
        : this.#root;
      const focus =
        [...(scope?.querySelectorAll<HTMLElement>('[aria-label]') ?? [])].find(
          (node) => node.getAttribute('aria-label') === focusLabel,
        ) ??
        scope?.querySelector<HTMLElement>('.fleet-name-button') ??
        this.#root.querySelector<HTMLElement>(
          '.map-queue-choice[aria-pressed="true"]',
        );
      focus?.focus({ preventScroll: true });
    }
    if (model.screen === 'planet' && model.planet) {
      const panel = this.#root.querySelector<HTMLElement>('.planet-content');
      if (panel) {
        panel.dataset.planetId = model.planet.id;
        panel.scrollTop =
          this.#planetScroll.get(`${model.planet.id}:${model.planetTab}`) ?? 0;
      }
      const focusKey = model.focusedProjectId
        ? `${model.planet.id}:${model.focusedProjectId}`
        : null;
      if (
        model.planetTab === 'queue' &&
        focusKey &&
        focusKey !== this.#planetFocusTarget
      ) {
        const row = [
          ...this.#root.querySelectorAll<HTMLElement>('[data-project-id]'),
        ].find((item) => item.dataset.projectId === model.focusedProjectId);
        row?.setAttribute('tabindex', '-1');
        row?.focus({ preventScroll: true });
        row?.scrollIntoView?.({ block: 'nearest' });
      }
      this.#planetFocusTarget = focusKey;
      if (changedScreen && model.returnSite !== null)
        this.#root
          .querySelector<HTMLElement>(`[data-site-index="${model.returnSite}"]`)
          ?.focus({ preventScroll: true });
    }
    const detail = this.#root.querySelector<HTMLElement>('.catalog-details');
    const detailKey = detail?.dataset.detailKey ?? null;
    if (detailKey && detailKey !== this.#catalogDetailKey) {
      detail?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      detail?.scrollIntoView?.({ block: 'start' });
    } else if (
      !detailKey &&
      this.#catalogDetailKey &&
      (focusLabel === 'Back to buildings' ||
        focusLabel === 'Back to products' ||
        this.#catalogReturnKey === this.#catalogDetailKey)
    ) {
      const item = [
        ...this.#root.querySelectorAll<HTMLElement>('[data-catalog-item]'),
      ].find((node) => node.dataset.catalogItem === this.#catalogDetailKey);
      item?.focus({ preventScroll: true });
      item?.scrollIntoView?.({ block: 'nearest' });
    }
    this.#catalogDetailKey = detailKey;
    this.#catalogReturnKey = null;
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
      (this.#researchKey !== researchKey ||
        this.#inspectedResearch !== model.inspectedResearch)
    ) {
      if (this.#researchKey === researchKey) {
        // dubbelklick-koar-forskning: retain pointer targets through inspection.
        const panel = this.#root.querySelector('.research-panel')!;
        for (const node of panel.querySelectorAll<HTMLElement>(
          '.research-node[data-technology]',
        ))
          node
            .querySelector('button')!
            .setAttribute(
              'aria-pressed',
              String(node.dataset.technology === model.inspectedResearch),
            );
        panel
          .querySelector('.research-details')!
          .replaceWith(
            renderResearchSelection(
              model.research,
              model.inspectedResearch,
              model.phase !== 'planning',
              this.#emit,
            ),
          );
      } else
        this.#root
          .querySelector('main')
          ?.replaceChildren(
            renderResearch(
              model.research,
              model.phase !== 'planning',
              this.#emit,
              model.inspectedResearch,
            ),
          );
    }
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
      const changedInspection =
        this.#inspectedResearch !== model.inspectedResearch;
      if (
        changedInspection &&
        model.inspectedResearch === null &&
        this.#inspectedResearch !== null
      ) {
        const technology = this.#inspectedResearch;
        [...this.#root.querySelectorAll<HTMLElement>('.research-node')]
          .find((node) => node.dataset.technology === technology)
          ?.querySelector<HTMLElement>('button')
          ?.focus({ preventScroll: true });
      } else if (
        active instanceof HTMLElement &&
        !active.isConnected &&
        focusLabel
      ) {
        [
          ...this.#root.querySelectorAll<HTMLElement>(
            '.research-page [aria-label]',
          ),
        ]
          .find((node) => node.getAttribute('aria-label') === focusLabel)
          ?.focus({ preventScroll: true });
      }
      this.#inspectedResearch = model.inspectedResearch;
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
    if (!changedScreen && model.screen === 'decisions') {
      // senaste-aret-i-events: keep the log attached while decisions change.
      const page = renderDecisions(model, this.#emit);
      this.#root
        .querySelector('.decisions-page .empire-content')
        ?.replaceWith(page.querySelector('.empire-content')!);
    }
    // gemensam-events-panel: retain one log and its reading position across screens.
    this.#turnActions ??= renderTurnActions((intent) => this.#emit(intent));
    this.#turnActions.classList.add('game-turn-actions');
    this.#root.classList.add('has-game-footer');
    if (this.#turnActions.parentElement !== this.#root) {
      this.#root.append(this.#turnActions);
      if (previousActions)
        this.#turnActions.querySelector<HTMLElement>(
          '[role="log"]',
        )!.scrollTop = previousEventScroll;
    }
    this.#renderMapProblems(model);
    const counter = this.#root.querySelector('.decision-counter');
    if (counter)
      counter.textContent = `Decisions (${model.decisions.filter(needsAttention).length})`;
    if (isMapScreen(model.screen)) {
      this.#root
        .querySelector('.map-page')
        ?.classList.toggle('is-event-playback', !!model.eventPlayback);
      this.#root
        .querySelector('.map-page')
        ?.classList.toggle('is-turn-movement', !!model.turnMovement);
      this.#map?.render(model);
      if (model.eventPlayback || model.turnMovement) {
        this.#ring?.remove();
        this.#ring = null;
        this.#ringKey = '';
      } else this.#renderProductionRing(model);
      this.#mapFocusRevision = model.mapFocusRevision;
      if (this.#zoom)
        this.#zoom.value = `${Math.round(model.camera.zoom * 100)}%`;
      if (this.#coordinates)
        this.#coordinates.textContent = `X ${model.camera.center.x.toFixed(0)} · Y ${model.camera.center.y.toFixed(0)}`;
      const key = JSON.stringify({
        eventPlayback: !!model.eventPlayback,
        turnMovement: !!model.turnMovement,
        salvageSelection: model.salvageSelection,
        shipyardPlacement: model.shipyardPlacement,
        wrecks: model.wrecks,
        shipyards: model.shipyards,
        screen: model.screen,
        orderView: model.orderView,
        productionStartOrder: model.productionStartOrder,
        productionMap: model.productionMap,
        productionGuidance: model.productionGuidance,
        projectSupply: model.projectSupply,
        supplyChain: model.supplyChain,
        mapProblems: model.mapProblems,
        supply: model.supply,
        mapTrade: model.mapTrade,
        routes: model.tradeRoutes,
        routeFleets: model.fleets,
        pirates: model.pirates,
        mapFleetId: model.mapFleetId,
        research: model.research.completed,
        orders: model.planetOrders,
        phase: model.phase,
        selected: model.selected,
        selectedPlanetInfo: model.selectedPlanetInfo,
        mapFleet: model.fleets.find((fleet) => fleet.id === model.mapFleetId),
        preview: model.fleetDestinationPreview,
        dragging: model.fleetDragging,
        fleets: model.fleets.filter(
          (fleet) => fleet.position?.key === model.selected?.position.key,
        ),
        destination: model.destinationFleetId,
        destinationOrder: model.destinationOrder,
        shipTransfer: model.shipTransfer,
        fleetNameEdit: model.fleetNameEdit,
      });
      if (key !== this.#selectionKey) {
        this.#selectionKey = key;
        this.#renderSelection(model);
        for (const toolbar of this.#root.querySelectorAll<HTMLElement>(
          '.fleet-order-toolbar',
        )) {
          const id =
            toolbar.closest<HTMLElement>('[data-fleet-id]')?.dataset.fleetId;
          if (id) toolbar.scrollLeft = this.#fleetOrderScroll.get(id) ?? 0;
        }
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
      const selected = !this.#playingEvents && !this.#panel?.hidden;
      if (this.#playingEvents && this.#panel) this.#panel.hidden = true;
      this.#root
        .querySelector('.map-page')
        ?.classList.toggle('has-selection', selected);
    }
    const end = this.#root.querySelector<HTMLButtonElement>('.end-turn');
    if (end) end.disabled = model.phase !== 'planning' || !!model.eventPlayback;
    this.#renderTurnConsole(model);
    updateDecisionGuidance(this.#root, model, this.#emit);
    if (isMapScreen(model.screen)) this.#measureMap();
    for (const control of this.#root.querySelectorAll<HTMLButtonElement>(
      'header button',
    ))
      control.disabled = this.#playingEvents;
    this.#renderEventAnnouncement(model);
    const nameInput =
      this.#root.querySelector<HTMLInputElement>('.fleet-name-input');
    if (nameInput && model.fleetNameEdit) {
      nameInput.focus({ preventScroll: true });
      if (nameCaret)
        nameInput.setSelectionRange(nameCaret[0] ?? 0, nameCaret[1] ?? 0);
      else nameInput.select();
      if (!editingName) nameInput.scrollIntoView?.({ block: 'nearest' });
    } else if (
      isMapScreen(model.screen) &&
      active instanceof HTMLElement &&
      !active.isConnected &&
      focusLabel
    ) {
      const scope = scopeSelector
        ? this.#root.querySelector(scopeSelector)
        : this.#root;
      const restored =
        (focusKey
          ? [
              ...this.#root.querySelectorAll<HTMLElement>('[data-focus-key]'),
            ].find((node) => node.dataset.focusKey === focusKey)
          : null) ??
        [...(scope?.querySelectorAll<HTMLElement>('[aria-label]') ?? [])].find(
          (node) => node.getAttribute('aria-label') === focusLabel,
        ) ??
        scope?.querySelector<HTMLElement>('.fleet-name-button') ??
        this.#root.querySelector<HTMLElement>(
          '.map-queue-choice[aria-pressed="true"]',
        );
      const focusTarget =
        restored instanceof HTMLButtonElement && restored.disabled
          ? (scope?.querySelector<HTMLElement>('.map-queue-choice') ??
            this.#root.querySelector<HTMLElement>(
              '.map-queue-choice[aria-pressed="true"]',
            ))
          : restored;
      focusTarget?.focus({ preventScroll: true });
    }
    if (
      model.screen === 'production' &&
      model.productionMap.selectedOption?.type !== this.#productionDetailType
    ) {
      this.#productionDetailType =
        model.productionMap.selectedOption?.type ?? null;
      if (this.#productionDetailType && this.#panel) this.#panel.scrollTop = 0;
    }
    this.#renderNotice(model);
    if (editingName) delete active.dataset.rendering;
    this.#root.querySelector('.discovery-controls')?.remove();
    if (model.phase === 'interrupted' && model.interruption) {
      if (
        model.interruption.handling &&
        !model.eventPlayback &&
        !model.turnMovement
      )
        this.#root.append(discoveryControls(model, this.#emit));
    } else if (model.pendingEndTurn) {
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
    if (!log) return;
    const console = log.closest<HTMLDetailsElement>('.turn-console')!;
    const playback = model.eventPlayback;
    console.dataset.playing = String(!!playback);
    const open = !!playback || this.#eventsExpanded;
    if (console.open !== open) console.open = open;
    if (console.hidden) return;
    const layout = () => {
      const maximum = window.innerHeight * 0.4;
      console.style.setProperty(
        '--events-max-height',
        `${Math.max(80, maximum || 260)}px`,
      );
    };
    layout();
    if (!console.dataset.bound) {
      console.dataset.bound = 'true';
      console.addEventListener('toggle', () => {
        if (!console.isConnected) return;
        if (!this.#playingEvents) this.#eventsExpanded = console.open;
        layout();
        if (console.open) log.scrollTop = log.scrollHeight;
      });
      if (typeof ResizeObserver !== 'undefined') {
        this.#consoleObserver?.disconnect();
        this.#consoleObserver = new ResizeObserver(layout);
        this.#consoleObserver.observe(this.#root);
      }
    }
    const history =
      model.phase === 'planning'
        ? model.events
        : model.events.filter(
            (event) =>
              event.round < model.round ||
              model.presentedEventIds.includes(event.id),
          );
    const latestYear = Math.max(model.round - 1, history.at(-1)?.round ?? 0);
    const events = playback
      ? [
          ...(playback.history ?? []),
          ...playback.events.slice(0, playback.index),
        ]
      : history.filter((event) => event.round === latestYear);
    const activeId = playback?.events[playback.index]?.id;
    const key = `${events.at(-1)?.id ?? 'empty'}:${model.round}:${activeId ?? ''}`;
    if (log.dataset.lastEvent === key) return;
    const follow =
      !!playback ||
      log.dataset.round !== String(model.round) ||
      log.scrollHeight - log.clientHeight - log.scrollTop < 8;
    const list = log.querySelector('ol')!;
    if (events.length) log.querySelector('.console-empty')?.remove();
    else if (!log.querySelector('.console-empty'))
      log.prepend(element('p', 'console-empty', 'No events yet.'));
    list.replaceChildren(
      ...renderEvents(events, playback?.events[playback.index]),
    );
    if (playback) {
      log.querySelector('.console-empty')?.remove();
    }
    log.dataset.lastEvent = key;
    log.dataset.round = String(model.round);
    if (follow) log.scrollTop = log.scrollHeight;
  }

  #renderEventAnnouncement(model: AppReadModel): void {
    this.#announcementModel = model.eventPlayback ? model : null;
    const playback = model.eventPlayback;
    const current = playback?.events[playback.index];
    let announcement = this.#root.querySelector<HTMLElement>(
      '.event-announcement',
    );
    if (!playback || !current || playback.stage === 'framing') {
      announcement?.remove();
      this.#announcementObserver?.disconnect();
      this.#announcementObserver = null;
      return;
    }
    if (announcement?.dataset.announcementId !== current.id) {
      announcement?.remove();
      this.#announcementObserver?.disconnect();
      announcement = element('div', 'event-announcement');
      announcement.append(element('p', 'event-text', gameText(current.text)));
      if (current.planetId) {
        announcement.classList.add('event-announcement-planet');
        announcement.tabIndex = 0;
      }
      if (current.decision) {
        announcement.classList.add('event-announcement-interactive');
        announcement.setAttribute('role', 'dialog');
        announcement.setAttribute('aria-label', current.decision.title);
        const details = element('div', 'event-details');
        details.append(announcement.querySelector('.event-text')!);
        details.tabIndex = 0;
        details.setAttribute('aria-label', 'Event details');
        for (const text of current.decision.details)
          details.append(element('p', '', gameText(text)));
        if (current.combatLog) {
          const lastRoll = current.combatLog.findLast((line) =>
            line.includes('D6 ['),
          );
          if (lastRoll)
            details.append(element('p', 'battle-latest-roll', lastRoll));
          details.append(renderCombatLog(current.combatLog));
        }
        const actions = element('div', 'event-actions');
        actions.append(
          button('Handle', () => this.#emit({ type: 'handle-discoveries' })),
          button('Ignore', () => this.#emit({ type: 'ignore-discoveries' })),
        );
        announcement.append(details, actions);
      } else announcement.setAttribute('role', 'status');
      announcement.dataset.announcementId = current.id;
      this.#root.append(announcement);
      if (current.decision && !model.turnMovement)
        announcement
          .querySelector<HTMLButtonElement>('button')
          ?.focus({ preventScroll: true });
      if (typeof ResizeObserver !== 'undefined') {
        this.#announcementObserver = new ResizeObserver(() =>
          this.#positionAnnouncement(),
        );
        this.#announcementObserver.observe(this.#root);
        this.#announcementObserver.observe(announcement);
        if (this.#container)
          this.#announcementObserver.observe(this.#container);
        const log = this.#root.querySelector('[role="log"]');
        if (log) this.#announcementObserver.observe(log);
      }
    }
    this.#positionAnnouncement();
    announcement.dataset.stage = playback.stage;
    for (const action of announcement.querySelectorAll<HTMLButtonElement>(
      'button',
    ))
      action.disabled = playback.stage !== 'awaiting-choice';
  }

  #positionAnnouncement(): void {
    const announcement = this.#root.querySelector<HTMLElement>(
      '.event-announcement',
    );
    const target = this.#root.querySelector<HTMLElement>('.event-destination');
    const log = target?.closest('[role="log"]');
    if (!announcement || !target || !log) return;
    const model = this.#announcementModel;
    const event = model?.eventPlayback?.events[model.eventPlayback.index];
    const map = this.#container?.getBoundingClientRect();
    let originX = window.innerWidth / 2;
    let originY = window.innerHeight / 2;
    if (event?.position && model && map && map.width > 0 && map.height > 0) {
      const point = HexGeometry.toPoint(
        new HexCoordinate(event.position.q, event.position.r),
      );
      announcement.style.setProperty(
        '--event-width',
        `${Math.min(620, map.width - 32)}px`,
      );
      originX =
        map.left +
        map.width / 2 +
        (point.x - model.camera.center.x) * model.camera.zoom;
      const markerGap =
        Number.parseFloat(
          window
            .getComputedStyle(announcement)
            .getPropertyValue('--event-marker-gap'),
        ) || 82;
      const markerY =
        map.top +
        map.height / 2 +
        (point.y - model.camera.center.y) * model.camera.zoom;
      if (event.decision || event.planetId) {
        const end = this.#root
          .querySelector('.end-turn')
          ?.getBoundingClientRect();
        const bottom = Math.min(
          window.innerHeight - 8,
          (end?.top ?? window.innerHeight) - 8,
        );
        const available = Math.max(80, bottom - markerY - markerGap);
        announcement.style.maxHeight = `${available}px`;
        // gemensamt-handelseflode: preserve End turn when marker spacing cannot fit.
        originY = Math.min(
          markerY + markerGap + announcement.offsetHeight / 2,
          bottom - announcement.offsetHeight / 2,
        );
      } else originY = markerY + markerGap + announcement.offsetHeight / 2;
      announcement.style.setProperty('--event-origin-x', `${originX}px`);
      announcement.style.setProperty('--event-origin-y', `${originY}px`);
    } else {
      for (const property of [
        '--event-width',
        '--event-origin-x',
        '--event-origin-y',
      ])
        announcement.style.removeProperty(property);
    }
    const row = target.getBoundingClientRect(),
      bounds = log.getBoundingClientRect();
    const top = Math.max(row.top, bounds.top),
      bottom = Math.min(row.bottom, bounds.bottom);
    announcement.style.setProperty(
      '--event-target-x',
      `${row.left + row.width / 2 - originX}px`,
    );
    announcement.style.setProperty(
      '--event-target-y',
      `${(top + bottom) / 2 - originY}px`,
    );
    announcement.style.setProperty(
      '--event-target-scale',
      String(
        Math.min(
          1,
          row.width / (announcement.offsetWidth || 1),
          Math.max(1, bottom - top) / (announcement.offsetHeight || 1),
        ),
      ),
    );
  }

  #renderNotice(model: AppReadModel): void {
    this.#root.querySelector('.production-receipt')?.remove();
    const receipt = model.productionReceipt;
    if (
      receipt &&
      model.screen === 'production' &&
      model.planet?.id === receipt.planetId
    ) {
      const confirmation = element(
        'p',
        'production-receipt',
        `Queued ${receipt.product} · #${receipt.queuePosition}`,
      );
      confirmation.setAttribute('role', 'status');
      this.#root.append(confirmation);
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
    this.#battleView?.dispose();
    this.#disposed = true;
    if (typeof cancelAnimationFrame !== 'undefined')
      cancelAnimationFrame(this.#presentationFrame);
    this.#finishPresentation?.();
    this.#finishPresentation = null;
    if (typeof cancelAnimationFrame !== 'undefined')
      cancelAnimationFrame(this.#resizeFrame);
    this.#mapObserver?.disconnect();
    this.#consoleObserver?.disconnect();
    this.#announcementObserver?.disconnect();
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
      ['route', 'Route'],
      ['production', 'Production'],
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
                    : target === 'route'
                      ? 'open-route'
                      : target === 'production'
                        ? 'open-production'
                        : 'open-decisions',
          }),
        'nav-button',
      );
      choice.dataset.screen = target;
      if (screen === target) choice.setAttribute('aria-current', 'page');
      if (target === 'decisions') choice.classList.add('decision-counter');
      navigation.append(choice);
    }
    header.append(brand, navigation);
    return header;
  }

  #mapPage(screen: MapScreen): HTMLElement {
    const page = element('section', 'map-page');
    page.dataset.mapScreen = screen;
    page.append(
      element(
        'h1',
        'visually-hidden',
        screen === 'fleets'
          ? 'Fleets'
          : screen === 'route'
            ? 'Route'
            : screen === 'orders'
              ? 'Orders'
              : screen === 'production'
                ? 'Production'
                : 'Star map',
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
    page.append(this.#container, this.#coordinates, this.#zoom, this.#panel);
    if (typeof ResizeObserver !== 'undefined') {
      this.#mapObserver = new ResizeObserver(() => this.#measureMap());
      this.#mapObserver.observe(this.#container);
      this.#mapObserver.observe(this.#panel);
    }
    return page;
  }

  #measureMap(): void {
    if (!this.#container?.isConnected) return;
    const width = this.#container.clientWidth,
      height = this.#container.clientHeight;
    if (!width || !height) return;
    const production = this.#screen === 'production';
    const wide = window.matchMedia('(min-width: 601px)').matches;
    const panelHeight = Math.min(224, Math.max(88, height - 320 - 16));
    this.#root
      .querySelector<HTMLElement>('.map-page')
      ?.style.setProperty('--production-panel-height', `${panelHeight}px`);
    const origin = this.#ring?.getBoundingClientRect();
    const mapBounds = this.#container.getBoundingClientRect();
    const panelBounds =
      this.#panel && !this.#panel.hidden
        ? this.#panel.getBoundingClientRect()
        : null;
    const bounds = this.#ring
      ? [...this.#ring.querySelectorAll('button')].map((node) =>
          node.getBoundingClientRect(),
        )
      : [];
    const viewport = {
      width,
      height,
      fontScale:
        parseFloat(getComputedStyle(document.documentElement).fontSize) / 16,
      ...(origin && bounds.length
        ? {
            ringLeft: Math.ceil(
              Math.max(1, ...bounds.map((rect) => origin.x - rect.left)) - 0.01,
            ),
            ringRight: Math.ceil(
              Math.max(1, ...bounds.map((rect) => rect.right - origin.x)) -
                0.01,
            ),
            ringTop: Math.ceil(
              Math.max(1, ...bounds.map((rect) => origin.y - rect.top)) - 0.01,
            ),
            ringBottom: Math.ceil(
              Math.max(1, ...bounds.map((rect) => rect.bottom - origin.y)) -
                0.01,
            ),
          }
        : {}),
      availableWidth:
        production && wide
          ? width - Math.min(350, width * 0.4) - 24
          : panelBounds && panelBounds.left > mapBounds.left + width * 0.5
            ? Math.max(1, panelBounds.left - mapBounds.left - 8)
            : width,
      availableHeight:
        production && !wide
          ? height - panelHeight - 16
          : panelBounds && panelBounds.width > width * 0.6
            ? Math.max(1, panelBounds.top - mapBounds.top - 8)
            : height,
    };
    const key = JSON.stringify([viewport, this.#mapFocusRevision]);
    if (key === this.#viewportKey) return;
    this.#viewportKey = key;
    if (typeof cancelAnimationFrame !== 'undefined')
      cancelAnimationFrame(this.#resizeFrame);
    this.#resizeFrame = requestAnimationFrame(() =>
      this.#emit({ type: 'map-size', viewport }),
    );
  }

  #renderMapProblems(model: AppReadModel): void {
    for (const control of this.#root.querySelectorAll<HTMLElement>(
      '.nav-button[data-screen]',
    )) {
      const attention = model.attentionScreens.some(
        (screen) => screen === control.dataset.screen,
      );
      control.querySelector('.nav-attention')?.remove();
      if (attention) {
        const marker = element('span', 'nav-attention', '!');
        marker.setAttribute('aria-hidden', 'true');
        control.append(marker);
        control.title = `${control.getAttribute('aria-label')}: Needs attention`;
      } else control.removeAttribute('title');
      control.setAttribute(
        'aria-description',
        attention ? 'Needs attention' : '',
      );
    }
    let legend = this.#root.querySelector<HTMLElement>('.map-attention-legend');
    const show = model.attentionScreens.length > 0;
    if (show && !legend) {
      legend = element('p', 'map-attention-legend', '! Needs attention');
      this.#root
        .querySelector('.app-header')
        ?.insertBefore(legend, this.#root.querySelector('.main-nav'));
    }
    if (!show) legend?.remove();
    this.#root.querySelector('.map-route-legend')?.remove();
    if (model.screen === 'route') {
      const routes = element('p', 'map-route-legend');
      routes.append(
        element('span', 'route-available-legend', '● Available transports'),
        document.createTextNode(' · '),
        element('span', 'route-assigned-legend', '● Route fleets'),
      );
      this.#container?.append(routes);
    }
  }

  #renderProductionRing(model: AppReadModel): void {
    const planet = model.screen === 'production' ? model.planet : null;
    if (!planet) {
      this.#ring?.remove();
      this.#ring = null;
      this.#ringKey = '';
      return;
    }
    const key = JSON.stringify([
      planet.id,
      model.phase,
      model.productionMap.options,
      model.productionMap.radius,
    ]);
    if (key !== this.#ringKey || !this.#ring) {
      const active = document.activeElement;
      const label =
        active instanceof HTMLElement && this.#ring?.contains(active)
          ? active.getAttribute('aria-label')
          : null;
      this.#ring?.remove();
      this.#ring = renderProductionRing(model, this.#emit);
      this.#container?.append(this.#ring);
      this.#ringKey = key;
      if (label)
        [...this.#ring.querySelectorAll<HTMLElement>('[aria-label]')]
          .find((node) => node.getAttribute('aria-label') === label)
          ?.focus({ preventScroll: true });
    }
    for (const choice of this.#ring.querySelectorAll<HTMLElement>(
      '[data-production-option]',
    )) {
      choice.setAttribute(
        'aria-pressed',
        String(
          choice.dataset.productionOption ===
            model.productionMap.selectedOption?.type,
        ),
      );
    }
    const point = productionPosition(
      HexGeometry.toPoint(planet.position),
      model.camera,
      {
        width: this.#container?.clientWidth ?? 0,
        height: this.#container?.clientHeight ?? 0,
        availableWidth: 1,
        availableHeight: 1,
      },
    );
    this.#ring.style.left = `${point.x}px`;
    this.#ring.style.top = `${point.y}px`;
  }

  #renderSelection(model: AppReadModel): void {
    if (!this.#panel) return;
    this.#cancelSelectionGesture?.();
    this.#panel.hidden = false;
    if (model.screen === 'orders') {
      const page = this.#root.querySelector<HTMLElement>('.map-page');
      if (page) page.dataset.orderPage = model.orderView?.page ?? 'menu';
      this.#panel.setAttribute('aria-label', 'Orders');
      this.#panel.replaceChildren(renderOrders(model, this.#emit));
      return;
    }
    const salvage = renderSalvageSelection(model, this.#emit);
    if (salvage) {
      this.#panel.setAttribute('aria-label', 'Salvage and shipyard');
      this.#panel.replaceChildren(salvage);
      return;
    }
    const trade =
      model.screen === 'map' || model.screen === 'route'
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
    if (model.screen === 'production') {
      this.#panel.setAttribute('aria-label', 'Production controls');
      this.#panel.replaceChildren(
        ...(model.planet ? [renderProductionMapPanel(model, this.#emit)] : []),
      );
      this.#panel.hidden = !model.planet;
      return;
    }
    if (
      model.screen === 'route' &&
      !model.mapFleetId &&
      !model.destinationFleetId
    ) {
      const planet = model.ownedPlanets.find(
        (p) => p.position.key === model.selected?.position.key,
      );
      this.#panel.setAttribute('aria-label', 'Route planet');
      this.#panel.replaceChildren(
        ...(planet ? [renderRoutePlanet(model, planet, this.#emit)] : []),
      );
      this.#panel.hidden = !planet;
      return;
    }
    const selectedFleet = [
      ...model.fleets,
      ...(model.pirates ?? []).map(pirateAsFleet),
    ].find(
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
    const terrainName =
      cell?.terrain === 'dense-asteroids'
        ? 'Dense asteroid belt'
        : cell?.terrain === 'sparse-asteroids'
          ? 'Sparse asteroid belt'
          : cell?.terrain === 'nebula'
            ? 'Nebula'
            : null;
    const title = renderMapLocationHeading(
      object?.name ?? terrainName ?? 'Fleets',
      source?.id,
      this.#emit,
    );
    const description = owned
      ? 'A colony of your empire.'
      : object?.kind === 'star'
        ? 'A star. Its hex is impassable.'
        : object?.kind === 'planet'
          ? 'An uninhabited world near your homeworld.'
          : cell?.terrain === 'dense-asteroids'
            ? 'Impassable asteroid field.'
            : cell?.terrain === 'sparse-asteroids'
              ? 'Entering or leaving this hex uses a full year of movement, regardless of engine.'
              : cell?.terrain === 'nebula'
                ? 'Ships inside can only be detected from the same hex. Observers inside see only their own hex. The cloud blocks sight beyond it.'
                : '';
    const contents: HTMLElement[] =
      (object || terrainName) &&
      (model.screen === 'map' || model.screen === 'route')
        ? [
            title,
            element(
              'p',
              terrainName
                ? 'selection-description terrain-description'
                : 'selection-description',
              description,
            ),
          ]
        : [];
    const destinationFleet = model.destinationFleetId
      ? model.fleets.find((fleet) => fleet.id === model.destinationFleetId)
      : null;
    if (model.screen === 'map' && model.selectedPlanetInfo) {
      const summary = element('div', 'planet-selection-summary');
      summary.append(
        planetIllustration(false, model.selectedPlanetInfo.environment),
        element(
          'p',
          'planet-map-info',
          `Type: ${model.selectedPlanetInfo.environment} · Habitability: ${model.selectedPlanetInfo.habitability}%`,
        ),
      );
      contents.push(summary);
    } else if (model.screen === 'map' && cell && !cell.explored && !object) {
      contents.push(
        renderMapLocationHeading('Unexplored', undefined, this.#emit),
      );
    }
    if (destinationFleet) {
      const colonization = model.destinationOrder === 'colonize';
      const salvage = model.destinationOrder === 'salvage';
      contents.push(
        element(
          'p',
          'destination-mode',
          salvage
            ? `Choose a wreck to salvage with ${destinationFleet.name}.`
            : colonization
              ? `Choose a planet to colonize with ${destinationFleet.name}.`
              : `Choose a destination for ${destinationFleet.name}.`,
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
      if (salvage || colonization) {
        const picker = element('select');
        picker.setAttribute(
          'aria-label',
          salvage ? 'Salvage wreck' : 'Colonization planet',
        );
        const placeholder = element(
          'option',
          '',
          salvage ? 'Choose a wreck to salvage' : 'Choose a planet to colonize',
        );
        placeholder.value = '';
        picker.append(placeholder);
        if (salvage) {
          for (const wreck of model.wrecks.filter(
            (wreck) => !wreck.reservedBy && !wreck.towedBy && !wreck.yardId,
          )) {
            const option = element(
              'option',
              '',
              `${wreck.ship.type} wreck · ${wreck.ship.engines['Rocket engine']} Rocket / ${wreck.ship.engines['Ion pulse engine']} Ion${wreck.ship.telescope ? ` · Telescope ${wreck.ship.telescope}` : ''}`,
            );
            option.value = wreck.id;
            picker.append(option);
          }
        } else
          for (const target of model.cells) {
            if (
              colonization &&
              (!target.explored ||
                target.object?.kind !== 'planet' ||
                target.object.owned)
            )
              continue;
            if (target.passable === false) continue;
            const option = element(
              'option',
              '',
              target.object?.name ?? 'Empty space',
            );
            option.value = target.position.key;
            picker.append(option);
          }
        picker.addEventListener('change', () => {
          if (!picker.value) return;
          if (salvage) {
            this.#emit({ type: 'select-salvage', id: picker.value });
            return;
          }
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
        if (salvage && picker.options.length === 1)
          contents.push(
            element('p', 'muted-note', 'No available wrecks are known.'),
          );
      }
    }
    if (
      (model.screen === 'map' || model.screen === 'route') &&
      object?.kind === 'planet'
    )
      contents.push(
        element('span', 'pill', owned ? model.playerName : 'Uninhabited'),
      );
    if (
      (model.screen === 'map' || model.screen === 'route') &&
      owned &&
      object
    ) {
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
    if ((model.screen === 'map' || model.screen === 'route') && orderStatus)
      contents.push(
        element(
          'p',
          'order-status',
          `${orderStatus.emptySites} empty building sites · ${orderStatus.emptyQueues} idle planet build queue`,
        ),
      );
    if (
      (model.screen === 'map' || model.screen === 'route') &&
      cell &&
      !model.destinationFleetId
    ) {
      const fleets = renderMapFleetPanel(model, this.#emit, cell.position);
      if (
        model.fleets.some(
          (fleet) => fleet.position?.key === cell.position.key,
        ) ||
        model.pirates.some(
          (pirate) => pirate.position.key === cell.position.key,
        )
      ) {
        // flottadministration: position and ships take priority over planet administration.
        if (object) contents.splice(0, 1);
        contents.unshift(fleets);
      }
    }
    this.#panel.replaceChildren(...contents);
    this.#panel.hidden = contents.length === 0;
  }

  animateTurnStep(
    frame: TurnFrame,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    return this.#map?.animateTurnStep?.(frame, onProgress) ?? Promise.resolve();
  }

  renderCamera(model: AppReadModel): void {
    this.#map?.render(model);
    this.#announcementModel = model.eventPlayback ? model : null;
    this.#positionAnnouncement();
    if (this.#zoom)
      this.#zoom.value = `${Math.round(model.camera.zoom * 100)}%`;
    if (this.#coordinates)
      this.#coordinates.textContent = `X ${model.camera.center.x.toFixed(0)} · Y ${model.camera.center.y.toFixed(0)}`;
  }

  animatePresentation(
    duration: number,
    onProgress: (progress: number) => boolean | void,
  ): Promise<void> {
    if (this.#disposed) return Promise.resolve();
    if (
      typeof requestAnimationFrame === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      onProgress(1);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.#finishPresentation = resolve;
      let started: number | null = null;
      const draw = (now: number) => {
        if (this.#disposed) {
          resolve();
          return;
        }
        started ??= now;
        const progress = Math.min(1, (now - started) / duration);
        const active = onProgress(progress);
        if (progress === 1 || active === false) {
          this.#finishPresentation = null;
          resolve();
        } else this.#presentationFrame = requestAnimationFrame(draw);
      };
      this.#presentationFrame = requestAnimationFrame(draw);
    });
  }
}
import { renderSalvageSelection } from './SalvageView.js';
