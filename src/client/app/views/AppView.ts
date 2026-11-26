import {
  renderFleetEquipment,
  renderCrew,
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
import type {
  AppPort,
  IntentHandler,
  MapFactory,
  MapPort,
} from './ViewContracts.js';
import { button, element } from '../../common/dom.js';
import type { Point } from '../../common/HexCoordinate.js';
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
  #gameOverDialog: HTMLDialogElement | null = null;
  #researchKey = '';
  #inspectedResearch: AppReadModel['inspectedResearch'] = null;
  #researchViewport: HTMLElement | null = null;
  #researchObserver: ResizeObserver | null = null;
  #mapObserver: ResizeObserver | null = null;
  #viewportKey = '';
  #mapFocusRevision = 0;
  #resizeFrame = 0;
  #playingEvents = false;
  #presentationFrame = 0;
  #finishPresentation: (() => void) | null = null;
  #disposed = false;
  readonly #clearFleetOnOutsideClick = (event: MouseEvent): void => {
    const page = this.#root.querySelector('.fleet-ships');
    const target = event.target;
    if (
      page &&
      target instanceof Element &&
      !page.contains(target) &&
      !target.closest('button')
    )
      page.dispatchEvent(new Event('clear-fleet-selection'));
  };

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
    this.#root.addEventListener('click', this.#clearFleetOnOutsideClick);
  }

  bind(handler: IntentHandler): void {
    this.#emit = (intent) => {
      // symbolbaserade-kataloger: touch browsers can blur before the Back click.
      handler(intent);
    };
  }

  render(model: AppReadModel): void {
    // ap-pa-starmap: without End turn, this marks when the map awaits the player.
    this.#root.dataset.turnIdle = String(
      (model.phase === 'planning' ||
        // upptackt-stannar-resan: after the notices the map awaits a hex.
        (model.discoveryPause && model.notice?.kind !== 'discovery')) &&
        !model.enemyTurnPending &&
        !model.turnMovement,
    );
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
    if (model.screen === 'saves') this.#fleetOrderScroll.clear();
    for (const toolbar of this.#root.querySelectorAll<HTMLElement>(
      '.fleet-order-toolbar',
    )) {
      const id =
        toolbar.closest<HTMLElement>('[data-fleet-id]')?.dataset.fleetId;
      if (id) this.#fleetOrderScroll.set(id, toolbar.scrollLeft);
    }
    this.#playingEvents = !!model.turnMovement;
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
    if (changedScreen && this.#screen === 'map' && model.screen === 'map') {
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
      if (model.screen === 'map') main.append(this.#mapPage(model.screen));
      else if (model.screen === 'fleets')
        main.append(renderFleetEquipment(model.fleet, this.#emit));
      else if (model.screen === 'crew')
        main.append(renderCrew(model.fleet, this.#emit));
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
    this.#syncLocalEditorNav(model);
    if (model.screen === 'fleets' && !changedScreen) {
      const scroll =
        this.#root.querySelector<HTMLElement>('.fleet-ships')?.scrollTop ?? 0;
      const openCrew = [
        ...this.#root.querySelectorAll<HTMLDetailsElement>(
          'details[data-crew-ship][open]',
        ),
      ].map((item) => item.dataset.crewShip);
      const next = renderFleetEquipment(model.fleet, this.#emit);
      for (const item of next.querySelectorAll<HTMLDetailsElement>(
        'details[data-crew-ship]',
      ))
        item.open = openCrew.includes(item.dataset.crewShip);
      this.#root.querySelector('main')?.replaceChildren(next);
      next.scrollTop = scroll;
    }
    if (model.screen === 'crew' && !changedScreen)
      this.#root
        .querySelector('main')
        ?.replaceChildren(renderCrew(model.fleet, this.#emit));
    if (model.screen === 'map') {
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
        turnMovement: !!model.turnMovement,
        screen: model.screen,
        pirates: model.pirates,
        mapFleetId: model.mapFleetId,
        research: model.research.completed,
        phase: model.phase,
        selected: model.selected,
        selectedPlanetInfo: model.selectedPlanetInfo,
        mapFleet: model.fleet.id === model.mapFleetId ? model.fleet : null,
        preview: model.fleetDestinationPreview,
        dragging: model.fleetDragging,
        fleetHere: model.fleet.position?.key === model.selected?.position.key,
        fleet: model.fleet,
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
    if (model.screen === 'map') this.#measureMap();
    for (const control of this.#root.querySelectorAll<HTMLButtonElement>(
      'header button',
    ))
      control.disabled = this.#playingEvents;
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
    this.#renderGameOver(model);
    if (editingName) delete active.dataset.rendering;
    this.#root.querySelector('.discovery-controls')?.remove();
    if (model.phase === 'interrupted' && model.interruption) {
      if (model.interruption.handling && !model.turnMovement)
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

  /** game-over-utan-skepp: the lost home fleet ends the game. */
  #renderGameOver(model: AppReadModel): void {
    const show =
      model.defeated &&
      model.screen !== 'saves' &&
      !model.tacticalBattle &&
      !model.boardingBattle &&
      !model.battleFeedback;
    if (!show) {
      this.#gameOverDialog?.close();
      this.#gameOverDialog?.remove();
      this.#gameOverDialog = null;
      return;
    }
    if (this.#gameOverDialog?.isConnected) return;
    const dialog = element('dialog', 'game-over-dialog');
    dialog.setAttribute('aria-labelledby', 'game-over-title');
    const title = element('h2', '', 'Game over');
    title.id = 'game-over-title';
    dialog.append(
      title,
      element('p', '', `${model.fleet.name} has no ships left.`),
      button('Saved games', () => this.#emit({ type: 'open-saves' }), 'button'),
    );
    dialog.addEventListener('cancel', (event) => event.preventDefault());
    this.#gameOverDialog = dialog;
    this.#root.append(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  dispose(): void {
    this.#root.removeEventListener('click', this.#clearFleetOnOutsideClick);
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
    this.#researchObserver?.disconnect();
    this.#researchViewport = null;
    this.#decisionDialog?.close();
    this.#decisionDialog?.remove();
    this.#decisionDialog = null;
    this.#gameOverDialog?.close();
    this.#gameOverDialog?.remove();
    this.#gameOverDialog = null;
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
      ['fleets', 'Fleet'],
      ['crew', 'Crew'],
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
                    : target === 'crew'
                      ? 'open-crew'
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
      model.fleet,
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
              ? 'Ships slow to a crawl when entering or leaving this hex.'
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
    const leftBehind =
      model.fleet.abandonedLocations?.filter(
        (ship) => ship.position.key === cell?.position.key,
      ) ?? [];
    if (model.screen === 'map' && leftBehind.length) {
      contents.push(
        element(
          'p',
          'selection-description',
          `Left behind: ${leftBehind.map((ship) => ship.type).join(', ')}`,
        ),
      );
    }
    const destinationFleet =
      model.destinationFleetId === model.fleet.id ? model.fleet : null;
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
        model.fleet.position?.key === cell.position.key ||
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
    onProgress?: (progress: number, point?: Point, crossed?: boolean) => void,
    duration?: number,
    ends?: { readonly start: boolean; readonly end: boolean },
  ): Promise<void> {
    return (
      this.#map?.animateTurnStep?.(frame, onProgress, duration, ends) ??
      Promise.resolve()
    );
  }

  renderCamera(model: AppReadModel): void {
    this.#map?.render(model);
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
  const fleetName = model.fleet.name;
  if (model.travelling)
    return element(
      'p',
      'travel-route',
      `${fleetName} is on its way · ${route.steps.length} hex left.`,
    );
  // somlos-forflyttning: without an active enemy rounds and AP stay hidden.
  if (!route.contested)
    return element(
      'p',
      'travel-route',
      `${route.steps.length} hex. Select the hex again to travel.`,
    );
  // ap-pa-starmap: the remaining AP cover the first part of the route.
  const later = Math.max(0, route.steps.length - route.available);
  const rounds = Math.ceil(later / Math.max(1, route.perRound));
  const when =
    rounds === 0
      ? 'this round'
      : `${rounds} more ${rounds === 1 ? 'round' : 'rounds'}`;
  return element(
    'p',
    'travel-route',
    `${route.steps.length} hex · ${route.available} AP left · arrives ${when}. Select the hex again to travel.`,
  );
}
