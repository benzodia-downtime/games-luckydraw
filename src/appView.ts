import { COPY } from "./copy";
import { type Config, type GameState } from "./gameState";
import { DEFAULT_TOTAL_BOARDS, DEFAULT_WINNING_BOARDS } from "./setupConfig";

type ViewName = "setup" | "game";
type SetupFieldName = "totalBoards" | "winningBoards";

type AppElements = {
  setupView: HTMLElement;
  gameView: HTMLElement;
  startGameButton: HTMLButtonElement;
  gameHomeButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  totalBoardsInput: HTMLInputElement;
  winningBoardsInput: HTMLInputElement;
  setupMessage: HTMLParagraphElement;
  boardGrid: HTMLDivElement;
  masterVolumeInput: HTMLInputElement;
  masterVolumeValue: HTMLSpanElement;
  winCelebration: HTMLElement;
};

export type AppViewHandlers = {
  onStartGame: () => void;
  onGoHome: () => void;
  onRestart: () => void;
  onSetupInputEdited: () => void;
  onSetupInputCommitted: (field: SetupFieldName, rawValue: string) => string;
  onVolumeChange: (volume: number) => void;
  onBoardSelect: (index: number) => void;
};

export class AppView {
  private readonly root: HTMLDivElement;
  private readonly elements: AppElements;

  public constructor(root: HTMLDivElement) {
    this.root = root;
    this.root.innerHTML = this.buildMarkup();
    this.elements = this.collectElements();
  }

