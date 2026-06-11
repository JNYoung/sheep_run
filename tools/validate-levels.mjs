import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const levelsDir = path.join(root, "src", "content", "levels");
const expectedLevelCount = 200;
const allowedDirections = new Set(["north", "east", "south", "west"]);
const allowedObstacles = new Set(["fence", "hay", "flower", "tree"]);
const allowedColors = new Set(["cream", "pink", "mint", "blue", "yellow", undefined]);
const deltas = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

let failed = false;
let previousDifficulty = 0;
let highestSheepCount = 0;
let highestObstacleCount = 0;
let highestBoardSize = 0;

function fail(message) {
  failed = true;
  console.error(`level validation failed: ${message}`);
}

function key(coord) {
  return `${coord.x},${coord.y}`;
}

function inBounds(level, coord) {
  return Number.isInteger(coord?.x) &&
    Number.isInteger(coord?.y) &&
    coord.x >= 0 &&
    coord.y >= 0 &&
    coord.x < level.width &&
    coord.y < level.height;
}

function hasClearPath(level, selectedSheep, sheep) {
  const delta = deltas[selectedSheep.facing];
  const sheepKeys = new Set(sheep.filter((candidate) => candidate.id !== selectedSheep.id).map(key));
  const obstacleKeys = new Set((level.obstacles || []).map(key));
  let coord = {
    x: selectedSheep.x + delta.x,
    y: selectedSheep.y + delta.y,
  };
  let guard = level.width * level.height + 4;

  while (guard > 0 && inBounds(level, coord)) {
    if (sheepKeys.has(key(coord)) || obstacleKeys.has(key(coord))) {
      return false;
    }

    coord = {
      x: coord.x + delta.x,
      y: coord.y + delta.y,
    };
    guard -= 1;
  }

  return true;
}

function simulateClear(level) {
  const sheep = level.sheep.map((candidate) => ({ ...candidate }));
  const order = [];
  let guard = sheep.length * sheep.length + 4;

  while (sheep.length > 0 && guard > 0) {
    const next = sheep.find((candidate) => hasClearPath(level, candidate, sheep));
    if (!next) {
      return { completed: false, order };
    }

    order.push(next.id);
    sheep.splice(sheep.indexOf(next), 1);
    guard -= 1;
  }

  return { completed: sheep.length === 0, order };
}

function validateLevel(file) {
  const fullPath = path.join(levelsDir, file);
  const level = JSON.parse(fs.readFileSync(fullPath, "utf8"));

  if (!level.id) fail(`${file}: missing id`);
  if (!level.titleKey || !level.objectiveKey) fail(`${file}: missing localization keys`);
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) fail(`${file}: width/height must be integers`);
  if (level.width < 4 || level.height < 4) fail(`${file}: board must be at least 4x4`);
  if (level.width > 16 || level.height > 16) fail(`${file}: board must stay within mobile 16x16 budget`);
  if (!level.pen || typeof level.pen.x !== "number" || typeof level.pen.y !== "number") fail(`${file}: missing pen`);
  if (!allowedDirections.has(level.pen?.entryDirection)) fail(`${file}: invalid pen entryDirection`);
  if (!Array.isArray(level.sheep) || level.sheep.length < 3) fail(`${file}: expected at least 3 sheep`);
  if (!Number.isInteger(level.difficulty) || level.difficulty < 1 || level.difficulty > 100) {
    fail(`${file}: difficulty must be an integer from 1 to 100`);
  }
  if (level.difficulty < previousDifficulty) {
    fail(`${file}: difficulty regressed from ${previousDifficulty} to ${level.difficulty}`);
  }
  previousDifficulty = level.difficulty;
  highestSheepCount = Math.max(highestSheepCount, level.sheep?.length || 0);
  highestObstacleCount = Math.max(highestObstacleCount, level.obstacles?.length || 0);
  highestBoardSize = Math.max(highestBoardSize, level.width, level.height);

  const levelNumber = Number(level.id?.replace("level_", ""));
  if (levelNumber > 20 && levelNumber % 10 === 1) {
    const previousFile = `level_${String(levelNumber - 1).padStart(3, "0")}.json`;
    const previousLevel = JSON.parse(fs.readFileSync(path.join(levelsDir, previousFile), "utf8"));
    if (level.sheep.length - previousLevel.sheep.length < 4) {
      fail(`${file}: every 10-level stage should jump by at least 4 sheep`);
    }
  }

  const occupied = new Set();
  const ids = new Set();
  for (const sheep of level.sheep || []) {
    if (!sheep.id) fail(`${file}: sheep missing id`);
    if (ids.has(sheep.id)) fail(`${file}: duplicate sheep id ${sheep.id}`);
    ids.add(sheep.id);
    if (!inBounds(level, sheep)) fail(`${file}: sheep ${sheep.id} is out of bounds`);
    if (!allowedDirections.has(sheep.facing)) fail(`${file}: invalid sheep facing for ${sheep.id}`);
    if (!allowedColors.has(sheep.color)) fail(`${file}: invalid sheep color for ${sheep.id}`);
    const sheepKey = key(sheep);
    if (occupied.has(sheepKey)) fail(`${file}: sheep overlap at ${sheepKey}`);
    occupied.add(sheepKey);
  }

  for (const obstacle of level.obstacles || []) {
    if (!inBounds(level, obstacle)) fail(`${file}: obstacle ${JSON.stringify(obstacle)} is out of bounds`);
    if (!allowedObstacles.has(obstacle.kind)) fail(`${file}: invalid obstacle kind ${obstacle.kind}`);
    const obstacleKey = key(obstacle);
    if (occupied.has(obstacleKey)) fail(`${file}: obstacle overlaps an entity at ${obstacleKey}`);
    occupied.add(obstacleKey);
  }

  const result = simulateClear(level);
  if (!result.completed) {
    fail(`${file}: no full clear order found; cleared ${result.order.join(", ") || "none"}`);
  }
}

const files = fs.readdirSync(levelsDir).filter((file) => file.endsWith(".json")).sort();
if (files.length === 0) {
  fail("no level files found");
}
if (files.length !== expectedLevelCount) {
  fail(`expected ${expectedLevelCount} levels, found ${files.length}`);
}

for (const file of files) {
  validateLevel(file);
}

if (highestSheepCount < 130) {
  fail(`difficulty ceiling is too low; max sheep count is ${highestSheepCount}`);
}
if (highestObstacleCount < 22) {
  fail(`difficulty ceiling is too low; max obstacle count is ${highestObstacleCount}`);
}
if (highestBoardSize < 14) {
  fail(`board ceiling is too low; max board dimension is ${highestBoardSize}`);
}

if (failed) {
  process.exit(1);
}

console.log(`validated ${files.length} level(s); max board=${highestBoardSize}x${highestBoardSize}; max sheep=${highestSheepCount}; max obstacles=${highestObstacleCount}`);
