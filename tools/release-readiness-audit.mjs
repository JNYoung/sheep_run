import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

check("package version is 1.0.0", () => readJson("package.json").version === "1.0.0");
check("200 level JSON files exist", () => list("src/content/levels", ".json").length === 200);
check("Google Play icon 512 exists", () => imageSize("public/brand/icon-512.png") > 0);
check("Google Play feature graphic exists", () => imageSize("public/brand/feature-graphic-1024x500.png") > 0);
check("Splash image exists", () => imageSize("public/brand/splash-1080x1920.png") > 0);
check("Web manifest exists", () => fileExists("public/manifest.webmanifest"));
check("Privacy page exists", () => fileExists("public/privacy.html"));
check("Support page exists", () => fileExists("public/support.html"));
check("Data deletion page exists", () => fileExists("public/data-deletion.html"));
check("App home page exists", () => fileExists("public/app-home.html"));
check("Capacitor config exists", () => readFile("capacitor.config.ts").includes("com.jnyoung.sheeprun"));
check("Android project exists", () => fileExists("android/app/build.gradle"));
check("Android app versionName is 1.0.0", () => readFile("android/app/build.gradle").includes('versionName "1.0.0"'));
check("Android manifest does not request INTERNET", () => !readFile("android/app/src/main/AndroidManifest.xml").includes("android.permission.INTERNET"));
check("Store metadata exists", () => fileExists("docs/store-metadata.zh-CN.json"));
check("Google Play readiness doc exists", () => fileExists("docs/google-play-readiness.md"));

let failed = false;
for (const item of checks) {
  if (item.ok) {
    console.log(`ok ${item.name}`);
  } else {
    failed = true;
    console.error(`release audit failed: ${item.name}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`release audit passed (${checks.length} checks)`);

function check(name, fn) {
  try {
    checks.push({ name, ok: Boolean(fn()) });
  } catch {
    checks.push({ name, ok: false });
  }
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readFile(relativePath));
}

function list(relativePath, ext) {
  return fs.readdirSync(path.join(root, relativePath)).filter((file) => file.endsWith(ext));
}

function imageSize(relativePath) {
  return fs.statSync(path.join(root, relativePath)).size;
}
