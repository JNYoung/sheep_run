import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const levelsDir = path.join(root, "src", "content", "levels");
const levelCount = 200;
const directions = ["north", "east", "south", "west"];
const colors = ["cream", "pink", "mint", "blue", "yellow"];
const obstacleKinds = ["fence", "hay", "flower", "tree"];
const deltas = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

fs.mkdirSync(levelsDir, { recursive: true });

for (const file of fs.readdirSync(levelsDir)) {
  if (file.endsWith(".json")) {
    fs.unlinkSync(path.join(levelsDir, file));
  }
}

const summaries = [];
for (let levelNumber = 1; levelNumber <= levelCount; levelNumber += 1) {
  const level = buildLevel(levelNumber);
  summaries.push({
    id: level.id,
    difficulty: level.difficulty,
    sheep: level.sheep.length,
    obstacles: level.obstacles.length,
    size: `${level.width}x${level.height}`,
  });
  fs.writeFileSync(
    path.join(levelsDir, `${level.id}.json`),
    `${JSON.stringify(level, null, 2)}\n`,
  );
}

console.log(`generated ${summaries.length} level(s)`);
console.log(`first: ${formatSummary(summaries[0])}`);
console.log(`middle: ${formatSummary(summaries[Math.floor(summaries.length / 2)])}`);
console.log(`last: ${formatSummary(summaries[summaries.length - 1])}`);

function buildLevel(levelNumber) {
  const spec = levelSpec(levelNumber);
  for (let attempt = 0; attempt < 420; attempt += 1) {
    const seed = hashSeed(levelNumber, attempt);
    const rng = mulberry32(seed);
    const level = tryBuildLevel(spec, rng, seed);
    if (level) {
      return level;
    }
  }

  throw new Error(`Unable to generate level ${levelNumber}`);
}

function levelSpec(levelNumber) {
  const t = (levelNumber - 1) / (levelCount - 1);
  const stage = Math.floor((levelNumber - 1) / 10);
  const withinStage = (levelNumber - 1) % 10;
  const width = Math.min(16, 5 + stage);
  const height = Math.min(16, 5 + stage);
  const capacity = width * height;
  const desiredObstacleCount = Math.max(1, Math.round(1 + stage * 1.15 + withinStage / 5));
  const stageStartSheep = Math.round(14 + stage * 7 + stage * stage * 0.2);
  const stageGrowth = Math.floor((withinStage / 9) * Math.min(8, 2 + stage * 0.35));
  const sheepRamp = levelNumber === 1
    ? 4
    : stageStartSheep + stageGrowth;
  const sheepCount = Math.min(
    220,
    capacity - desiredObstacleCount - 8,
    sheepRamp,
  );
  const obstacleCount = Math.min(
    desiredObstacleCount,
    capacity - sheepCount - 8,
  );
  const dependencyWeight = Math.min(0.96, 0.22 + t * 0.7 + stage * 0.012);

  return {
    levelNumber,
    width,
    height,
    sheepCount,
    obstacleCount,
    dependencyWeight,
    difficulty: Math.min(100, Math.round(5 + stage * 4.65 + withinStage * 0.45)),
  };
}

function tryBuildLevel(spec, rng, seed) {
  const laneMode = Math.floor((spec.levelNumber - 1) / 10) % 2 === 0 ? "row" : "column";
  const sheep = buildLaneSheep(spec, rng, laneMode);
  const obstacles = buildLaneObstacles(spec, rng, laneMode, sheep);

  const level = {
    id: `level_${String(spec.levelNumber).padStart(3, "0")}`,
    titleKey: `level.${String(spec.levelNumber).padStart(3, "0")}.title`,
    objectiveKey: objectiveKey(spec.levelNumber),
    width: spec.width,
    height: spec.height,
    difficulty: spec.difficulty,
    recommendedMoves: sheep.length,
    generatedSeed: seed,
    pen: {
      x: (spec.width - 1) / 2,
      y: -1.25,
      entryDirection: "south",
    },
    sheep,
    obstacles,
  };

  const audit = simulateClear(level);
  if (!audit.completed || audit.order.length !== sheep.length) {
    return null;
  }

  return level;
}

