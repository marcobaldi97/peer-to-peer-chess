const STORAGE_KEY = 'chess:in-progress-game'

export type StoredGame = {
  vsComputer: boolean
  pgn: string
}

function isStoredGame(value: unknown): value is StoredGame {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.vsComputer === 'boolean' &&
    typeof candidate.pgn === 'string'
  )
}

export function saveInProgressGame(vsComputer: boolean, pgn: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ vsComputer, pgn } satisfies StoredGame)
    )
  } catch {
    // localStorage unavailable (disabled, full, private browsing) — skip persisting
  }
}

export function loadInProgressGame(): StoredGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)

    return isStoredGame(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function clearInProgressGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage unavailable — nothing to clear
  }
}
