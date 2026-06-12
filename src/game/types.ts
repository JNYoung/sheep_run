export type Direction = "north" | "east" | "south" | "west";

export type TapTarget = "none" | "board" | "sheep" | "pen" | "obstacle";

export type GamePhase = "menu" | "ready" | "moving" | "won" | "failed";

export interface GridCoord {
  x: number;
  y: number;
}

export interface SheepDefinition extends GridCoord {
  id: string;
  facing: Direction;
  color?: "cream" | "pink" | "mint" | "blue" | "yellow";
}

export interface SheepPenDefinition extends GridCoord {
  entryDirection: Direction;
}

export interface ObstacleDefinition extends GridCoord {
  kind: "fence" | "hay" | "flower" | "tree";
}

export interface LevelDefinition {
  id: string;
  titleKey: string;
  objectiveKey: string;
  width: number;
  height: number;
  sheep: SheepDefinition[];
  pen: SheepPenDefinition;
  obstacles: ObstacleDefinition[];
  difficulty?: number;
  recommendedMoves?: number;
  generatedSeed?: number;
}

export interface TapIntent {
  target: TapTarget;
  coord: GridCoord | null;
  sheepId?: string;
}

export interface RuleResult {
  outcome: "win" | "fail";
  reasonKey: string;
  path: GridCoord[];
  sheepId?: string;
}

export interface MoveState {
  sheepId: string;
  from: GridCoord;
  facing: Direction;
  startedAt: number;
  path: GridCoord[];
  msPerTile: number;
}

export interface GameViewState {
  phase: GamePhase;
  level: LevelDefinition;
  sheep: SheepDefinition[];
  move: MoveState | null;
  feedback: FeedbackState | null;
  hintSheepIds?: string[];
  now: number;
}

export interface FeedbackState {
  kind: "fail" | "warn";
  coord: GridCoord | null;
  startedAt: number;
  reasonKey: string;
  path?: GridCoord[];
}
