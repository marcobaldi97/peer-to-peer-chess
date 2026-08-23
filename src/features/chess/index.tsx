import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { classNames } from 'utils'
import { statusText } from './game'
import { useGame } from './use-game'
import OnlineChessGame from './online-chess-game'

export { statusText }

type Mode = 'local' | 'online'

function LocalChessGame() {
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

export default function ChessGame() {
  const [mode, setMode] = useState<Mode>('local')

  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <div className="flex gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'local'}
          onClick={() => setMode('local')}
          className={classNames(
            'rounded-md px-3 py-1 text-sm font-medium',
            mode === 'local'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-700'
          )}
        >
          Local Game
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'online'}
          onClick={() => setMode('online')}
          className={classNames(
            'rounded-md px-3 py-1 text-sm font-medium',
            mode === 'online'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-700'
          )}
        >
          Play Online
        </button>
      </div>

      {mode === 'local' ? <LocalChessGame /> : <OnlineChessGame />}
    </div>
  )
}
