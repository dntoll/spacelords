import {
  gameText,
  discoveryControls,
  renderProduction,
  bindMapSelectionScroll,
  renderMapFleetPanel,
  renderMapLocationHeading,
  renderSaveSlots,
  clearSlotDialog,
  renderResearch,
  showResearchTab,
  type ResearchTab,
  renderResearchSelection,
  updateResearchCamera,
  planetIllustration,
  renderTurnActions,
  renderEvents,
  renderCombatLog,
  renderEventContent,
} from '../../space-map/views/index.js';
import {
  BattleView,
  type BattleMapFactory,
} from '../../space-battle/views/index.js';
import {
  BoardingView,
  BoardingEditorView,
  type BoardingMapFactory,
} from '../../boarding/views/index.js';
import {
  pirateAsFleet,
  isMapScreen,
  type MapScreen,
  type MapCell,
  type TurnFrame,
} from '../../space-map/models/index.js';
import type { AppReadModel, Screen } from '../models/AppModel.js';
import { playerNoticeText } from './playerNoticeText.js';
import { buildLabelText, currentBuild } from './buildLabel.js';
import { HexGeometry, HexCoordinate } from '../../common/HexCoordinate.js';
import type {
  AppPort,
  IntentHandler,
  MapFactory,
  MapPort,
} from './ViewContracts.js';
import { button, element } from '../../common/dom.js';
import type {
  BattleManeuver,
  BattleShot,
} from '../../space-battle/models/index.js';

