import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const levelsDir = path.join(root, "src", "content", "levels");
const allowedDirections = new Set(["north", "east", "south", "west"]);
const allowedObstacles = new Set(["fence", "hay", "flower"]);

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

function validateLevel(file) {
  const fullPath = path.join(levelsDir, file);
  const level = JSON.parse(fs.readFileSync(fullPath, "utf8"));

  if (!level.id) fail(`${file}: missing id`);
  if (!level.titleKey || !level.objectiveKey) fail(`${file}: missing localization keys`);
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) fail(`${file}: width/height must be integers`);
  if (level.width < 3 || level.height < 3) fail(`${file}: board must be at least 3x3`);
  if (!inBounds(level, level.sheep)) fail(`${file}: sheep is out of bounds`);
  if (!inBounds(level, level.barn)) fail(`${file}: barn is out of bounds`);
  if (!allowedDirections.has(level.sheep?.facing)) fail(`${file}: invalid sheep facing`);
  if (!allowedDirections.has(level.barn?.entryDirection)) fail(`${file}: invalid barn entryDirection`);

  const occupied = new Set();
  occupied.add(key(level.sheep));
  if (occupied.has(key(level.barn))) fail(`${file}: sheep and barn overlap`);
  occupied.add(key(level.barn));

  for (const obstacle of level.obstacles || []) {
    if (!inBounds(level, obstacle)) fail(`${file}: obstacle ${JSON.stringify(obstacle)} is out of bounds`);
    if (!allowedObstacles.has(obstacle.kind)) fail(`${file}: invalid obstacle kind ${obstacle.kind}`);
    const obstacleKey = key(obstacle);
    if (occupied.has(obstacleKey)) fail(`${file}: obstacle overlaps another entity at ${obstacleKey}`);
    occupied.add(obstacleKey);
  }

  const sameRow = level.sheep.y === level.barn.y;
  const sameColumn = level.sheep.x === level.barn.x;
  if (!sameRow && !sameColumn) fail(`${file}: sheep and barn must share a row or column for MVP`);

  const dx = Math.sign(level.barn.x - level.sheep.x);
  const dy = Math.sign(level.barn.y - level.sheep.y);
  const obstacles = new Set((level.obstacles || []).map((obstacle) => key(obstacle)));
  let x = level.sheep.x + dx;
  let y = level.sheep.y + dy;
  while (x !== level.barn.x || y !== level.barn.y) {
    if (obstacles.has(`${x},${y}`)) fail(`${file}: obstacle blocks solution path at ${x},${y}`);
    x += dx;
    y += dy;
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
