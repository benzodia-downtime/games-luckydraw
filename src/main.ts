import { AppView } from "./appView";
import { AudioManager } from "./audioManager";
import { CelebrationController } from "./celebrationController";
import { COPY } from "./copy";
import { createGameState, revealBoard, type GameState } from "./gameState";
import {
  DEFAULT_TOTAL_BOARDS,
  DEFAULT_WINNING_BOARDS,
  normalizeConfigValue,
  validateConfig,
} from "./setupConfig";
import "./style.css";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("#app element not found.");
}

const view = new AppView(root);
const audio = new AudioManager();
const celebration = new CelebrationController(view.getCelebrationElement());
let gameState: GameState | null = null;

view.bind({
  onStartGame: startGame,
  onGoHome: () => {
    celebration.clear();
    view.setView("setup");
  },
  onRestart: () => {
    if (!gameState) {
      return;
    }

    audio.playRestart();
    celebration.clear();
    startGame();
  },
  onSetupInputEdited: () => {
    view.clearSetupMessage();
  },
  onSetupInputCommitted: (field, rawValue) => {
    const fallback = field === "totalBoards" ? DEFAULT_TOTAL_BOARDS : DEFAULT_WINNING_BOARDS;
    return normalizeConfigValue(rawValue, fallback);
  },
  onVolumeChange: (volume) => {
    audio.setMasterVolume(volume);
    view.setVolume(audio.getMasterVolume());
  },
  onBoardSelect: (index) => {
    revealBoardAt(index);
  },
});

view.setView("setup");
view.clearSetupMessage();
view.setVolume(audio.getMasterVolume());

function startGame(): void {
  const { totalBoardsRaw, winningBoardsRaw } = view.getConfigValues();
  const validation = validateConfig(totalBoardsRaw, winningBoardsRaw);

  if (!validation.ok) {
    view.setSetupMessage(validation.issue === "invalid-count" ? COPY.invalidConfig : COPY.tooManyWinners);
    return;
  }

  celebration.clear();
  gameState = createGameState(validation.config);
  view.setConfigValues(validation.config);
  view.clearSetupMessage();
  view.setView("game");
  view.renderBoard(gameState);
}

function revealBoardAt(index: number): void {
  if (!gameState) {
    return;
  }

  const result = revealBoard(gameState, index);
  if (!result) {
    return;
  }

  if (result.outcome === "win") {
    audio.playWin();
    celebration.play(result.isFinalWin);
  } else {
    audio.playMiss();
  }

  view.renderBoard(gameState);
}