export class AppView implements AppPort {
  #battleView: BattleView | null = null;
  #boardingView: BoardingView | null = null;
  #editorView: BoardingEditorView | null = null;
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
  #decisionDialog: HTMLDialogElement | null = null;
  #researchKey = '';
  #inspectedResearch: AppReadModel['inspectedResearch'] = null;
  #researchViewport: HTMLElement | null = null;
  #researchObserver: ResizeObserver | null = null;
  #mapObserver: ResizeObserver | null = null;
  #viewportKey = '';
  #mapFocusRevision = 0;
  #resizeFrame = 0;
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
    private readonly boardingMapFactory?: BoardingMapFactory,
  ) {
    this.#root = root;
    this.#mapFactory = mapFactory;
  }

  bind(handler: IntentHandler): void {
    this.#emit = (intent) => {
      // symbolbaserade-kataloger: touch browsers can blur before the Back click.
      handler(intent);
    };
  }

  render(model: AppReadModel): void {
    if (model.editor) {
      this.#editorView ??= new BoardingEditorView(this.#root, (intent) =>
        this.#emit(intent),
      );
      this.#editorView.render(model);
      return;
    }
    if (this.#editorView) {
      this.#editorView.dispose();
      this.#editorView = null;
      this.#screen = null;
      this.#saveKey = '';
    }
    if (model.boardingBattle) {
      this.#battleView?.dispose();
      this.#battleView = null;
      this.#boardingView ??= new BoardingView(
        this.#root,
        (intent) => this.#emit(intent),
        this.boardingMapFactory,
      );
      this.#boardingView.render(
        model.boardingBattle,
        playerNoticeText(model.notice),
        model.boardingPresentation ?? [],
        model.boardingShot ?? null,
      );
      return;
    }
    this.#boardingView?.dispose();
    this.#boardingView = null;
    if (
      (model.battleFeedback || model.tacticalBattle) &&
      !model.turnMovement &&
      model.screen !== 'saves'
    ) {
      this.#battleView ??= new BattleView(
        this.#root,
        (intent) => this.#emit(intent),
        this.battleMapFactory,
      );
      this.#battleView.render(
        (model.battleFeedback ?? model.tacticalBattle)!,
        playerNoticeText(model.notice),
      );
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
      this.#syncLocalEditorNav(model);
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
        heading.textContent = model.screen === 'map' ? 'Star map' : 'Fleets';
      this.#selectionKey = '';
      this.#screen = model.screen;
    } else if (changedScreen) {
      this.#mapObserver?.disconnect();
      this.#mapObserver = null;
      this.#viewportKey = '';
      this.#map?.dispose();
      this.#map = null;
      this.#selectionKey = '';
      this.#root.replaceChildren(this.#header(model.screen));
      const main = element('main', 'page');
      if (isMapScreen(model.screen)) main.append(this.#mapPage(model.screen));
      else if (model.screen === 'production') main.append(renderProduction());
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
    }
    // forskningsflikar: the chosen tab and queue scroll survive re-renders.
    const researchTab = (this.#root.querySelector<HTMLElement>(
      '.research-bottom',
    )?.dataset.tab ?? 'selected') as ResearchTab;
    const researchQueueScroll =
      this.#root.querySelector('.research-queue')?.scrollTop ?? 0;
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
        const queue = this.#root.querySelector<HTMLElement>('.research-queue');
        showResearchTab(
          this.#root,
          model.inspectedResearch !== null &&
            model.inspectedResearch !== this.#inspectedResearch
            ? 'selected'
            : researchTab,
        );
        if (queue) queue.scrollTop = researchQueueScroll;
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
          (
            control ??
            this.#root.querySelector<HTMLElement>(
              '.research-tab[data-tab="queue"]',
            )
          )?.focus({
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
    this.#attachTurnActions(previousActions, previousEventScroll);
    this.#syncLocalEditorNav(model);
    if (isMapScreen(model.screen)) {
      this.#root
        .querySelector('.map-page')
        ?.classList.toggle('is-event-playback', !!model.eventPlayback);
      this.#root
        .querySelector('.map-page')
        ?.classList.toggle('is-turn-movement', !!model.turnMovement);
      this.#map?.render(model);
      this.#mapFocusRevision = model.mapFocusRevision;
      if (this.#zoom)
        this.#zoom.value = `${Math.round(model.camera.zoom * 100)}%`;
      if (this.#coordinates)
        this.#coordinates.textContent = `X ${model.camera.center.x.toFixed(0)} · Y ${model.camera.center.y.toFixed(0)}`;
      const key = JSON.stringify({
        eventPlayback: !!model.eventPlayback,
        turnMovement: !!model.turnMovement,
        screen: model.screen,
        pirates: model.pirates,
        mapFleetId: model.mapFleetId,
        research: model.research.completed,
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
        fleetNameEdit: model.fleetNameEdit,
        travelRoute: model.travelRoute,
        travelling: model.travelling,
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
  boardingPresentation(): Promise<void> | null {
    return this.#boardingView?.whenIdle() ?? null;
  }

  async animateBattleShot(shot: BattleShot): Promise<void> {
    await this.#battleView?.animateShot(shot);
  }
  async animateBattleManeuver(maneuver: BattleManeuver): Promise<void> {
    await this.#battleView?.animateManeuver(maneuver);
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
    log.scrollTop = log.scrollHeight;
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
      announcement.append(renderEventContent(current));
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
      action.disabled =
        playback.stage !== 'awaiting-choice' ||
        action.dataset.blocked === 'true';
  }

  #positionAnnouncement(): void {
    const announcement = this.#root.querySelector<HTMLElement>(
      '.event-announcement',
    );
    const target = this.#root.querySelector<HTMLElement>('.event-destination');
    const log = target?.closest('[role="log"]');
    if (!announcement || !target || !log) return;
    log.scrollTop = log.scrollHeight;
    const model = this.#announcementModel;
    const event = model?.eventPlayback?.events[model.eventPlayback.index];
    // handelseannonsering / handelser-pa-kartan: measure the hex on the canvas
    // the player sees. The canvas can sit inside the map container.
    const drawn = this.#container
      ?.querySelector('canvas')
      ?.getBoundingClientRect();
    const map =
      drawn && drawn.width > 0 && drawn.height > 0
        ? drawn
        : this.#container?.getBoundingClientRect();
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
      const placedHeight = announcement.offsetHeight;
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
        // --event-origin-y is the top edge, so a later height change grows downward.
        originY = Math.min(markerY + markerGap, bottom - placedHeight);
      } else originY = markerY + markerGap;
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
      `${(top + bottom) / 2 - originY - (announcement.offsetHeight || 0) / 2}px`,
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
    const existingNotice = this.#root.querySelector('.game-notice');
    const noticeText = playerNoticeText(model.notice);
    if (noticeText) {
      const notice = element('p', 'game-notice', noticeText);
      notice.setAttribute('role', 'status');
      existingNotice?.replaceWith(notice);
      if (!existingNotice) this.#root.append(notice);
    } else existingNotice?.remove();
  }

  dispose(): void {
    this.#editorView?.dispose();
    this.#editorView = null;
    this.#boardingView?.dispose();
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

  /** lokal-bordningskarteditor: the button stays hidden without a local catalog. */
  #syncLocalEditorNav(model: AppReadModel): void {
    const existing = this.#root.querySelector('.local-editor-nav');
    if (!model.editorAvailable) {
      this.#root.classList.remove('has-local-editor-nav');
      existing?.remove();
      return;
    }
    this.#root.classList.add('has-local-editor-nav');
    if (existing) {
      this.#root.append(existing);
      return;
    }
    const nav = element('div', 'local-editor-nav');
    nav.append(
      button('Ship layouts', () => this.#emit({ type: 'open-editor' })),
    );
    this.#root.append(nav);
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
    const fullscreen = button(
      '⛶',
      () => {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => undefined);
        } else {
          void document.documentElement
            .requestFullscreen?.()
            .catch(() => undefined);
        }
      },
      'fullscreen-button',
    );
    fullscreen.setAttribute('aria-label', 'Toggle fullscreen');
    fullscreen.title = 'Toggle fullscreen';
    fullscreen.hidden =
      typeof document.documentElement.requestFullscreen !== 'function';
    const navigation = element('nav', 'main-nav');
    navigation.setAttribute('aria-label', 'Main navigation');
    const build = currentBuild ? buildLabelText(currentBuild) : null;
    if (build) brand.title = `Saved games (${build})`;
    if (screen === 'saves') {
      header.append(brand);
      // synlig-byggversion: the first screen names the deployed branch.
      if (build) header.append(element('p', 'build-label', build));
      header.append(fullscreen);
      return header;
    }
    for (const [target, label] of [
      ['map', 'Star map'],
      ['research', 'Research'],
      ['fleets', 'Fleets'],
      ['production', 'Production'],
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
                    : 'open-production',
          }),
        'nav-button',
      );
      choice.dataset.screen = target;
      if (screen === target) choice.setAttribute('aria-current', 'page');
      navigation.append(choice);
    }
    // helskarm-fran-sparade-spel: fullscreen is chosen on Saved games only.
    header.append(brand, navigation);
    return header;
  }

  // gemensam-events-panel: retain one log and its reading position across screens.
  #attachTurnActions(
    previousActions: HTMLElement | null,
    previousEventScroll: number,
  ): void {
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
  }

  #mapPage(screen: MapScreen): HTMLElement {
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
    const mapBounds = this.#container.getBoundingClientRect();
    const panelBounds =
      this.#panel && !this.#panel.hidden
        ? this.#panel.getBoundingClientRect()
        : null;
    const viewport = {
      width,
      height,
      fontScale:
        parseFloat(getComputedStyle(document.documentElement).fontSize) / 16,
      availableWidth:
        panelBounds && panelBounds.left > mapBounds.left + width * 0.5
          ? Math.max(1, panelBounds.left - mapBounds.left - 8)
          : width,
      availableHeight:
        panelBounds && panelBounds.width > width * 0.6
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

  #renderSelection(model: AppReadModel): void {
    if (!this.#panel) return;
    this.#cancelSelectionGesture?.();
    this.#panel.hidden = false;
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
      const travel = model.pirates.some(
        (pirate) => pirate.id === selectedFleet.id,
      )
        ? travelNote(model)
        : null;
      this.#panel.replaceChildren(
        renderMapFleetPanel(model, this.#emit, selectedFleet.position),
        ...(travel ? [travel] : []),
      );
      return;
    }
    const cell = model.selected;
    const object = cell?.object;
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
    );
    const description =
      object?.kind === 'star'
        ? 'A star. Its hex is impassable.'
        : object?.kind === 'planet'
          ? 'A planet.'
          : cell?.terrain === 'dense-asteroids'
            ? 'Impassable asteroid field.'
            : cell?.terrain === 'sparse-asteroids'
              ? 'Entering or leaving this hex uses a full round of movement, regardless of engine.'
              : cell?.terrain === 'nebula'
                ? 'Ships inside can only be detected from the same hex. Observers inside see only their own hex. The cloud blocks sight beyond it.'
                : '';
    const contents: HTMLElement[] =
      (object || terrainName) && model.screen === 'map'
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
      if (model.selectedPlanetInfo.surveyed) {
        summary.append(
          planetIllustration(false, model.selectedPlanetInfo.environment),
          element(
            'p',
            'planet-map-info',
            `Type: ${model.selectedPlanetInfo.environment} · Habitability: ${model.selectedPlanetInfo.habitability}%`,
          ),
          element(
            'p',
            'muted-note',
            `Resources: ${model.selectedPlanetInfo.resources.map((resource) => `${resource.name} ${resource.perYear}/round`).join(', ') || 'None'}`,
          ),
        );
      } else {
        summary.append(
          element(
            'p',
            'planet-map-info',
            'Planet details have not been explored.',
          ),
        );
      }
      contents.push(summary);
    } else if (model.screen === 'map' && cell && !cell.explored && !object) {
      contents.push(renderMapLocationHeading('Unexplored'));
    }
    const travel = travelNote(model);
    if (travel && model.screen === 'map' && !model.destinationFleetId)
      contents.push(travel);
    if (destinationFleet)
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
    if (model.screen === 'map' && cell && !model.destinationFleetId) {
      const fleets = renderMapFleetPanel(
        model,
        this.#emit,
        cell.position,
        false,
      );
      if (
        model.fleets.some(
          (fleet) => fleet.position?.key === cell.position.key,
        ) ||
        model.pirates.some(
          (pirate) => pirate.position.key === cell.position.key,
        )
      ) {
        // flottor-fore-planetdetaljer: keep the entire location together below fleets.
        if (object) {
          const details = element('section', 'planet-selection-details');
          details.append(...contents.splice(0));
          contents.push(details);
        }
        contents.unshift(fleets);
      }
    }
    this.#panel.replaceChildren(...contents);
    this.#panel.hidden = contents.length === 0;
  }

  animateTurnStep(
    frame: TurnFrame,
    onProgress?: (progress: number) => void,
    duration?: number,
  ): Promise<void> {
    return (
      this.#map?.animateTurnStep?.(frame, onProgress, duration) ??
      Promise.resolve()
    );
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

/** hexval-med-vag: how far the selected hex is and how to set off. */
function travelNote(model: AppReadModel): HTMLElement | null {
  const route = model.travelRoute;
  if (!route) return null;
  const rounds = Math.ceil(route.steps.length / Math.max(1, route.perRound));
  const fleetName =
    model.fleets.find((fleet) => fleet.id === route.fleetId)?.name ??
    'The fleet';
  return element(
    'p',
    'travel-route',
    model.travelling
      ? `${fleetName} is on its way · ${route.steps.length} hex left.`
      : `${route.steps.length} hex · about ${rounds} ${rounds === 1 ? 'round' : 'rounds'} for ${fleetName}. Select the hex again to travel.`,
  );
}
