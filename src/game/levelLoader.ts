import level001 from "../content/levels/level_001.json";
import level002 from "../content/levels/level_002.json";
import level003 from "../content/levels/level_003.json";
import level004 from "../content/levels/level_004.json";
import level005 from "../content/levels/level_005.json";
import type { LevelDefinition } from "./types";

export const levels: LevelDefinition[] = [
  level001,
  level002,
  level003,
  level004,
  level005,
] as LevelDefinition[];

export function getLevel(index: number): LevelDefinition {
  return levels[((index % levels.length) + levels.length) % levels.length];
}