function buildLaneSheep(spec, rng, laneMode) {
  const laneCount = laneMode === "row" ? spec.height : spec.width;
  const laneLength = laneMode === "row" ? spec.width : spec.height;
  const counts = new Array(laneCount).fill(0);
  const lanePriority = shuffle([...counts.keys()], rng);
  let remaining = spec.sheepCount;

  while (remaining > 0) {
    let placedInPass = false;
    for (const laneIndex of lanePriority) {
      if (remaining <= 0) {
        break;
      }

      if (counts[laneIndex] >= laneLength - 1) {
        continue;
      }

      counts[laneIndex] += 1;
      remaining -= 1;
      placedInPass = true;
    }

    if (!placedInPass) {
      break;
    }
  }

  const sheep = [];
  let sheepIndex = 1;
  for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
    const count = counts[laneIndex];
    const exitsLow = laneIndex % 2 === 0;
    for (let offset = 0; offset < count; offset += 1) {
      const coord = laneMode === "row"
        ? {
            x: exitsLow ? offset : spec.width - 1 - offset,
            y: laneIndex,
            facing: exitsLow ? "west" : "east",
          }
        : {
            x: laneIndex,
            y: exitsLow ? offset : spec.height - 1 - offset,
            facing: exitsLow ? "north" : "south",
          };
      sheep.push({
        id: `s${String(sheepIndex).padStart(3, "0")}`,
        x: coord.x,
        y: coord.y,
        facing: coord.facing,
        color: colors[(sheepIndex + spec.levelNumber) % colors.length],
      });
      sheepIndex += 1;
    }
  }

  return shuffle(sheep, rng).map((candidate, index) => ({
    ...candidate,
    id: `s${String(index + 1).padStart(3, "0")}`,
  }));
}

function buildLaneObstacles(spec, rng, laneMode, sheep) {
  const occupied = new Set(sheep.map(key));
  const behindCells = [];

  if (laneMode === "row") {
    for (let y = 0; y < spec.height; y += 1) {
      const exitsLow = y % 2 === 0;
      const rowSheep = sheep.filter((candidate) => candidate.y === y);
      const occupiedXs = rowSheep.map((candidate) => candidate.x);
      const boundary = occupiedXs.length === 0
        ? (exitsLow ? 0 : spec.width - 1)
        : (exitsLow ? Math.max(...occupiedXs) + 1 : Math.min(...occupiedXs) - 1);
      for (let x = 0; x < spec.width; x += 1) {
        if (occupied.has(key({ x, y }))) {
          continue;
        }

        if ((exitsLow && x >= boundary) || (!exitsLow && x <= boundary)) {
          behindCells.push({ x, y });
        }
      }
    }
  } else {
    for (let x = 0; x < spec.width; x += 1) {
      const exitsLow = x % 2 === 0;
      const columnSheep = sheep.filter((candidate) => candidate.x === x);
      const occupiedYs = columnSheep.map((candidate) => candidate.y);
      const boundary = occupiedYs.length === 0
        ? (exitsLow ? 0 : spec.height - 1)
        : (exitsLow ? Math.max(...occupiedYs) + 1 : Math.min(...occupiedYs) - 1);
      for (let y = 0; y < spec.height; y += 1) {
        if (occupied.has(key({ x, y }))) {
          continue;
        }

        if ((exitsLow && y >= boundary) || (!exitsLow && y <= boundary)) {
          behindCells.push({ x, y });
        }
      }
    }
  }

  return shuffle(behindCells, rng).slice(0, spec.obstacleCount).map((coord, index) => ({
    ...coord,
    kind: obstacleKinds[(coord.x * 7 + coord.y * 11 + spec.levelNumber + index) % obstacleKinds.length],
  }));
}

function buildObstacles(spec, rng) {
  const obstacles = [];
  const occupied = new Set();
  const reserved = new Set([
    key({ x: Math.floor(spec.width / 2), y: 0 }),
    key({ x: Math.ceil(spec.width / 2), y: 0 }),
  ]);

  let guard = spec.width * spec.height * 3;
  while (obstacles.length < spec.obstacleCount && guard > 0) {
    guard -= 1;
    const x = Math.floor(rng() * spec.width);
    const y = Math.floor(rng() * spec.height);
    const coord = { x, y };
    const coordKey = key(coord);
    if (occupied.has(coordKey) || reserved.has(coordKey)) {
      continue;
    }

    if (isCorner(coord, spec) && rng() < 0.75) {
      continue;
    }

    occupied.add(coordKey);
    obstacles.push({
      x,
      y,
      kind: obstacleKinds[(x * 7 + y * 11 + spec.levelNumber + obstacles.length) % obstacleKinds.length],
    });
  }

  return obstacles;
}

