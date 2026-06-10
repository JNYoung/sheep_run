import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const levelsDir = path.join(root, "src", "content", "levels");
const allowedDirections = new Set(["north", "east", "south", "west"]);
const allowedObstacles = new Set(["fence", "hay", "flower", "tree"]);
const deltas = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

let failed = false;

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
  if (!level.pen || typeof level.pen.x !== "number" || typeof level.pen.y !== "number") fail(`${file}: missing pen`);
  if (!allowedDirections.has(level.pen?.entryDirection)) fail(`${file}: invalid pen entryDirection`);
  if (!Array.isArray(level.sheep) || level.sheep.length < 3) fail(`${file}: expected at least 3 sheep`);

  const occupied = new Set();
  const ids = new Set();
  for (const sheep of level.sheep || []) {
    if (!sheep.id) fail(`${file}: sheep missing id`);
    if (ids.has(sheep.id)) fail(`${file}: duplicate sheep id ${sheep.id}`);
    ids.add(sheep.id);
    if (!inBounds(level, sheep)) fail(`${file}: sheep ${sheep.id} is out of bounds`);
    if (!allowedDirections.has(sheep.facing)) fail(`${file}: invalid sheep facing for ${sheep.id}`);
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

for (const file of files) {
  validateLevel(file);
}

if (failed) {
  process.exit(1);
}

console.log(`validated ${files.length} level(s)`);
