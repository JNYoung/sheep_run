import type { Direction, GridCoord, LevelDefinition, RuleResult, TapIntent } from "./types";

export function evaluateTap(level: LevelDefinition, tap: TapIntent): RuleResult {
  if (tap.target === "none" || !tap.coord) {
    return fail("fail.missed");
  }

  if (tap.target !== "sheep") {
    return fail("fail.wrongTarget");
  }

  if (!sameCoord(tap.coord, level.sheep)) {
    return fail("fail.wrongTarget");
  }

  const path = buildPathToBarn(level);
  if (path.length === 0) {
    return fail("fail.notAligned");
  }

  const blockers = new Set(level.obstacles.map((obstacle) => coordKey(obstacle)));
  for (let index = 0; index < path.length - 1; index += 1) {
    if (blockers.has(coordKey(path[index]))) {
      return {
        outcome: "fail",
        reasonKey: "fail.blocked",
        path,
      };
    }
  }

  return {
    outcome: "win",
    reasonKey: "result.win.body",
    path,
  };
}

export function buildPathToBarn(level: LevelDefinition): GridCoord[] {
  const sheep = level.sheep;
  const barn = level.barn;
  const dx = Math.sign(barn.x - sheep.x);
  const dy = Math.sign(barn.y - sheep.y);

  if ((dx !== 0 && dy !== 0) || (dx === 0 && dy === 0)) {
    return [];
  }

  const path: GridCoord[] = [];
  let x = sheep.x + dx;
  let y = sheep.y + dy;
  let guard = level.width * level.height + 4;

  while (guard > 0) {
    const coord = { x, y };
    if (!inBounds(level, coord)) {
      return [];
    }

    path.push(coord);
    if (sameCoord(coord, barn)) {
      return path;
    }

    x += dx;
    y += dy;
    guard -= 1;
  }

  return [];
}

export function directionBetween(from: GridCoord, to: GridCoord): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "east" : "west";
  }

  return dy >= 0 ? "south" : "north";
}

export function sameCoord(a: GridCoord, b: GridCoord): boolean {
  return a.x === b.x && a.y === b.y;
}

export function coordKey(coord: GridCoord): string {
  return `${coord.x},${coord.y}`;
}

export function inBounds(level: LevelDefinition, coord: GridCoord): boolean {
  return coord.x >= 0 && coord.y >= 0 && coord.x < level.width && coord.y < level.height;
}

function fail(reasonKey: string): RuleResult {
  return {
    outcome: "fail",
    reasonKey,
    path: [],
  };
}
