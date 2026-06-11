import "./styles.css";
import { GameAudio } from "./audio/audio";
import { getLevel, levels } from "./game/levelLoader";
import { buildEscapePath, evaluateTap } from "./game/rules";
import type { FeedbackState, GamePhase, GameViewState, LevelDefinition, MoveState, SheepDefinition } from "./game/types";
import { CanvasRenderer } from "./render/canvasRenderer";
import { Localization, localeOptions, type Locale } from "./ui/localization";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}

app.innerHTML = `
  <main class="game-shell">
    <canvas class="game-canvas" aria-label="Sheep Run game board"></canvas>

    <section class="splash" data-role="splash">
      <div class="splash-mark"></div>
      <h1 data-role="splash-title"></h1>
    </section>

    <section class="top-bar" hidden>
      <div class="objective">
        <strong data-role="level-title"></strong>
        <span data-role="objective"></span>
      </div>
      <div class="hud-actions">
        <button class="icon-button" type="button" data-action="restart" aria-label="Restart">↻</button>
        <button class="icon-button" type="button" data-action="settings" aria-label="Settings"></button>
      </div>
    </section>

    <section class="bottom-status" hidden>
      <div class="status-chip" data-role="status"></div>
    </section>

    <section class="overlay home-overlay" data-role="menu">
      <div class="menu-scene" aria-hidden="true">
        <span class="scene-sun"></span>
        <span class="scene-cloud scene-cloud-a"></span>
        <span class="scene-cloud scene-cloud-b"></span>
        <span class="scene-hill scene-hill-a"></span>
        <span class="scene-hill scene-hill-b"></span>
        <span class="scene-barn"></span>
        <span class="scene-sheep scene-sheep-a"></span>
        <span class="scene-sheep scene-sheep-b"></span>
        <span class="scene-sheep scene-sheep-c"></span>
      </div>
      <div class="scene-controls">
        <button class="scene-control control-settings" type="button" data-action="settings" aria-label="Settings"></button>
      </div>
      <div class="panel menu-panel">
        <div class="home-brand">
          <div class="home-mark" aria-hidden="true"></div>
          <div>
            <h1 class="title" data-role="app-title"></h1>
            <p class="subtitle" data-role="app-subtitle"></p>
          </div>
        </div>
        <div class="home-progress">
          <span data-role="progress-label"></span>
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" data-role="progress-fill"></div>
          </div>
        </div>
        <div class="menu-row home-actions">
          <button class="text-button primary home-primary" type="button" data-action="start"></button>
        </div>
        <div class="level-header">
          <p class="level-label" data-role="level-label"></p>
          <div class="level-pager">
            <button class="icon-button small" type="button" data-action="page-prev" aria-label="Previous levels"></button>
            <span data-role="level-page"></span>
            <button class="icon-button small" type="button" data-action="page-next" aria-label="Next levels"></button>
          </div>
        </div>
        <div class="level-grid" data-role="level-grid"></div>
      </div>
      <button class="reward-ticket" type="button" data-action="reward-rescue">
        <span class="reward-icon" aria-hidden="true"></span>
        <span class="reward-copy">
          <strong data-role="reward-label"></strong>
          <small data-role="reward-hint"></small>
        </span>
      </button>
    </section>

    <section class="overlay" data-role="result" hidden>
      <div class="panel">
        <h2 class="result-title" data-role="result-title"></h2>
        <p class="result-body" data-role="result-body"></p>
        <div class="result-actions">
          <button class="text-button primary" type="button" data-action="next"></button>
          <button class="text-button" type="button" data-action="retry"></button>
          <button class="text-button reward-action" type="button" data-action="reward-rescue"></button>
          <button class="text-button" type="button" data-action="menu"></button>
        </div>
      </div>
    </section>

    <section class="overlay settings-overlay" data-role="settings" hidden>
      <div class="panel settings-panel">
        <div class="settings-header">
          <h2 data-role="settings-title"></h2>
          <button class="icon-button small" type="button" data-action="settings-close" aria-label="Close"></button>
        </div>

        <div class="settings-view" data-role="settings-home">
          <button class="settings-item" type="button" data-action="language-list">
            <span class="settings-item-copy">
              <strong data-role="settings-language-label"></strong>
              <small data-role="settings-language-current"></small>
            </span>
            <span class="settings-chevron" aria-hidden="true">›</span>
          </button>
          <button class="settings-item" type="button" data-action="sound">
            <span class="settings-item-copy">
              <strong data-role="settings-sound-label"></strong>
              <small data-role="settings-sound-current"></small>
            </span>
            <span class="settings-toggle" data-role="settings-sound-toggle" aria-hidden="true"></span>
          </button>
        </div>

        <div class="settings-view" data-role="language-view" hidden>
          <div class="settings-subheader">
            <button class="icon-button small" type="button" data-action="settings-home" aria-label="Back"></button>
            <strong data-role="settings-language-title"></strong>
          </div>
          <div class="language-options" data-role="language-options"></div>
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
  splash: document.querySelector<HTMLElement>('[data-role="splash"]')!,
  splashTitle: document.querySelector<HTMLElement>('[data-role="splash-title"]')!,
  topBar: document.querySelector<HTMLElement>(".top-bar")!,
  bottomStatus: document.querySelector<HTMLElement>(".bottom-status")!,
  menu: document.querySelector<HTMLElement>('[data-role="menu"]')!,
  result: document.querySelector<HTMLElement>('[data-role="result"]')!,
  title: document.querySelector<HTMLElement>('[data-role="app-title"]')!,
  subtitle: document.querySelector<HTMLElement>('[data-role="app-subtitle"]')!,
  progressLabel: document.querySelector<HTMLElement>('[data-role="progress-label"]')!,
  progressFill: document.querySelector<HTMLElement>('[data-role="progress-fill"]')!,
  levelLabel: document.querySelector<HTMLElement>('[data-role="level-label"]')!,
  levelPage: document.querySelector<HTMLElement>('[data-role="level-page"]')!,
  levelGrid: document.querySelector<HTMLElement>('[data-role="level-grid"]')!,
  rewardLabel: document.querySelector<HTMLElement>('[data-role="reward-label"]')!,
  rewardHint: document.querySelector<HTMLElement>('[data-role="reward-hint"]')!,
  levelTitle: document.querySelector<HTMLElement>('[data-role="level-title"]')!,
  objective: document.querySelector<HTMLElement>('[data-role="objective"]')!,
  status: document.querySelector<HTMLElement>('[data-role="status"]')!,
  resultTitle: document.querySelector<HTMLElement>('[data-role="result-title"]')!,
  resultBody: document.querySelector<HTMLElement>('[data-role="result-body"]')!,
  settings: document.querySelector<HTMLElement>('[data-role="settings"]')!,
  settingsTitle: document.querySelector<HTMLElement>('[data-role="settings-title"]')!,
  settingsHome: document.querySelector<HTMLElement>('[data-role="settings-home"]')!,
  languageView: document.querySelector<HTMLElement>('[data-role="language-view"]')!,
  settingsLanguageLabel: document.querySelector<HTMLElement>('[data-role="settings-language-label"]')!,
  settingsLanguageCurrent: document.querySelector<HTMLElement>('[data-role="settings-language-current"]')!,
  settingsLanguageTitle: document.querySelector<HTMLElement>('[data-role="settings-language-title"]')!,
  settingsSoundLabel: document.querySelector<HTMLElement>('[data-role="settings-sound-label"]')!,
  settingsSoundCurrent: document.querySelector<HTMLElement>('[data-role="settings-sound-current"]')!,
  settingsSoundToggle: document.querySelector<HTMLElement>('[data-role="settings-sound-toggle"]')!,
  languageOptions: document.querySelector<HTMLElement>('[data-role="language-options"]')!,
};

let selectedLevelIndex = Number(localStorage.getItem("sheepRun.selectedLevel") ?? 0);
if (!Number.isFinite(selectedLevelIndex) || selectedLevelIndex < 0 || selectedLevelIndex >= levels.length) {
  selectedLevelIndex = 0;
}

const pageSize = 40;
let levelPageIndex = Math.floor(selectedLevelIndex / pageSize);
let highestCompletedIndex = Number(localStorage.getItem("sheepRun.highestCompletedLevel") ?? -1);
if (!Number.isFinite(highestCompletedIndex) || highestCompletedIndex < -1 || highestCompletedIndex >= levels.length) {
  highestCompletedIndex = -1;
}
const debugLevelIndex = import.meta.env.DEV ? readDebugLevelIndex() : null;
if (debugLevelIndex !== null) {
  selectedLevelIndex = debugLevelIndex;
  highestCompletedIndex = Math.max(highestCompletedIndex, debugLevelIndex - 1);
}
let highestUnlockedIndex = Math.min(levels.length - 1, highestCompletedIndex + 1);
if (selectedLevelIndex > highestUnlockedIndex) {
  selectedLevelIndex = highestUnlockedIndex;
}
levelPageIndex = Math.floor(selectedLevelIndex / pageSize);

let phase: GamePhase = "menu";
let level: LevelDefinition = getLevel(selectedLevelIndex);
let activeSheep: SheepDefinition[] = cloneSheep(level);
let move: MoveState | null = null;
let feedback: FeedbackState | null = null;
let statusKey = "status.ready";
let resultWasWin = false;
let enteredCount = 0;
let hintSheepIds: string[] = [];

refreshTexts();
showMenu();
window.setTimeout(() => {
  els.splash.hidden = true;
}, 950);
requestAnimationFrame(tick);

canvas.addEventListener("pointerdown", async (event) => {
  void audio.unlock();
  if (phase !== "ready") {
    return;
  }

  const tap = renderer.pick(event.clientX, event.clientY);
  audio.click();
  const result = evaluateTap(level, activeSheep, tap);

  if (result.outcome === "win") {
    const selectedSheep = activeSheep.find((candidate) => candidate.id === result.sheepId);
    if (!selectedSheep) {
      return;
    }

    move = {
      sheepId: selectedSheep.id,
      from: { x: selectedSheep.x, y: selectedSheep.y },
      facing: selectedSheep.facing,
      startedAt: performance.now(),
      path: result.path,
      msPerTile: 220,
    };
    phase = "moving";
    statusKey = "status.moving";
    feedback = null;
    hintSheepIds = hintSheepIds.filter((id) => id !== selectedSheep.id);
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

  void audio.unlock();
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
    case "page-prev":
      levelPageIndex = Math.max(0, levelPageIndex - 1);
      refreshLevelButtons();
      break;
    case "page-next":
      levelPageIndex = Math.min(Math.ceil(levels.length / pageSize) - 1, levelPageIndex + 1);
      refreshLevelButtons();
      break;
    case "menu":
      showMenu();
      break;
    case "settings":
      openSettings();
      break;
    case "settings-close":
      closeSettings();
      break;
    case "settings-home":
      showSettingsHome();
      break;
    case "language-list":
      showLanguageList();
      break;
    case "select-language":
      selectLanguage(target?.closest<HTMLElement>("[data-locale]")?.dataset.locale);
      refreshTexts();
      renderUiState();
      break;
    case "sound":
      audio.toggleMuted();
      refreshTexts();
      break;
    case "reward-rescue":
      grantRewardRescue();
      break;
    default:
      break;
  }
});

function startLevel(index: number): void {
  if (index > highestUnlockedIndex) {
    return;
  }

  selectedLevelIndex = index;
  localStorage.setItem("sheepRun.selectedLevel", String(selectedLevelIndex));
  level = getLevel(selectedLevelIndex);
  phase = "ready";
  activeSheep = cloneSheep(level);
  move = null;
  feedback = null;
  hintSheepIds = [];
  statusKey = "status.ready";
  resultWasWin = false;
  enteredCount = 0;
  els.menu.hidden = true;
  els.result.hidden = true;
  els.settings.hidden = true;
  els.topBar.hidden = false;
  els.bottomStatus.hidden = false;
  refreshLevelButtons();
  renderUiState();
}

function showMenu(): void {
  phase = "menu";
  move = null;
  feedback = null;
  hintSheepIds = [];
  els.menu.hidden = false;
  els.result.hidden = true;
  els.settings.hidden = true;
  els.topBar.hidden = true;
  els.bottomStatus.hidden = true;
  level = getLevel(selectedLevelIndex);
  activeSheep = cloneSheep(level);
  enteredCount = 0;
  refreshLevelButtons();
  renderProgress();
}

function showResult(win: boolean, bodyKey: string): void {
  resultWasWin = win;
  statusKey = win ? "status.won" : "status.failed";
  els.result.dataset.result = win ? "win" : "fail";
  els.result.hidden = false;
  els.settings.hidden = true;
  els.topBar.hidden = true;
  els.bottomStatus.hidden = true;
  els.resultTitle.textContent = i18n.t(win ? "result.win.title" : "result.fail.title");
  els.resultTitle.style.color = win ? "#257d38" : "#b9362c";
  els.resultBody.textContent = i18n.t(bodyKey);
  const nextButton = document.querySelector<HTMLElement>('[data-action="next"]');
  if (nextButton) {
    nextButton.hidden = !win;
  }
  const rewardButton = els.result.querySelector<HTMLElement>('[data-action="reward-rescue"]');
  if (rewardButton) {
    rewardButton.hidden = win;
    rewardButton.textContent = i18n.t("button.watchAd");
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

  const finishedMove = move;
  activeSheep = activeSheep.filter((sheep) => sheep.id !== finishedMove.sheepId);
  enteredCount += 1;
  move = null;
  if (activeSheep.length === 0) {
    phase = "won";
    resultWasWin = true;
    markLevelComplete(selectedLevelIndex);
    audio.win();
    showResult(true, "result.win.body");
    return;
  }

  phase = "ready";
  statusKey = "status.sheepEntered";
  renderUiState();
}

function tick(now: number): void {
  completeMove(now);

  const previewLevel = phase === "menu" ? getLevel(selectedLevelIndex) : level;
  renderer.render({
    phase,
    level: previewLevel,
    sheep: phase === "menu" ? cloneSheep(previewLevel) : activeSheep,
    move,
    feedback,
    hintSheepIds: phase === "ready" ? hintSheepIds : [],
    now,
  } satisfies GameViewState);

  requestAnimationFrame(tick);
}

function refreshTexts(): void {
  document.title = i18n.t("app.title");
  document.documentElement.lang = i18n.current;
  document.documentElement.dir = i18n.isRtl ? "rtl" : "ltr";
  els.splashTitle.textContent = i18n.t("app.title");
  els.title.textContent = i18n.t("app.title");
  els.subtitle.textContent = i18n.t("app.subtitle");
  els.levelLabel.textContent = i18n.t("menu.levels");
  els.rewardLabel.textContent = i18n.t("menu.rewardRescue");
  els.rewardHint.textContent = i18n.t("menu.rewardHint");
  els.settingsTitle.textContent = i18n.t("settings.title");
  els.settingsLanguageLabel.textContent = i18n.t("settings.language");
  els.settingsLanguageTitle.textContent = i18n.t("settings.languageTitle");
  els.settingsSoundLabel.textContent = i18n.t("settings.sound");

  for (const button of document.querySelectorAll<HTMLElement>('[data-action="start"]')) {
    button.textContent = i18n.t("menu.continue").replace("{level}", String(selectedLevelIndex + 1));
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
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="reward-rescue"].reward-action')) {
    button.textContent = i18n.t("button.watchAd");
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="menu"]')) {
    button.textContent = i18n.t("button.menu");
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="settings"]')) {
    button.setAttribute("aria-label", i18n.t("button.settings"));
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="settings-close"]')) {
    button.setAttribute("aria-label", i18n.t("button.close"));
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="settings-home"]')) {
    button.setAttribute("aria-label", i18n.t("button.back"));
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="language-list"]')) {
    button.setAttribute("aria-label", i18n.t("settings.languageTitle"));
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="sound"]')) {
    button.setAttribute("aria-label", i18n.t(audio.isMuted ? "button.sound" : "button.mute"));
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="page-prev"]')) {
    button.setAttribute("aria-label", i18n.t("button.pagePrev"));
  }
  for (const button of document.querySelectorAll<HTMLElement>('[data-action="page-next"]')) {
    button.setAttribute("aria-label", i18n.t("button.pageNext"));
  }

  refreshLevelButtons();
  refreshSettingsState();
  renderProgress();
  renderUiState();
  if (!els.result.hidden) {
    els.resultTitle.textContent = i18n.t(resultWasWin ? "result.win.title" : "result.fail.title");
    els.resultBody.textContent = i18n.t(resultWasWin ? "result.win.body" : feedback?.reasonKey ?? "fail.missed");
  }
}

function openSettings(): void {
  els.settings.hidden = false;
  showSettingsHome();
}

function closeSettings(): void {
  els.settings.hidden = true;
  showSettingsHome();
}

function showSettingsHome(): void {
  els.settingsHome.hidden = false;
  els.languageView.hidden = true;
  refreshSettingsState();
}

function showLanguageList(): void {
  els.settingsHome.hidden = true;
  els.languageView.hidden = false;
  refreshLanguageOptions();
}

function selectLanguage(locale: string | undefined): void {
  if (!isLocale(locale)) {
    return;
  }

  i18n.set(locale);
  showSettingsHome();
}

function refreshSettingsState(): void {
  const languageName = languageNameFor(i18n.current);
  els.settingsLanguageCurrent.textContent = i18n.t("settings.languageCurrent").replace("{language}", languageName);
  els.settingsSoundCurrent.textContent = i18n.t(audio.isMuted ? "settings.soundOff" : "settings.soundOn");
  els.settingsSoundToggle.dataset.state = audio.isMuted ? "off" : "on";
  refreshLanguageOptions();
}

function refreshLanguageOptions(): void {
  els.languageOptions.innerHTML = "";
  for (const option of localeOptions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "language-option";
    button.dataset.action = "select-language";
    button.dataset.locale = option.locale;
    button.setAttribute("aria-pressed", String(option.locale === i18n.current));

    const name = document.createElement("span");
    name.textContent = option.nativeName;
    const code = document.createElement("small");
    code.textContent = option.locale;
    const check = document.createElement("span");
    check.className = "language-check";
    check.textContent = option.locale === i18n.current ? "✓" : "";

    button.append(name, code, check);
    els.languageOptions.appendChild(button);
  }
}

function renderUiState(): void {
  els.levelTitle.textContent = i18n.t(level.titleKey);
  els.objective.textContent = i18n.t(level.objectiveKey);
  const total = level.sheep.length;
  els.status.textContent = i18n.t(statusKey)
    .replace("{done}", String(enteredCount))
    .replace("{total}", String(total))
    .replace("{left}", String(activeSheep.length))
    .replace("{count}", String(hintSheepIds.length));
}

function refreshLevelButtons(): void {
  els.levelGrid.innerHTML = "";
  const pageCount = Math.ceil(levels.length / pageSize);
  levelPageIndex = Math.max(0, Math.min(pageCount - 1, levelPageIndex));
  const start = levelPageIndex * pageSize;
  const end = Math.min(levels.length, start + pageSize);
  els.levelPage.textContent = `${start + 1}-${end}`;

  const prevButton = document.querySelector<HTMLButtonElement>('[data-action="page-prev"]');
  const nextButton = document.querySelector<HTMLButtonElement>('[data-action="page-next"]');
  if (prevButton) {
    prevButton.disabled = levelPageIndex === 0;
  }
  if (nextButton) {
    nextButton.disabled = levelPageIndex >= pageCount - 1;
  }

  levels.slice(start, end).forEach((candidate, offset) => {
    const index = start + offset;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(index + 1);
    button.title = i18n.t(candidate.titleKey);
    button.setAttribute("aria-pressed", String(index === selectedLevelIndex));
    button.dataset.difficulty = String(candidate.difficulty ?? 1);
    if (index <= highestCompletedIndex) {
      button.dataset.state = "complete";
    } else if (index > highestUnlockedIndex) {
      button.dataset.state = "locked";
      button.disabled = true;
    }
    button.addEventListener("click", async () => {
      void audio.unlock();
      audio.click();
      if (index > highestUnlockedIndex) {
        return;
      }
      selectedLevelIndex = index;
      levelPageIndex = Math.floor(index / pageSize);
      localStorage.setItem("sheepRun.selectedLevel", String(index));
      level = getLevel(index);
      activeSheep = cloneSheep(level);
      enteredCount = 0;
      refreshLevelButtons();
      renderProgress();
      refreshTexts();
    });
    els.levelGrid.appendChild(button);
  });
}

function renderProgress(): void {
  const done = Math.max(0, highestCompletedIndex + 1);
  els.progressLabel.textContent = i18n.t("menu.best")
    .replace("{done}", String(done))
    .replace("{total}", String(levels.length));
  els.progressFill.style.width = `${Math.round((done / levels.length) * 100)}%`;
}

function grantRewardRescue(): void {
  startLevel(selectedLevelIndex);
  const candidates = findClearSheepIds();
  const candidateCount = Math.max(1, Math.min(6, Math.ceil(level.sheep.length / 42)));
  hintSheepIds = candidates.slice(0, candidateCount);
  statusKey = hintSheepIds.length > 0 ? "status.rescueReady" : "status.rescueNone";
  renderUiState();
}

function findClearSheepIds(): string[] {
  return activeSheep
    .filter((sheep) => buildEscapePath(level, sheep, activeSheep).blocker === "none")
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((sheep) => sheep.id);
}

function markLevelComplete(index: number): void {
  if (index <= highestCompletedIndex) {
    return;
  }

  highestCompletedIndex = index;
  highestUnlockedIndex = Math.min(levels.length - 1, highestCompletedIndex + 1);
  localStorage.setItem("sheepRun.highestCompletedLevel", String(highestCompletedIndex));
  renderProgress();
}

function cloneSheep(sourceLevel: LevelDefinition): SheepDefinition[] {
  return sourceLevel.sheep.map((sheep) => ({ ...sheep }));
}

function languageNameFor(locale: Locale): string {
  return localeOptions.find((option) => option.locale === locale)?.nativeName ?? locale;
}

function isLocale(locale: string | undefined): locale is Locale {
  return localeOptions.some((option) => option.locale === locale);
}

function readDebugLevelIndex(): number | null {
  const raw = new URLSearchParams(window.location.search).get("debugLevel");
  if (!raw) {
    return null;
  }

  const levelNumber = Number(raw);
  if (!Number.isInteger(levelNumber)) {
    return null;
  }

  return Math.max(0, Math.min(levels.length - 1, levelNumber - 1));
}
