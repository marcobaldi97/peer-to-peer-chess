import { useCallback, useState, useSyncExternalStore } from 'react'
import type { Square, Color } from 'chess.js'
import type { PieceDropHandlerArgs, PieceHandlerArgs } from 'react-chessboard'
import {
  Game,
  createDefaultPlayers,
  PromotionPiece,
  type GameSnapshot
} from './game'
import { PlayerKind } from './players'

type UseGameResult = {
  snapshot: GameSnapshot
  onPieceDrop: (args: PieceDropHandlerArgs) => boolean
  canDragPiece: (args: PieceHandlerArgs) => boolean
  newGame: () => void
}

export function useGame(): UseGameResult {
  const [game] = useState(() => new Game(createDefaultPlayers()))
  const snapshot = useSyncExternalStore<GameSnapshot>(
    game.subscribe,
    game.getSnapshot
  )

  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false

      const color = piece.pieceType.charAt(0) as Color

      return game.submitMove(color, {
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: PromotionPiece.Queen
      })
    },
    [game]
  )

  const canDragPiece = useCallback(
    ({ piece }: PieceHandlerArgs): boolean => {
      if (snapshot.isGameOver) return false

      const color = piece.pieceType.charAt(0) as Color

      if (color !== snapshot.turn) return false

      return snapshot.players[color].kind === PlayerKind.LocalHuman
    },
    [snapshot]
  )

  const newGame = useCallback(() => game.reset(createDefaultPlayers()), [game])

  return { snapshot, onPieceDrop, canDragPiece, newGame }
}
