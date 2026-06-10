export type Direction = "north" | "east" | "south" | "west";

export type TapTarget = "none" | "board" | "sheep" | "barn" | "obstacle";

export type GamePhase = "menu" | "ready" | "moving" | "won" | "failed";

export interface GridCoord {
  x: number;
  y: number;
}

export interface SheepDefinition extends GridCoord {
  facing: Direction;
}

export interface BarnDefinition extends GridCoord {
  entryDirection: Direction;
}

export interface ObstacleDefinition extends GridCoord {
  kind: "fence" | "hay" | "flower";
}

export interface LevelDefinition {
  id: string;
  titleKey: string;
  objectiveKey: string;
  width: number;
  height: number;
  sheep: SheepDefinition;
  barn: BarnDefinition;
  obstacles: ObstacleDefinition[];
}

export interface TapIntent {
  target: TapTarget;
  coord: GridCoord | null;
}

export interface RuleResult {
  outcome: "win" | "fail";
  reasonKey: string;
  path: GridCoord[];
}

export interface MoveState {
  startedAt: number;
  path: GridCoord[];
  msPerTile: number;
}

export interface GameViewState {
  phase: GamePhase;
  level: LevelDefinition;
  sheepCoord: GridCoord;
  sheepFacing: Direction;
  move: MoveState | null;
  feedback: FeedbackState | null;
  now: number;
}

export interface FeedbackState {
  kind: "fail";
  coord: GridCoord | null;
  startedAt: number;
  reasonKey: string;
}
