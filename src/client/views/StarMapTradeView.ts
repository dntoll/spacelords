import type { AppReadModel } from '../models/AppModel.js';
import { tradeAssignmentIssue } from '../models/TradeAssignment.js';
import type { IntentHandler } from './ViewContracts.js';
import { renderTradeAssignment } from './TradeFleetView.js';
import { renderTradeRouteDetails } from './TradeRouteDetailsView.js';
import { button, element } from './dom.js';

export function renderMapTradeSelection(
  model: AppReadModel,
  emit: IntentHandler,
): HTMLElement | null {
  const state = model.mapTrade;
  const panel = element('div', 'map-trade-details');
  if (state.candidateRouteIds.length) {
    panel.append(
      element(
        'h2',
        '',
        state.assignmentFleetId
          ? 'Choose a route for this fleet'
          : 'Choose a trade route',
      ),
    );
    for (const id of state.candidateRouteIds) {
      const route = model.tradeRoutes.find((r) => r.id === id);
      if (!route) continue;
      const fleet = model.fleets.find((f) => f.id === state.assignmentFleetId);
      panel.append(
        fleet
          ? renderTradeAssignment(
              fleet,
              route,
              model,
              emit,
              `${route.from} ↔ ${route.to}`,
            )
          : button(
              `${route.from} ↔ ${route.to}`,
              () => emit({ type: 'map-select-route', id }),
              'button secondary-button',
            ),
      );
    }
    panel.append(
      button(
        'Cancel',
        () => emit({ type: 'cancel-map-trade' }),
        'button secondary-button',
      ),
    );
    return panel;
  }
  if (state.sourcePlanetId) {
    const source = model.ownedPlanets.find(
      (p) => p.id === state.sourcePlanetId,
    );
    panel.append(
      element('h2', '', 'Create trade route'),
      element(
        'p',
        '',
        state.preview?.label ??
          `${source?.name ?? 'Planet'} → Choose an owned planet`,
      ),
      element(
        'p',
        'map-route-feedback',
        state.preview?.issue ??
          (state.preview
            ? 'Release to create route'
            : 'Select another owned planet on the map.'),
      ),
    );
    panel.append(
      button(
        'Cancel',
        () => emit({ type: 'cancel-map-trade' }),
        'button secondary-button',
      ),
    );
    return panel;
  }
  const route = model.tradeRoutes.find((r) => r.id === state.routeId);
  return route ? renderTradeRouteDetails(route, model, emit) : null;
}

export function mapFleetRouteFeedback(model: AppReadModel): string | null {
  if (!model.mapTrade.hoveredRouteIds.length) return null;
  const fleet = model.fleets.find(
    (f) => f.id === model.mapTrade.assignmentFleetId,
  );
  if (!fleet) return null;
  return model.mapTrade.hoveredRouteIds
    .map((id) => {
      const route = model.tradeRoutes.find((r) => r.id === id)!;
      const issue = tradeAssignmentIssue(fleet, route, model.fleets);
      return `${route.from} ↔ ${route.to}: ${issue ?? 'Release to assign fleet'}`;
    })
    .join(' · ');
}
