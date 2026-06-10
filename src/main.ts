import "./styles.css";
import { GameAudio } from "./audio/audio";
import { getLevel, levels } from "./game/levelLoader";
import { directionBetween, evaluateTap } from "./game/rules";
import type { FeedbackState, GamePhase, GameViewState, GridCoord, LevelDefinition, MoveState } from "./game/types";
import { CanvasRenderer } from "./render/canvasRenderer";
import { Localization } from "./ui/localization";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="game-shell">
    <canvas class="game-canvas" aria-label="Sheep Run game board"></canvas>

    <section class="top-bar" hidden>
      <div class="objective">
        <strong data-role="level-title"></strong>
        <span data-role="objective"></span>
      </div>
      <div class="hud-actions">
        <button class="icon-button" type="button" data-action="restart" aria-label="Restart">↻</button>
        <button class="icon-button" type="button" data-action="language" aria-label="Language"></button>
        <button class="icon-button" type="button" data-action="sound" aria-label="Sound"></button>
      </div>
    </section>

    <section class="bottom-status" hidden>
      <div class="status-chip" data-role="status"></div>
    </section>

    <section class="overlay" data-role="menu">
      <div class="panel menu-panel">
        <h1 class="title" data-role="app-title"></h1>
        <p class="subtitle" data-role="app-subtitle"></p>
        <p class="level-label" data-role="level-label"></p>
        <div class="level-grid" data-role="level-grid"></div>
        <div class="menu-row">
          <button class="text-button primary" type="button" data-action="start"></button>
          <button class="text-button" type="button" data-action="language"></button>
          <button class="text-button" type="button" data-action="sound"></button>
        </div>
      </div>
    </section>

    <section class="overlay" data-role="result" hidden>
      <div class="panel">
        <h2 class="result-title" data-role="result-title"></h2>
        <p class="result-body" data-role="result-body"></p>
        <div class="result-actions">
          <button class="text-button primary" type="button" data-action="next"></button>
          <button class="text-button" type="button" data-action="retry"></button>
          <button class="text-button" type="button" data-action="menu"></button>
          <button class="text-button" type="button" data-action="language"></button>
          <button class="text-button" type="button" data-action="sound"></button>
        </div>
      </div>
    </section>
  </main>