  public bind(handlers: AppViewHandlers): void {
    this.elements.startGameButton.addEventListener("click", handlers.onStartGame);
    this.elements.gameHomeButton.addEventListener("click", handlers.onGoHome);
    this.elements.restartButton.addEventListener("click", handlers.onRestart);

    this.bindSetupField("totalBoards", this.elements.totalBoardsInput, handlers);
    this.bindSetupField("winningBoards", this.elements.winningBoardsInput, handlers);

    this.elements.masterVolumeInput.addEventListener("input", () => {
      handlers.onVolumeChange(Number.parseFloat(this.elements.masterVolumeInput.value));
    });

    this.elements.boardGrid.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const tile = event.target.closest<HTMLButtonElement>(".board-tile");
      if (!tile) {
        return;
      }

      const index = Number.parseInt(tile.dataset.index ?? "", 10);
      if (Number.isNaN(index)) {
        return;
      }

      handlers.onBoardSelect(index);
    });
  }

  public getConfigValues(): { totalBoardsRaw: string; winningBoardsRaw: string } {
    return {
      totalBoardsRaw: this.elements.totalBoardsInput.value,
      winningBoardsRaw: this.elements.winningBoardsInput.value,
    };
  }

  public setConfigValues(config: Config): void {
    this.elements.totalBoardsInput.value = String(config.totalBoards);
    this.elements.winningBoardsInput.value = String(config.winningBoards);
  }

  public setSetupMessage(message: string): void {
    this.elements.setupMessage.textContent = message;
  }

  public clearSetupMessage(): void {
    this.elements.setupMessage.textContent = "";
  }

  public setVolume(volume: number): void {
    this.elements.masterVolumeInput.value = volume.toFixed(2);
    this.elements.masterVolumeValue.textContent = `${Math.round(volume * 100)}%`;
  }

  public setView(view: ViewName): void {
    this.toggleView(this.elements.setupView, view === "setup");
    this.toggleView(this.elements.gameView, view === "game");
  }

  public renderBoard(state: GameState): void {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < state.totalBoards; index += 1) {
      fragment.append(this.createBoardTile(index, state));
    }

    this.elements.boardGrid.replaceChildren(fragment);
  }

  public getCelebrationElement(): HTMLElement {
    return this.elements.winCelebration;
  }

  private bindSetupField(
    field: SetupFieldName,
    input: HTMLInputElement,
    handlers: AppViewHandlers,
  ): void {
    input.addEventListener("input", handlers.onSetupInputEdited);
    input.addEventListener("change", () => {
      input.value = handlers.onSetupInputCommitted(field, input.value);
      handlers.onSetupInputEdited();
    });
  }

  private createBoardTile(index: number, state: GameState): HTMLButtonElement {
    const tile = document.createElement("button");
    const isRevealed = state.revealed[index];

    tile.type = "button";
    tile.className = "board-tile";
    tile.dataset.index = String(index);
    tile.disabled = isRevealed;

    if (isRevealed) {
      const outcome = state.deck[index];
      tile.classList.add("is-revealed", outcome === "win" ? "is-win" : "is-miss");
      if (index === state.lastRevealedIndex) {
        tile.classList.add("is-latest");
      }

      tile.innerHTML = `<strong class="board-reveal">${outcome === "win" ? COPY.win : COPY.miss}</strong>`;
      return tile;
    }

    tile.classList.add("is-hidden-tile");
    tile.innerHTML = `<strong class="board-number">${index + 1}</strong>`;
    return tile;
  }

  private buildMarkup(): string {
    return `
      <div class="scene">
        <div class="ambient ambient-left"></div>
        <div class="ambient ambient-right"></div>

        <section id="setupView" class="view view--setup" aria-hidden="false">
          <div class="setup-shell">
            <h1 class="setup-title">${COPY.title}</h1>
            <div class="setup-row">
              <label class="inline-field" for="totalBoardsInput">
                <span class="inline-label">${COPY.totalBoards}</span>
                <input
                  id="totalBoardsInput"
                  class="inline-input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="128"
                  step="1"
                  value="${DEFAULT_TOTAL_BOARDS}"
                />
              </label>
              <label class="inline-field" for="winningBoardsInput">
                <span class="inline-label">${COPY.winningBoards}</span>
                <input
                  id="winningBoardsInput"
                  class="inline-input"
                  type="number"
                  inputmode="numeric"
                  min="1"
                  max="128"
                  step="1"
                  value="${DEFAULT_WINNING_BOARDS}"
                />
              </label>
            </div>
            <p id="setupMessage" class="setup-message"></p>
            <div class="setup-actions">
              <button id="startGameButton" class="btn btn-primary" type="button">${COPY.startGame}</button>
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
              <p class="win-celebration__text">${COPY.celebration}</p>
            </div>

            <section class="floor-panel">
              <div id="boardGrid" class="board-grid"></div>
            </section>

            <header class="game-toolbar">
              <div class="game-actions">
                <button id="gameHomeButton" class="btn btn-secondary" type="button">${COPY.home}</button>
                <button id="restartButton" class="btn btn-secondary" type="button">${COPY.restart}</button>
              </div>
              <label class="volume-control" for="masterVolumeInput">
                <span class="volume-label">${COPY.volume}</span>
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
  }

  private collectElements(): AppElements {
    return {
      setupView: this.requireElement<HTMLElement>("#setupView"),
      gameView: this.requireElement<HTMLElement>("#gameView"),
      startGameButton: this.requireElement<HTMLButtonElement>("#startGameButton"),
      gameHomeButton: this.requireElement<HTMLButtonElement>("#gameHomeButton"),
      restartButton: this.requireElement<HTMLButtonElement>("#restartButton"),
      totalBoardsInput: this.requireElement<HTMLInputElement>("#totalBoardsInput"),
      winningBoardsInput: this.requireElement<HTMLInputElement>("#winningBoardsInput"),
      setupMessage: this.requireElement<HTMLParagraphElement>("#setupMessage"),
      boardGrid: this.requireElement<HTMLDivElement>("#boardGrid"),
      masterVolumeInput: this.requireElement<HTMLInputElement>("#masterVolumeInput"),
      masterVolumeValue: this.requireElement<HTMLSpanElement>("#masterVolumeValue"),
      winCelebration: this.requireElement<HTMLElement>("#winCelebration"),
    };
  }

  private toggleView(element: HTMLElement, isVisible: boolean): void {
    element.classList.toggle("is-hidden", !isVisible);
    element.setAttribute("aria-hidden", String(!isVisible));
  }

  private requireElement<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing element: ${selector}`);
    }

    return element;
  }
}
