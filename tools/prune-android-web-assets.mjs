import { rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const publicAssets = join(root, "android", "app", "src", "main", "assets", "public");

const removable = [
  "brand/icon-1024.png",
  "brand/icon-512.png",
  "brand/maskable-icon-512.png",
  "brand/splash-1080x1920.png",
  "brand/feature-graphic-1024x500.png",
  "app-home.html",
  "privacy.html",
  "support.html",
  "data-deletion.html",
];

let removed = 0;
for (const relative of removable) {
  await rm(join(publicAssets, relative), { force: true });
  removed += 1;
}

console.log(`pruned ${removed} Android web asset(s)`);