`;

const canvas = document.querySelector<HTMLCanvasElement>(".game-canvas");
if (!canvas) {
  throw new Error("Missing game canvas");
}

const renderer = new CanvasRenderer(canvas);
const i18n = new Localization();
const audio = new GameAudio();

const els = {
  topBar: document.querySelector<HTMLElement>(".top-bar")!,
  bottomStatus: document.querySelector<HTMLElement>(".bottom-status")!,
  menu: document.querySelector<HTMLElement>('[data-role="menu"]')!,
  result: document.querySelector<HTMLElement>('[data-role="result"]')!,
  title: document.querySelector<HTMLElement>('[data-role="app-title"]')!,
  subtitle: document.querySelector<HTMLElement>('[data-role="app-subtitle"]')!,
  levelLabel: document.querySelector<HTMLElement>('[data-role="level-label"]')!,
  levelGrid: document.querySelector<HTMLElement>('[data-role="level-grid"]')!,
  levelTitle: document.querySelector<HTMLElement>('[data-role="level-title"]')!,
  objective: document.querySelector<HTMLElement>('[data-role="objective"]')!,
  status: document.querySelector<HTMLElement>('[data-role="status"]')!,
  resultTitle: document.querySelector<HTMLElement>('[data-role="result-title"]')!,
  resultBody: document.querySelector<HTMLElement>('[data-role="result-body"]')!,
};

let selectedLevelIndex = Number(localStorage.getItem("sheepRun.selectedLevel") ?? 0);
if (!Number.isFinite(selectedLevelIndex) || selectedLevelIndex < 0 || selectedLevelIndex >= levels.length) {
  selectedLevelIndex = 0;
}

let phase: GamePhase = "menu";
let level: LevelDefinition = getLevel(selectedLevelIndex);
let sheepCoord: GridCoord = { x: level.sheep.x, y: level.sheep.y };
let sheepFacing = level.sheep.facing;
let move: MoveState | null = null;
let feedback: FeedbackState | null = null;
let statusKey = "status.ready";
let resultWasWin = false;

refreshTexts();
showMenu();
requestAnimationFrame(tick);

canvas.addEventListener("pointerdown", async (event) => {
  await audio.unlock();
  if (phase !== "ready") {
    return;
  }

  const tap = renderer.pick(event.clientX, event.clientY);
  audio.click();
  const result = evaluateTap(level, tap);

  if (result.outcome === "win") {
    move = {
      startedAt: performance.now(),
      path: result.path,
      msPerTile: 245,
    };
    if (result.path.length > 0) {
      sheepFacing = directionBetween(sheepCoord, result.path[0]);
    }
    phase = "moving";
    statusKey = "status.moving";
    feedback = null;
    audio.sheep();
    renderUiState();
    return;
  }

  phase = "failed";
  resultWasWin = false;
  feedback = {
    kind: "fail",
    coord: tap.coord,
    startedAt: performance.now(),
    reasonKey: result.reasonKey,
  };
  audio.fail();
  showResult(false, result.reasonKey);
});

document.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  const action = target?.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (!action) {
    return;
  }

  await audio.unlock();
  audio.click();

  switch (action) {
    case "start":
      startLevel(selectedLevelIndex);
      break;
    case "restart":
    case "retry":
      startLevel(selectedLevelIndex);
      break;
    case "next":
      startLevel((selectedLevelIndex + 1) % levels.length);
      break;
    case "menu":
      showMenu();
      break;
    case "language":
      i18n.cycle();
      refreshTexts();
      renderUiState();
      break;
    case "sound":
      audio.toggleMuted();
      refreshTexts();
      break;
    default:
      break;
  }
});

function startLevel(index: number): void {
  selectedLevelIndex = index;
  localStorage.setItem("sheepRun.selectedLevel", String(selectedLevelIndex));
  level = getLevel(selectedLevelIndex);
  phase = "ready";
  sheepCoord = { x: level.sheep.x, y: level.sheep.y };
  sheepFacing = level.sheep.facing;
  move = null;
  feedback = null;
  statusKey = "status.ready";
  resultWasWin = false;
  els.menu.hidden = true;
  els.result.hidden = true;
  els.topBar.hidden = false;
  els.bottomStatus.hidden = false;
  refreshLevelButtons();
  renderUiState();
}

function showMenu(): void {
  phase = "menu";
  move = null;
  feedback = null;
  els.menu.hidden = false;
  els.result.hidden = true;
  els.topBar.hidden = true;
  els.bottomStatus.hidden = true;
  level = getLevel(selectedLevelIndex);
  sheepCoord = { x: level.sheep.x, y: level.sheep.y };
  sheepFacing = level.sheep.facing;
  refreshLevelButtons();
}

function showResult(win: boolean, bodyKey: string): void {
  resultWasWin = win;
  statusKey = win ? "status.won" : "status.failed";
  els.result.hidden = false;
  els.resultTitle.textContent = i18n.t(win ? "result.win.title" : "result.fail.title");
  els.resultTitle.style.color = win ? "#257d38" : "#b9362c";
  els.resultBody.textContent = i18n.t(bodyKey);
  const nextButton = document.querySelector<HTMLElement>('[data-action="next"]');
  if (nextButton) {
    nextButton.hidden = !win;
  }
  renderUiState();
}

function completeMove(now: number): void {
  if (!move || phase !== "moving") {
    return;
  }

  if (now - move.startedAt < move.path.length * move.msPerTile) {
    return;
  }

  const barn = level.barn;
  sheepCoord = { x: barn.x, y: barn.y };
  sheepFacing = barn.entryDirection;
  move = null;
  phase = "won";
  resultWasWin = true;
  audio.win();
  showResult(true, "result.win.body");
}

function tick(now: number): void {
  completeMove(now);

  const previewLevel = phase === "menu" ? getLevel(selectedLevelIndex) : level;
  renderer.render({
    phase,
    level: previewLevel,
    sheepCoord,
    sheepFacing,
    move,
    feedback,
    now,
  } satisfies GameViewState);

  requestAnimationFrame(tick);
}

function refreshTexts(): void {
  document.title = i18n.t("app.title");
  document.documentElement.lang = i18n.current;
  els.title.textContent = i18n.t("app.title");
  els.subtitle.textContent = i18n.t("app.subtitle");
  els.levelLabel.textContent = i18n.t("menu.levels");

  for (const button of document.querySelectorAll<HTMLElement>('[data-action="start"]')) {
    button.textContent = i18n.t("button.start");
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="retry"], [data-action="restart"]')) {
    if (button.dataset.action === "restart") {
      button.setAttribute("aria-label", i18n.t("button.retry"));
      button.textContent = "↻";
    } else {
      button.textContent = i18n.t("button.retry");
    }
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="next"]')) {
    button.textContent = i18n.t("button.next");
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="menu"]')) {
    button.textContent = i18n.t("button.menu");
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="language"]')) {
    button.textContent = shortLocaleLabel();
    button.setAttribute("aria-label", `${i18n.t("button.language")} ${i18n.current}`);
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="sound"]')) {
    button.textContent = audio.isMuted ? "SFX" : "♪";
    button.setAttribute("aria-label", i18n.t(audio.isMuted ? "button.sound" : "button.mute"));
  }

  refreshLevelButtons();
  renderUiState();
  if (!els.result.hidden) {
    els.resultTitle.textContent = i18n.t(resultWasWin ? "result.win.title" : "result.fail.title");
    els.resultBody.textContent = i18n.t(resultWasWin ? "result.win.body" : feedback?.reasonKey ?? "fail.missed");
  }
}

function renderUiState(): void {
  els.levelTitle.textContent = i18n.t(level.titleKey);
  els.objective.textContent = i18n.t(level.objectiveKey);
  els.status.textContent = i18n.t(statusKey);
}

function refreshLevelButtons(): void {
  els.levelGrid.innerHTML = "";
  levels.forEach((candidate, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(index + 1);
    button.title = i18n.t(candidate.titleKey);
    button.setAttribute("aria-pressed", String(index === selectedLevelIndex));
    button.addEventListener("click", async () => {
      await audio.unlock();
      audio.click();
      selectedLevelIndex = index;
      localStorage.setItem("sheepRun.selectedLevel", String(index));
      level = getLevel(index);
      sheepCoord = { x: level.sheep.x, y: level.sheep.y };
      sheepFacing = level.sheep.facing;
      refreshLevelButtons();
    });
    els.levelGrid.appendChild(button);
  });
}

function shortLocaleLabel(): string {
  switch (i18n.current) {
    case "zh-CN":
      return "中";
    case "ja":
      return "日";
    case "en":
    default:
      return "EN";
  }
}
