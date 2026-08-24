vi.mock('chess.js', () => ({ Chess: vi.fn() }))

import { Chess } from 'chess.js'
import {
  Game,
  GameStatus,
  PromotionPiece,
  canDragPiece,
  createPlayers
} from './game'
import { PlayerKind } from './players'

function createMockChess(overrides: Record<string, unknown> = {}) {
  return {
    isGameOver: vi.fn().mockReturnValue(false),
    isCheckmate: vi.fn().mockReturnValue(false),
    isStalemate: vi.fn().mockReturnValue(false),
    isDraw: vi.fn().mockReturnValue(false),
    isCheck: vi.fn().mockReturnValue(false),
    turn: vi.fn().mockReturnValue('w'),
    fen: vi.fn().mockReturnValue('mock-fen'),
    pgn: vi.fn().mockReturnValue('mock-pgn'),
    history: vi.fn().mockReturnValue([]),
    move: vi.fn(),
    loadPgn: vi.fn(),
    ...overrides
  }
}

let currentMockChess: ReturnType<typeof createMockChess>

beforeEach(() => {
  currentMockChess = createMockChess()
  vi.mocked(Chess).mockImplementation(
    () => currentMockChess as unknown as Chess
  )
})

describe('createPlayers', () => {
  it('returns two local-human players when vsComputer is false', () => {
    const players = createPlayers(false)

    expect(players.w.kind).toBe(PlayerKind.LocalHuman)
    expect(players.b.kind).toBe(PlayerKind.LocalHuman)
  })

  it('returns a computer player for black when vsComputer is true', () => {
    const players = createPlayers(true)

    expect(players.w.kind).toBe(PlayerKind.LocalHuman)
    expect(players.b).toEqual({
      id: 'computer',
      name: 'Computer',
      kind: PlayerKind.Computer
    })
  })
})