function simulateClear(level) {
  const sheep = level.sheep.map((candidate) => ({ ...candidate }));
  const order = [];
  let guard = sheep.length * sheep.length + 4;

  while (sheep.length > 0 && guard > 0) {
    const choices = sheep.filter((candidate) => escapePath(level, candidate, sheep, level.obstacles).blocker === "none");
    if (choices.length === 0) {
      return { completed: false, order };
    }

    const next = choices[0];
    order.push(next.id);
    sheep.splice(sheep.indexOf(next), 1);
    guard -= 1;
  }

  return { completed: sheep.length === 0, order };
}

function escapePath(level, selectedSheep, sheep, obstacles) {
  const delta = deltas[selectedSheep.facing];
  const path = [];
  const obstacleKeys = new Set(obstacles.map(key));
  const sheepKeys = new Set(
    sheep
      .filter((candidate) => candidate.id !== selectedSheep.id)
      .map(key),
  );

  let coord = {
    x: selectedSheep.x + delta.x,
    y: selectedSheep.y + delta.y,
  };
  let guard = level.width * level.height + 4;

  while (guard > 0 && inBounds(level, coord)) {
    path.push({ ...coord });
    if (sheepKeys.has(key(coord))) {
      return { blocker: "sheep", path };
    }

    if (obstacleKeys.has(key(coord))) {
      return { blocker: "obstacle", path };
    }

    coord = {
      x: coord.x + delta.x,
      y: coord.y + delta.y,
    };
    guard -= 1;
  }

  path.push({ ...coord });
  path.push({ x: (level.width - 1) / 2, y: -1.25 });
  return { blocker: "none", path };
}

function countNewBlocks(candidate, sheep, obstacles, spec) {
  const candidateKey = key(candidate);
  const obstacleKeys = new Set(obstacles.map(key));
  const sheepKeys = new Set(sheep.map(key));
  let blocks = 0;

  for (const existing of sheep) {
    const delta = deltas[existing.facing];
    let coord = { x: existing.x + delta.x, y: existing.y + delta.y };
    let guard = spec.width * spec.height + 4;
    while (guard > 0 && inBounds(spec, coord)) {
      const coordKey = key(coord);
      if (coordKey === candidateKey) {
        blocks += 1;
        break;
      }

      if (obstacleKeys.has(coordKey) || sheepKeys.has(coordKey)) {
        break;
      }

      coord = { x: coord.x + delta.x, y: coord.y + delta.y };
      guard -= 1;
    }
  }

  return blocks;
}

function distanceToExit(candidate, spec) {
  switch (candidate.facing) {
    case "north":
      return candidate.y + 1;
    case "east":
      return spec.width - candidate.x;
    case "south":
      return spec.height - candidate.y;
    case "west":
    default:
      return candidate.x + 1;
  }
}

function distanceFromCenter(candidate, spec) {
  return Math.hypot(candidate.x - (spec.width - 1) / 2, candidate.y - (spec.height - 1) / 2);
}

function objectiveKey(levelNumber) {
  if (levelNumber <= 8) {
    return "objective.beginner";
  }

  if (levelNumber <= 45) {
    return "objective.intermediate";
  }

  if (levelNumber <= 120) {
    return "objective.advanced";
  }

  return "objective.expert";
}

function weightedPick(items, rng) {
  const min = Math.min(...items.map((item) => item.score));
  const weights = items.map((item) => item.score - min + 1);
  const total = weights.reduce((sum, item) => sum + item, 0);
  let roll = rng() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return items[index];
    }
  }

  return items[items.length - 1];
}

function shuffle(items, rng) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function key(coord) {
  return `${coord.x},${coord.y}`;
}

function inBounds(level, coord) {
  return coord.x >= 0 && coord.y >= 0 && coord.x < level.width && coord.y < level.height;
}

function isCorner(coord, spec) {
  return (coord.x === 0 || coord.x === spec.width - 1) && (coord.y === 0 || coord.y === spec.height - 1);
}

function hashSeed(levelNumber, attempt) {
  let value = 0x9e3779b9 ^ (levelNumber * 0x85ebca6b) ^ (attempt * 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatSummary(summary) {
  return `${summary.id} size=${summary.size} sheep=${summary.sheep} obstacles=${summary.obstacles} difficulty=${summary.difficulty}`;
}
