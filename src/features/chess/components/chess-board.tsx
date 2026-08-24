import { Chessboard, ChessboardOptions } from 'react-chessboard'
import type { PieceDropHandlerArgs, PieceHandlerArgs } from 'react-chessboard'
import { statusText, GameStatus, type GameSnapshot } from '../game'
import { usePieceSounds } from '../hooks/use-piece-sounds'

const squareStyles: Partial<ChessboardOptions> = {
  darkSquareStyle: { backgroundColor: 'rgb(var(--color-neutral-300))' },
  lightSquareStyle: { backgroundColor: 'rgb(var(--color-neutral-100))' }
}

type ChessBoardProps = {
  boardId: string
  snapshot: GameSnapshot
  onPieceDrop: (args: PieceDropHandlerArgs) => boolean
  canDragPiece: (args: PieceHandlerArgs) => boolean
  boardOrientation?: 'white' | 'black'
  matchLabel: string
  whiteName: string
  blackName: string
  hideStatusWhenInProgress?: boolean
}

export function ChessBoard({
  boardId,
  snapshot,
  onPieceDrop,
  canDragPiece,
  boardOrientation,
  matchLabel,
  whiteName,
  blackName,
  hideStatusWhenInProgress
}: ChessBoardProps) {
  usePieceSounds(snapshot)
  const turnPlayer = snapshot.players[snapshot.turn]

  return (
    <>
      <div className="overflow-hidden rounded-sm border-[6px] border-surface shadow-board outline outline-1 outline-divider">
        <Chessboard
          options={{
            id: boardId,
            position: snapshot.fen,
            boardOrientation,
            onPieceDrop,
            canDragPiece,
            ...squareStyles
          }}
        />
      </div>

      <div className="text-center">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
          {matchLabel}
        </p>
        <div className="flex items-baseline justify-center gap-3 font-heading text-[28px] font-semibold">
          <span
            data-testid={snapshot.turn === 'w' ? 'active-player' : undefined}
            className={
              snapshot.turn === 'w'
                ? 'border-b-2 border-accent pb-0.5 text-accent-700'
                : 'text-text/45'
            }
          >
            {whiteName}
          </span>
          <span className="font-body text-[15px] font-normal text-text/55">
            vs
          </span>
          <span
            data-testid={snapshot.turn === 'b' ? 'active-player' : undefined}
            className={
              snapshot.turn === 'b'
                ? 'border-b-2 border-accent pb-0.5 text-accent-700'
                : 'text-text/45'
            }
          >
            {blackName}
          </span>
        </div>
        {(!hideStatusWhenInProgress ||
          snapshot.status !== GameStatus.InProgress) && (
          <p data-testid="game-status" className="mt-2 text-base text-text/55">
            {statusText(snapshot, turnPlayer)}
          </p>
        )}
      </div>
    </>
  )
}
