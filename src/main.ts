import { AudioManager } from "./audioManager";
import "./style.css";

type DrawOutcome = "win" | "miss";
type ViewName = "setup" | "game";

type Config = {
  totalBoards: number;
  winningBoards: number;
};

type GameState = Config & {
  deck: DrawOutcome[];
  revealed: boolean[];
  revealedCount: number;
  revealedWins: number;
  lastRevealedIndex: number | null;
};

const MIN_DRAW_COUNT = 1;
const MAX_DRAW_COUNT = 128;
const DEFAULT_TOTAL_BOARDS = 28;
const DEFAULT_WINNING_BOARDS = 1;

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("#app element not found.");
}

root.innerHTML = `
  <div class="scene">
    <div class="ambient ambient-left"></div>
    <div class="ambient ambient-right"></div>

    <section id="setupView" class="view view--setup" aria-hidden="false">
      <div class="setup-shell">
        <h1 class="setup-title">❤️새롬❤️ 치킨 뽑기</h1>
        <div class="setup-row">
          <label class="inline-field" for="totalBoardsInput">
            <span class="inline-label">뽑기판:</span>
            <input
              id="totalBoardsInput"
              class="inline-input"
              type="number"
              inputmode="numeric"
              min="1"
              max="128"
              step="1"
              value="28"
            />
          </label>
          <label class="inline-field" for="winningBoardsInput">
            <span class="inline-label">당첨:</span>
            <input
              id="winningBoardsInput"
              class="inline-input"
              type="number"
              inputmode="numeric"
              min="1"
              max="128"
              step="1"
              value="1"
            />
          </label>
        </div>
        <p id="setupMessage" class="setup-message"></p>
        <div class="setup-actions">
          <button id="startGameButton" class="btn btn-primary" type="button">게임 시작</button>
        </div>
      </div>
    </section>

    <section id="gameView" class="view view--game is-hidden" aria-hidden="true">
      <main class="game-shell">
        <div id="winCelebration" class="win-celebration" aria-hidden="true">
          <div class="win-celebration__flash"></div>
          <div class="win-celebration__ring"></div>
          <div class="win-celebration__rays"></div>
          <div class="win-celebration__fireworks">
            <span class="firework firework-a"></span>
            <span class="firework firework-b"></span>
            <span class="firework firework-c"></span>
            <span class="firework firework-d"></span>
          </div>
          <div class="win-celebration__confetti">
            <span class="confetti confetti-a"></span>
            <span class="confetti confetti-b"></span>
            <span class="confetti confetti-c"></span>
            <span class="confetti confetti-d"></span>
            <span class="confetti confetti-e"></span>
            <span class="confetti confetti-f"></span>
          </div>
          <p class="win-celebration__text">당첨!</p>
        </div>

        <section class="floor-panel">
          <div id="boardGrid" class="board-grid"></div>
        </section>

        <header class="game-toolbar">
          <div class="game-actions">
            <button id="gameHomeButton" class="btn btn-secondary" type="button">처음으로</button>
            <button id="restartButton" class="btn btn-secondary" type="button">재시작</button>
          </div>
          <label class="volume-control" for="masterVolumeInput">
            <span class="volume-label">볼륨</span>
            <input
              id="masterVolumeInput"
              class="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value="0.60"
            />
            <span id="masterVolumeValue" class="volume-value">60%</span>
          </label>
        </header>
      </main>
    </section>
  </div>
`;

const setupView = requireElement<HTMLElement>("#setupView");
const gameView = requireElement<HTMLElement>("#gameView");
const startGameButton = requireElement<HTMLButtonElement>("#startGameButton");
const gameHomeButton = requireElement<HTMLButtonElement>("#gameHomeButton");
const restartButton = requireElement<HTMLButtonElement>("#restartButton");
const totalBoardsInput = requireElement<HTMLInputElement>("#totalBoardsInput");
const winningBoardsInput = requireElement<HTMLInputElement>("#winningBoardsInput");
const setupMessage = requireElement<HTMLParagraphElement>("#setupMessage");
const boardGrid = requireElement<HTMLDivElement>("#boardGrid");
const masterVolumeInput = requireElement<HTMLInputElement>("#masterVolumeInput");
const masterVolumeValue = requireElement<HTMLSpanElement>("#masterVolumeValue");
const winCelebration = requireElement<HTMLElement>("#winCelebration");

let currentView: ViewName = "setup";
let gameState: GameState | null = null;
const audio = new AudioManager();
let winCelebrationTimer: number | null = null;

startGameButton.addEventListener("click", () => {
  startGame();
});

gameHomeButton.addEventListener("click", () => {
  clearWinCelebration();
  setView("setup");
});

restartButton.addEventListener("click", () => {
  if (!gameState) {
    return;
  }

  audio.playRestart();
  clearWinCelebration();
  startGame();
});

for (const input of [totalBoardsInput, winningBoardsInput]) {
  input.addEventListener("input", () => {
    clearSetupMessage();
  });

  input.addEventListener("change", () => {
    normalizeInputValue(input);
    clearSetupMessage();
  });
}

masterVolumeInput.addEventListener("input", () => {
  const raw = Number.parseFloat(masterVolumeInput.value);
  audio.setMasterVolume(raw);
  syncMasterVolumeUi();
});

boardGrid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const tile = target.closest<HTMLButtonElement>(".board-tile");
  if (!tile) {
    return;
  }

  revealBoard(Number(tile.dataset.index));
});

