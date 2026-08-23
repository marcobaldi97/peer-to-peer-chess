import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { classNames } from 'utils'
import { GameStatus, type GameSnapshot } from './game'
import type { Player } from './players'
import { useGame } from './use-game'

export function statusText(snapshot: GameSnapshot, turnPlayer: Player): string {
  switch (snapshot.status) {
    case GameStatus.Checkmate:
      return `Checkmate — ${turnPlayer.name} has no legal moves`
    case GameStatus.Stalemate:
      return 'Draw by stalemate'
    case GameStatus.Draw:
      return 'Draw'
    case GameStatus.Check:
      return `${turnPlayer.name} is in check`
    default:
      return `${turnPlayer.name} to move`
  }
}

export default function ChessGame() {
  const [vsComputer, setVsComputer] = useState(false)
  const { snapshot, onPieceDrop, canDragPiece, newGame } = useGame(vsComputer)
  const turnPlayer = snapshot.players[snapshot.turn]

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <p
        data-testid="game-status"
        className="text-lg font-medium text-gray-700"
      >
        {statusText(snapshot, turnPlayer)}
      </p>

      <div className="w-full max-w-[560px]">
        <Chessboard
          options={{
            id: 'hot-seat-chess',
            position: snapshot.fen,
            onPieceDrop,
            canDragPiece
          }}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={vsComputer}
          onChange={(event) => setVsComputer(event.target.checked)}
        />
        Play against computer
      </label>

      <button
        type="button"
        onClick={newGame}
        className={classNames(
          'rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white',
          'hover:bg-gray-700'
        )}
      >
        New Game
      </button>
    </div>
  )
}