describe('Game', () => {
  it('computes an in-progress snapshot from a fresh chess.js instance', () => {
    const players = createPlayers(false)
    const game = new Game(players)

    expect(game.getSnapshot()).toEqual({
      fen: 'mock-fen',
      turn: 'w',
      status: GameStatus.InProgress,
      isGameOver: false,
      players,
      pgn: 'mock-pgn',
      history: []
    })
  })

  it('reports Check when chess.js reports check only', () => {
    currentMockChess.isCheck.mockReturnValue(true)

    expect(new Game(createPlayers(false)).getSnapshot().status).toBe(
      GameStatus.Check
    )
  })

  it('reports Checkmate even when isCheck is also true', () => {
    currentMockChess.isCheckmate.mockReturnValue(true)
    currentMockChess.isCheck.mockReturnValue(true)

    expect(new Game(createPlayers(false)).getSnapshot().status).toBe(
      GameStatus.Checkmate
    )
  })

  it('reports Stalemate', () => {
    currentMockChess.isStalemate.mockReturnValue(true)

    expect(new Game(createPlayers(false)).getSnapshot().status).toBe(
      GameStatus.Stalemate
    )
  })

  it('reports Draw', () => {
    currentMockChess.isDraw.mockReturnValue(true)

    expect(new Game(createPlayers(false)).getSnapshot().status).toBe(
      GameStatus.Draw
    )
  })

  it('exposes isGameOver directly from chess.isGameOver()', () => {
    currentMockChess.isGameOver.mockReturnValue(true)

    expect(new Game(createPlayers(false)).getSnapshot().isGameOver).toBe(true)
  })

  describe('restoring from a saved pgn', () => {
    it('loads the given pgn into chess.js', () => {
      new Game(createPlayers(false), '1. e4 e5')

      expect(currentMockChess.loadPgn).toHaveBeenCalledWith('1. e4 e5')
    })

    it('does not call loadPgn when no initial pgn is given', () => {
      new Game(createPlayers(false))

      expect(currentMockChess.loadPgn).not.toHaveBeenCalled()
    })

    it('falls back to a fresh game when the saved pgn is invalid', () => {
      currentMockChess.loadPgn.mockImplementation(() => {
        throw new Error('Invalid pgn')
      })

      expect(() => new Game(createPlayers(false), 'garbage')).not.toThrow()
    })
  })

  describe('submitMove', () => {
    it('returns false and does not call chess.move when the game is already over', () => {
      currentMockChess.isGameOver.mockReturnValue(true)
      const game = new Game(createPlayers(false))

      expect(game.submitMove('w', { from: 'e2', to: 'e4' })).toBe(false)
      expect(currentMockChess.move).not.toHaveBeenCalled()
    })

    it("returns false when it is not the given color's turn", () => {
      currentMockChess.turn.mockReturnValue('w')
      const game = new Game(createPlayers(false))

      expect(game.submitMove('b', { from: 'e7', to: 'e5' })).toBe(false)
      expect(currentMockChess.move).not.toHaveBeenCalled()
    })

    it('applies a legal move, defaults promotion to Queen, and notifies subscribers', () => {
      const game = new Game(createPlayers(false))
      const listener = vi.fn()
      game.subscribe(listener)

      const result = game.submitMove('w', { from: 'e2', to: 'e4' })

      expect(result).toBe(true)
      expect(currentMockChess.move).toHaveBeenCalledWith({
        from: 'e2',
        to: 'e4',
        promotion: PromotionPiece.Queen
      })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('passes through an explicit promotion piece', () => {
      new Game(createPlayers(false)).submitMove('w', {
        from: 'a7',
        to: 'a8',
        promotion: PromotionPiece.Knight
      })

      expect(currentMockChess.move).toHaveBeenCalledWith({
        from: 'a7',
        to: 'a8',
        promotion: PromotionPiece.Knight
      })
    })

    it('returns false and does not notify subscribers when chess.move throws', () => {
      currentMockChess.move.mockImplementation(() => {
        throw new Error('Invalid move')
      })
      const game = new Game(createPlayers(false))
      const listener = vi.fn()
      game.subscribe(listener)

      expect(game.submitMove('w', { from: 'e2', to: 'e4' })).toBe(false)
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    it('stops notifying a listener after it unsubscribes', () => {
      const game = new Game(createPlayers(false))
      const listener = vi.fn()
      const unsubscribe = game.subscribe(listener)

      game.submitMove('w', { from: 'e2', to: 'e4' })
      unsubscribe()
      currentMockChess.turn.mockReturnValue('b')
      game.submitMove('b', { from: 'e7', to: 'e5' })

      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('canDragPiece', () => {
    function buildSnapshot(
      overrides: Partial<ReturnType<Game['getSnapshot']>> = {}
    ) {
      return {
        fen: 'mock-fen',
        turn: 'w' as const,
        status: GameStatus.InProgress,
        isGameOver: false,
        players: createPlayers(false),
        pgn: '',
        history: [],
        ...overrides
      }
    }

    it('returns false when the game is over', () => {
      expect(canDragPiece(buildSnapshot({ isGameOver: true }), 'w')).toBe(false)
    })

    it('returns false when the color is not the side to move', () => {
      expect(canDragPiece(buildSnapshot({ turn: 'w' }), 'b')).toBe(false)
    })

    it('returns true for a local-human side to move', () => {
      expect(canDragPiece(buildSnapshot({ turn: 'w' }), 'w')).toBe(true)
    })

    it('returns false for a non-local-human side to move', () => {
      const players = createPlayers(true)

      expect(canDragPiece(buildSnapshot({ turn: 'b', players }), 'b')).toBe(
        false
      )
    })
  })

  describe('reset', () => {
    it('without arguments keeps the existing players and creates a fresh chess.js instance', () => {
      const players = createPlayers(false)
      const game = new Game(players)
      const callsBefore = vi.mocked(Chess).mock.calls.length

      game.reset()

      expect(vi.mocked(Chess).mock.calls.length).toBe(callsBefore + 1)
      expect(game.getSnapshot().players).toBe(players)
    })

    it('replaces the players when given new ones', () => {
      const game = new Game(createPlayers(false))
      const newPlayers = createPlayers(false)

      game.reset(newPlayers)

      expect(game.getSnapshot().players).toBe(newPlayers)
    })
  })
})