setView("setup");
clearSetupMessage();
syncMasterVolumeUi();

function startGame(): void {
  const config = readConfig();
  if (!config) {
    return;
  }

  clearWinCelebration();

  gameState = {
    ...config,
    deck: buildDeck(config.totalBoards, config.winningBoards),
    revealed: Array.from({ length: config.totalBoards }, () => false),
    revealedCount: 0,
    revealedWins: 0,
    lastRevealedIndex: null,
  };

  setView("game");
  renderGame();
}

function revealBoard(index: number): void {
  if (!gameState) {
    return;
  }

  if (gameState.revealed[index]) {
    return;
  }

  const outcome = gameState.deck[index];
  gameState.revealed[index] = true;
  gameState.revealedCount += 1;
  gameState.lastRevealedIndex = index;
  if (outcome === "win") {
    gameState.revealedWins += 1;
    audio.playWin();
    triggerWinCelebration(gameState.revealedWins === gameState.winningBoards);
  } else {
    audio.playMiss();
  }
  renderGame();
}

function renderGame(): void {
  if (!gameState) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const latestRevealedIndex = gameState.lastRevealedIndex;

  for (let index = 0; index < gameState.totalBoards; index += 1) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "board-tile";
    tile.dataset.index = String(index);

    const isRevealed = gameState.revealed[index];

    if (isRevealed) {
      const outcome = gameState.deck[index];
      tile.classList.add("is-revealed", outcome === "win" ? "is-win" : "is-miss");
      if (index === latestRevealedIndex) {
        tile.classList.add("is-latest");
      }
      tile.innerHTML = `
        <strong class="board-reveal">${outcome === "win" ? "당첨" : "꽝"}</strong>
      `;
      tile.disabled = true;
    } else {
      tile.classList.add("is-hidden-tile");
      tile.innerHTML = `
        <strong class="board-number">${index + 1}</strong>
      `;
      tile.disabled = false;
    }

    fragment.append(tile);
  }

  boardGrid.replaceChildren(fragment);
}

function readConfig(): Config | null {
  const totalBoards = parseInteger(totalBoardsInput.value);
  const winningBoards = parseInteger(winningBoardsInput.value);

  if (totalBoards === null || winningBoards === null) {
    setupMessage.textContent = "뽑기판과 당첨은 1에서 128 사이의 정수여야 합니다.";
    return null;
  }

  if (winningBoards > totalBoards) {
    setupMessage.textContent = "당첨 개수는 뽑기판 개수보다 클 수 없습니다.";
    return null;
  }

  totalBoardsInput.value = String(totalBoards);
  winningBoardsInput.value = String(winningBoards);
  clearSetupMessage();

  return { totalBoards, winningBoards };
}

function parseInteger(rawValue: string): number | null {
  if (!/^\d+$/.test(rawValue.trim())) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (parsed < MIN_DRAW_COUNT || parsed > MAX_DRAW_COUNT) {
    return null;
  }

  return parsed;
}

function normalizeInputValue(input: HTMLInputElement): void {
  const fallback = input === totalBoardsInput ? DEFAULT_TOTAL_BOARDS : DEFAULT_WINNING_BOARDS;
  const parsed = Number.parseInt(input.value, 10);

  if (Number.isNaN(parsed)) {
    input.value = String(fallback);
    return;
  }

  input.value = String(Math.min(MAX_DRAW_COUNT, Math.max(MIN_DRAW_COUNT, parsed)));
}

function clearSetupMessage(): void {
  setupMessage.textContent = "";
}

function syncMasterVolumeUi(): void {
  const volume = audio.getMasterVolume();
  masterVolumeInput.value = volume.toFixed(2);
  masterVolumeValue.textContent = `${Math.round(volume * 100)}%`;
}

function triggerWinCelebration(isFinalWin = false): void {
  clearWinCelebration();
  winCelebration.classList.remove("is-active", "is-finale");
  winCelebration.setAttribute("aria-hidden", "false");
  void winCelebration.offsetWidth;
  if (isFinalWin) {
    winCelebration.classList.add("is-finale");
  }
  winCelebration.classList.add("is-active");
  winCelebrationTimer = window.setTimeout(() => {
    if (isFinalWin) {
      winCelebration.classList.remove("is-active");
      winCelebrationTimer = null;
      return;
    }

    clearWinCelebration();
  }, 720);
}

function clearWinCelebration(): void {
  if (winCelebrationTimer !== null) {
    window.clearTimeout(winCelebrationTimer);
    winCelebrationTimer = null;
  }

  winCelebration.classList.remove("is-active", "is-finale");
  winCelebration.setAttribute("aria-hidden", "true");
}

function buildDeck(totalBoards: number, winningBoards: number): DrawOutcome[] {
  const deck: DrawOutcome[] = Array.from({ length: totalBoards }, () => "miss");

  for (let index = 0; index < winningBoards; index += 1) {
    deck[index] = "win";
  }

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function setView(view: ViewName): void {
  currentView = view;

  toggleView(setupView, currentView === "setup");
  toggleView(gameView, currentView === "game");
}

function toggleView(element: HTMLElement, isVisible: boolean): void {
  element.classList.toggle("is-hidden", !isVisible);
  element.setAttribute("aria-hidden", String(!isVisible));
}

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }

  return element;
}
