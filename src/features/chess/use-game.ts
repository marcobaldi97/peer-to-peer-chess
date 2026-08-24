import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react'
import type { Square, Color } from 'chess.js'
import type { PieceDropHandlerArgs, PieceHandlerArgs } from 'react-chessboard'
import { playSound } from 'react-sounds'
import {
  Game,
  createPlayers,
  canDragPiece as canPlayerDragPiece,
  PromotionPiece,
  type GameSnapshot
} from './game'
import { PlayerKind } from './players'
import { createStockfishEngine, type StockfishEngine } from './stockfish-engine'

type UseGameResult = {
  snapshot: GameSnapshot
  onPieceDrop: (args: PieceDropHandlerArgs) => boolean
  canDragPiece: (args: PieceHandlerArgs) => boolean
  newGame: () => void
}

export function useGame(vsComputer: boolean): UseGameResult {
  const [game] = useState(() => new Game(createPlayers(vsComputer)))
  const engineRef = useRef<StockfishEngine | null>(null)
  const snapshot = useSyncExternalStore<GameSnapshot>(
    game.subscribe,
    game.getSnapshot
  )

  useEffect(() => {
    return () => engineRef.current?.terminate()
  }, [])

  useEffect(() => {
    if (snapshot.isGameOver) return

    const turnPlayer = snapshot.players[snapshot.turn]

    if (turnPlayer.kind !== PlayerKind.Computer) return

    let cancelled = false

    if (!engineRef.current) engineRef.current = createStockfishEngine()

    engineRef.current.getBestMove(snapshot.fen).then((move) => {
      if (cancelled) return

      game.submitMove(snapshot.turn, move)
    })

    return () => {
      cancelled = true
    }
  }, [snapshot, game])

  const onPieceDrop = useCallback(
    ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false

      const color = piece.pieceType.charAt(0) as Color

      // TODO: always promotes to Queen — needs a promotion-piece picker
      const submitted = game.submitMove(color, {
        from: sourceSquare as Square,
        to: targetSquare as Square,
        promotion: PromotionPiece.Queen
      })

      if (!submitted) playSound('ui/blocked')

      return submitted
    },
    [game]
  )

  const canDragPiece = useCallback(
    ({ piece }: PieceHandlerArgs): boolean =>
      canPlayerDragPiece(snapshot, piece.pieceType.charAt(0) as Color),
    [snapshot]
  )

  const newGame = useCallback(
    () => game.reset(createPlayers(vsComputer)),
    [game, vsComputer]
  )

  return { snapshot, onPieceDrop, canDragPiece, newGame }
}
