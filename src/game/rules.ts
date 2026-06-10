import type { Direction, GridCoord, LevelDefinition, RuleResult, SheepDefinition, TapIntent } from "./types";

const directionDelta: Record<Direction, GridCoord> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export function evaluateTap(level: LevelDefinition, sheep: SheepDefinition[], tap: TapIntent): RuleResult {
  if (tap.target === "none" || !tap.coord) {
    return fail("fail.missed");
  }

  if (tap.target !== "sheep" || !tap.sheepId) {
    return fail("fail.wrongTarget");
  }

  const selectedSheep = sheep.find((candidate) => candidate.id === tap.sheepId);
  if (!selectedSheep || !sameCoord(selectedSheep, tap.coord)) {
    return fail("fail.wrongTarget");
  }

  const path = buildEscapePath(level, selectedSheep, sheep);
  if (path.blocker === "sheep") {
    return {
      outcome: "fail",
      reasonKey: "fail.blockedBySheep",
      path: path.path,
      sheepId: selectedSheep.id,
    };
  }

  if (path.blocker === "obstacle") {
    return {
      outcome: "fail",
      reasonKey: "fail.blockedByObstacle",
      path: path.path,
      sheepId: selectedSheep.id,
    };
  }

  return {
    outcome: "win",
    reasonKey: "status.sheepEntered",
    path: path.path,
    sheepId: selectedSheep.id,
  };
}

export function buildEscapePath(
  level: LevelDefinition,
  selectedSheep: SheepDefinition,
  sheep: SheepDefinition[],
): { blocker: "none" | "sheep" | "obstacle"; path: GridCoord[] } {
  const delta = directionDelta[selectedSheep.facing];
  const path: GridCoord[] = [];
  const obstacleKeys = new Set(level.obstacles.map((obstacle) => coordKey(obstacle)));
  const sheepKeys = new Set(
    sheep
      .filter((candidate) => candidate.id !== selectedSheep.id)
      .map((candidate) => coordKey(candidate)),
  );

  let coord = {
    x: selectedSheep.x + delta.x,
    y: selectedSheep.y + delta.y,
  };
  let guard = level.width * level.height + 4;

  while (guard > 0 && inBounds(level, coord)) {
    path.push({ ...coord });
    if (sheepKeys.has(coordKey(coord))) {
      return { blocker: "sheep", path };
    }

    if (obstacleKeys.has(coordKey(coord))) {
      return { blocker: "obstacle", path };
    }

    coord = {
      x: coord.x + delta.x,
      y: coord.y + delta.y,
    };
    guard -= 1;
  }

  path.push({ ...coord });
  path.push({ x: level.pen.x, y: level.pen.y });
  return { blocker: "none", path };
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
