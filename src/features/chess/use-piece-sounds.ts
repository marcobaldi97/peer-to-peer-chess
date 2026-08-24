import { useEffect, useRef } from 'react'
import { playSound } from 'react-sounds'
import { GameStatus, type GameSnapshot } from './game'

// Plays a sound whenever a new move lands in the game history, plus a status
// cue for check/checkmate/draw. Skipped when history shrinks (a New Game reset).
export function usePieceSounds(snapshot: GameSnapshot): void {
  const previousMoveCount = useRef(snapshot.history.length)

  useEffect(() => {
    const { history, status } = snapshot
    const previousCount = previousMoveCount.current
    previousMoveCount.current = history.length

    if (history.length <= previousCount) return

    const lastMove = history[history.length - 1]
    playSound(lastMove.captured ? 'game/hit' : 'ui/button_soft')

    switch (status) {
      case GameStatus.Checkmate:
        playSound('notification/success')
        break
      case GameStatus.Stalemate:
      case GameStatus.Draw:
        playSound('notification/info')
        break
      case GameStatus.Check:
        playSound('notification/warning')
        break
    }
  }, [snapshot])
}
