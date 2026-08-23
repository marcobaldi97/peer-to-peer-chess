import { Chess, type Square, type Color, type Move } from 'chess.js'
import { PlayerKind, type Player } from './players'

export enum GameStatus {
  InProgress = 'in-progress',
  Check = 'check',
  Checkmate = 'checkmate',
  Stalemate = 'stalemate',
  Draw = 'draw'
}

export enum PromotionPiece {
  Queen = 'q',
  Rook = 'r',
  Bishop = 'b',
  Knight = 'n'
}

export type GameSnapshot = {
  fen: string
  turn: Color
  status: GameStatus
  isGameOver: boolean
  players: Record<Color, Player>
  pgn: string
  history: Move[]
}

type Listener = () => void

export function createPlayers(vsComputer: boolean): Record<Color, Player> {
  return {
    w: { id: 'player-1', name: 'Player 1', kind: PlayerKind.LocalHuman },
    b: vsComputer
      ? { id: 'computer', name: 'Computer', kind: PlayerKind.Computer }
      : { id: 'player-2', name: 'Player 2', kind: PlayerKind.LocalHuman }
  }
}

export class Game {
  private chess = new Chess()
  private players: Record<Color, Player>
  private listeners = new Set<Listener>()
  private snapshot: GameSnapshot

  constructor(players: Record<Color, Player>) {
    this.players = players
    this.snapshot = this.computeSnapshot()
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): GameSnapshot => this.snapshot

  submitMove(
    color: Color,
    move: { from: Square; to: Square; promotion?: PromotionPiece }
  ): boolean {
    if (this.chess.isGameOver()) return false

    if (this.chess.turn() !== color) return false

    try {
      this.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? PromotionPiece.Queen
      })
    } catch {
      return false
    }

    this.emit()

    return true
  }

  reset(players: Record<Color, Player> = this.players): void {
    this.chess = new Chess()
    this.players = players
    this.emit()
  }

  private emit(): void {
    this.snapshot = this.computeSnapshot()
    this.listeners.forEach((listener) => listener())
  }

  private computeSnapshot(): GameSnapshot {
    let status: GameStatus = GameStatus.InProgress

    if (this.chess.isCheckmate()) status = GameStatus.Checkmate
    else if (this.chess.isStalemate()) status = GameStatus.Stalemate
    else if (this.chess.isDraw()) status = GameStatus.Draw
    else if (this.chess.isCheck()) status = GameStatus.Check

    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      status,
      isGameOver: this.chess.isGameOver(),
      players: this.players,
      pgn: this.chess.pgn(),
      history: this.chess.history({ verbose: true })
    }
  }
}
