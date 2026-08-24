import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { Square, Color } from 'chess.js'
import type { PieceDropHandlerArgs, PieceHandlerArgs } from 'react-chessboard'
import { playSound } from 'react-sounds'
import {
  Game,
  canDragPiece as canPlayerDragPiece,
  PromotionPiece,
  type GameSnapshot
} from './game'
import { PlayerKind, type Player } from './players'
import type { PeerConnection } from './peer-connection'

type UseNetGameResult = {
  snapshot: GameSnapshot
  onPieceDrop: (args: PieceDropHandlerArgs) => boolean
  canDragPiece: (args: PieceHandlerArgs) => boolean
  newGame: () => void
}

function opponentOf(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

function createNetPlayers(localColor: Color): Record<Color, Player> {
  const opponentColor = opponentOf(localColor)

  return {
    [localColor]: { id: 'you', name: 'You', kind: PlayerKind.LocalHuman },
    [opponentColor]: {
      id: 'opponent',
      name: 'Opponent',
      kind: PlayerKind.RemoteHuman
    }
  } as Record<Color, Player>
}

export function useNetGame(
  connection: PeerConnection,
  localColor: Color
): UseNetGameResult {
  const [game] = useState(() => new Game(createNetPlayers(localColor)))
  const snapshot = useSyncExternalStore<GameSnapshot>(
    game.subscribe,
    game.getSnapshot
  )

  useEffect(
    () =>
      connection.onMove((move) =>
        game.submitMove(opponentOf(localColor), move)
      ),
    [connection, game, localColor]
  )

  useEffect(() => connection.onReset(() => game.reset()), [connection, game])

  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false

      const color = piece.pieceType.charAt(0) as Color
      // TODO: always promotes to Queen — needs a promotion-piece picker
      const move = {
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: PromotionPiece.Queen
      }

      const applied = game.submitMove(color, move)

      if (applied) connection.sendMove(move)
      else playSound('ui/blocked')

      return applied
    },
    [game, connection]
  )

  const canDragPiece = useCallback(
    ({ piece }: PieceHandlerArgs): boolean =>
      canPlayerDragPiece(snapshot, piece.pieceType.charAt(0) as Color),
    [snapshot]
  )

  const newGame = useCallback(() => {
    game.reset()
    connection.sendReset()
  }, [game, connection])

  return { snapshot, onPieceDrop, canDragPiece, newGame }
}
