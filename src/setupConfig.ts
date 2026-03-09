import { type Config } from "./gameState";

export type ConfigIssue = "invalid-count" | "too-many-winners";

export type ConfigValidationResult =
  | { ok: true; config: Config }
  | { ok: false; issue: ConfigIssue };

export const MIN_DRAW_COUNT = 1;
export const MAX_DRAW_COUNT = 128;
export const DEFAULT_TOTAL_BOARDS = 28;
export const DEFAULT_WINNING_BOARDS = 1;

export function validateConfig(totalBoardsRaw: string, winningBoardsRaw: string): ConfigValidationResult {
  const totalBoards = parseDrawCount(totalBoardsRaw);
  const winningBoards = parseDrawCount(winningBoardsRaw);

  if (totalBoards === null || winningBoards === null) {
    return { ok: false, issue: "invalid-count" };
  }

  if (winningBoards > totalBoards) {
    return { ok: false, issue: "too-many-winners" };
  }

  return {
    ok: true,
    config: { totalBoards, winningBoards },
  };
}

export function normalizeConfigValue(rawValue: string, fallback: number): string {
  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) {
    return String(fallback);
  }

  return String(Math.min(MAX_DRAW_COUNT, Math.max(MIN_DRAW_COUNT, parsed)));
}

function parseDrawCount(rawValue: string): number | null {
  if (!/^\d+$/.test(rawValue.trim())) {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (parsed < MIN_DRAW_COUNT || parsed > MAX_DRAW_COUNT) {
    return null;
  }

  return parsed;
}
