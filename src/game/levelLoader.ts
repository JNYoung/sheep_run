import type { LevelDefinition } from "./types";

const levelModules = import.meta.glob("../content/levels/*.json", {
  eager: true,
  import: "default",
}) as Record<string, LevelDefinition>;

export const levels: LevelDefinition[] = Object.entries(levelModules)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, candidate]) => candidate);

export function getLevel(index: number): LevelDefinition {
  return levels[((index % levels.length) + levels.length) % levels.length];
}
