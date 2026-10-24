import { tradeNetworkState } from './trade-network.js';

export function routeEscortState() {
  const state = tradeNetworkState();
  const template = state.fleets.find((f) => f.id === 'freighters')!;
  const fleets = [
    {
      ...template,
      id: 'carrier-a',
      name: 'Carrier A',
      ships: { ...template.ships, 'Transport ship': 1, Fighter: 0 },
    },
    {
      ...template,
      id: 'carrier-b',
      name: 'Carrier B',
      ships: { ...template.ships, 'Transport ship': 1, Fighter: 0 },
    },
    {
      ...template,
      id: 'fighters',
      name: 'Fighters',
      ships: { ...template.ships, 'Transport ship': 0, Fighter: 5 },
    },
  ];
  return { ...state, fleets };
}
