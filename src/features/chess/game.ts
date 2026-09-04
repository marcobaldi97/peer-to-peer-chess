import { Chess, type Square, type Color, type Move } from 'chess.js'
import { PlayerKind, type Player } from './players'

export enum GameStatus {
  InProgress = 'in-progress',
  Check = 'check',
  Checkmate = 'checkmate',
  Stalemate = 'stalemate',
  Draw = 'draw',
  Resignation = 'resignation'
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
  winner: Color | null
}

type Listener = () => void

function opponentOf(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

export function canDragPiece(snapshot: GameSnapshot, color: Color): boolean {
  if (snapshot.isGameOver) return false

  if (color !== snapshot.turn) return false

  return snapshot.players[color].kind === PlayerKind.LocalHuman
}

export function statusText(snapshot: GameSnapshot, turnPlayer: Player): string {
  const isYou = turnPlayer.name === 'You'

  switch (snapshot.status) {
    case GameStatus.Checkmate:
      return `Checkmate — ${turnPlayer.name} ${
        isYou ? 'have' : 'has'
      } no legal moves`
    case GameStatus.Stalemate:
      return 'Draw by stalemate'
    case GameStatus.Draw:
      return 'Draw'
    case GameStatus.Check:
      return `${turnPlayer.name} ${isYou ? 'are' : 'is'} in check`
    case GameStatus.Resignation: {
      const winnerPlayer = snapshot.players[snapshot.winner as Color]

      return `${winnerPlayer.name} ${
        winnerPlayer.name === 'You' ? 'win' : 'wins'
      } by resignation`
    }
    default:
      return isYou ? 'You are to move' : `${turnPlayer.name} to move`
  }
}

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
  private resignedBy: Color | null = null

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
    if (this.resignedBy !== null || this.chess.isGameOver()) return false

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

  resign(color: Color): void {
    if (this.resignedBy !== null || this.chess.isGameOver()) return

    this.resignedBy = color
    this.emit()
  }

  reset(players: Record<Color, Player> = this.players): void {
    this.chess = new Chess()
    this.players = players
    this.resignedBy = null
    this.emit()
  }

  private emit(): void {
    this.snapshot = this.computeSnapshot()
    this.listeners.forEach((listener) => listener())
  }

  private computeSnapshot(): GameSnapshot {
    let status: GameStatus = GameStatus.InProgress
    let winner: Color | null = null

    if (this.resignedBy !== null) {
      status = GameStatus.Resignation
      winner = opponentOf(this.resignedBy)
    } else if (this.chess.isCheckmate()) {
      status = GameStatus.Checkmate
      winner = opponentOf(this.chess.turn())
    } else if (this.chess.isStalemate()) status = GameStatus.Stalemate
    else if (this.chess.isDraw()) status = GameStatus.Draw
    else if (this.chess.isCheck()) status = GameStatus.Check

    return {
      fen: this.chess.fen(),
      turn: this.chess.turn(),
      status,
      isGameOver: this.resignedBy !== null || this.chess.isGameOver(),
      players: this.players,
      pgn: this.chess.pgn(),
      history: this.chess.history({ verbose: true }),
      winner
    }
  }
}
