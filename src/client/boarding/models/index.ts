// Public model surface of the boarding module. Code outside `boarding/` imports
// boarding models only from here; everything else in the module is internal.
export { BoardingFacade } from './battle/BoardingFacade.js';
export { BoardingEngagement } from './battle/BoardingEngagement.js';
export type { SavedBoardingEngagement } from './battle/BoardingEngagement.js';
export type {
  BoardingBattle,
  BoardingBattleState,
  BoardingCommand,
  BoardingShot,
} from './battle/BoardingBattle.js';
export { BoardingEditorFacade } from './editor/BoardingEditorFacade.js';
export type { BoardingEditorCatalogItem } from './editor/BoardingEditorFacade.js';
export type {
  BoardingEditorSnapshot,
  EditorBrushButton,
  EditorPaintCell,
  EditorProjection,
  EditorTool,
  SpriteTransform,
} from './editor/BoardingEditor.js';
export { testBoardingMap } from './map/TestBoarding.js';
export type { BoardingMapId } from '../../../shared/boarding/map-format.js';
