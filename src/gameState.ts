export type DrawOutcome = "win" | "miss";

export type Config = {
  totalBoards: number;
  winningBoards: number;
};

export type GameState = Config & {
  deck: DrawOutcome[];
  revealed: boolean[];
  revealedWins: number;
  lastRevealedIndex: number | null;
};

export type RevealResult = {
  outcome: DrawOutcome;
  isFinalWin: boolean;
};

export function createGameState(config: Config): GameState {
  return {
    ...config,
    deck: buildDeck(config.totalBoards, config.winningBoards),
    revealed: Array.from({ length: config.totalBoards }, () => false),
    revealedWins: 0,
    lastRevealedIndex: null,
  };
}

export function revealBoard(state: GameState, index: number): RevealResult | null {
  if (index < 0 || index >= state.totalBoards || state.revealed[index]) {
    return null;
  }

  const outcome = state.deck[index];
  state.revealed[index] = true;
  state.lastRevealedIndex = index;

  if (outcome === "win") {
    state.revealedWins += 1;
  }

  return {
    outcome,
    isFinalWin: outcome === "win" && state.revealedWins === state.winningBoards,
  };
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
