vi.mock('../game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game')>()
  return { ...actual, Game: vi.fn(), createPlayers: vi.fn() }
})
vi.mock('../stockfish-engine', () => ({ createStockfishEngine: vi.fn() }))
vi.mock('react-sounds', () => ({ playSound: vi.fn() }))

import { renderHook, act, waitFor } from '@testing-library/react'
import { playSound } from 'react-sounds'
import {
  Game,
  createPlayers,
  GameStatus,
  PromotionPiece,
  type GameSnapshot
} from '../game'
import { PlayerKind, type Player } from '../players'
import {
  createStockfishEngine,
  type StockfishEngine
} from '../stockfish-engine'
import { useGame } from './use-game'

function buildPlayers(): Record<'w' | 'b', Player> {
  return {
    w: { id: 'w1', name: 'Player 1', kind: PlayerKind.LocalHuman },
    b: { id: 'b1', name: 'Player 2', kind: PlayerKind.LocalHuman }
  }
}

function buildSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    fen: 'mock-fen',
    turn: 'w',
    status: GameStatus.InProgress,
    isGameOver: false,
    players: buildPlayers(),
    pgn: '',
    history: [],
    ...overrides
  }
}

function createMockGameInstance(snapshot: GameSnapshot) {
  return {
    subscribe: vi.fn(() => vi.fn()),
    getSnapshot: vi.fn(() => snapshot),
    submitMove: vi.fn(() => true),
    reset: vi.fn()
  }
}

function createMockEngine(): {
  getBestMove: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
} {
  return {
    getBestMove: vi.fn().mockResolvedValue({ from: 'e7', to: 'e5' }),
    terminate: vi.fn()
  }
}

describe('useGame', () => {
  let snapshot: GameSnapshot
  let mockGameInstance: ReturnType<typeof createMockGameInstance>

  beforeEach(() => {
    vi.clearAllMocks()
    snapshot = buildSnapshot()
    mockGameInstance = createMockGameInstance(snapshot)
    vi.mocked(Game).mockImplementation(
      () => mockGameInstance as unknown as Game
    )
    vi.mocked(createPlayers).mockReturnValue(snapshot.players)
  })

  it('constructs exactly one Game instance across re-renders', () => {
    const { rerender } = renderHook(() => useGame(false))

    rerender()
    rerender()

    expect(vi.mocked(Game)).toHaveBeenCalledTimes(1)
  })

  it('exposes the snapshot from the Game instance', () => {
    const { result } = renderHook(() => useGame(false))

    expect(result.current.snapshot).toBe(snapshot)
  })

  describe('onPieceDrop', () => {
    it('returns false without submitting a move when targetSquare is null', () => {
      const { result } = renderHook(() => useGame(false))

      let dropResult: boolean | undefined
      act(() => {
        dropResult = result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'wP', position: 'e2' },
          sourceSquare: 'e2',
          targetSquare: null
        })
      })

      expect(dropResult).toBe(false)
      expect(mockGameInstance.submitMove).not.toHaveBeenCalled()
    })

    it('derives the color from pieceType and submits with a queen promotion default', () => {
      const { result } = renderHook(() => useGame(false))

      act(() => {
        result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'bN', position: 'g8' },
          sourceSquare: 'g8',
          targetSquare: 'f6'
        })
      })

      expect(mockGameInstance.submitMove).toHaveBeenCalledWith('b', {
        from: 'g8',
        to: 'f6',
        promotion: PromotionPiece.Queen
      })
    })

    it('returns whatever submitMove reports', () => {
      mockGameInstance.submitMove.mockReturnValue(false)
      const { result } = renderHook(() => useGame(false))

      let dropResult: boolean | undefined
      act(() => {
        dropResult = result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'wP', position: 'e2' },
          sourceSquare: 'e2',
          targetSquare: 'e4'
        })
      })

      expect(dropResult).toBe(false)
    })

    it('plays a blocked sound when submitMove rejects the move', () => {
      mockGameInstance.submitMove.mockReturnValue(false)
      const { result } = renderHook(() => useGame(false))

      act(() => {
        result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'wP', position: 'e2' },
          sourceSquare: 'e2',
          targetSquare: 'e4'
        })
      })

      expect(playSound).toHaveBeenCalledWith('ui/blocked')
    })

    it('does not play a blocked sound when the move succeeds', () => {
      const { result } = renderHook(() => useGame(false))

      act(() => {
        result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'wP', position: 'e2' },
          sourceSquare: 'e2',
          targetSquare: 'e4'
        })
      })

      expect(playSound).not.toHaveBeenCalled()
    })
  })

  describe('canDragPiece', () => {
    it('returns false when the game is over', () => {
      snapshot.isGameOver = true
      const { result } = renderHook(() => useGame(false))

      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'wP' },
          square: 'e2'
        })
      ).toBe(false)
    })

    it('returns false when the piece color does not match the side to move', () => {
      const { result } = renderHook(() => useGame(false))

      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'bP' },
          square: 'e7'
        })
      ).toBe(false)
    })

    it('returns true for the local-human side to move', () => {
      const { result } = renderHook(() => useGame(false))

      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'wP' },
          square: 'e2'
        })
      ).toBe(true)
    })
  })

  it('newGame resets the Game with freshly created players for the current mode', () => {
    const { result } = renderHook(() => useGame(true))

    act(() => {
      result.current.newGame()
    })

    expect(createPlayers).toHaveBeenCalledWith(true)
    expect(mockGameInstance.reset).toHaveBeenCalledWith(snapshot.players)
  })

  describe('computer opponent', () => {
    it('does not create an engine when the side to move is a local human', () => {
      const { unmount } = renderHook(() => useGame(false))

      unmount()

      expect(createStockfishEngine).not.toHaveBeenCalled()
    })

    it('does not create an engine when the game is already over', () => {
      snapshot.isGameOver = true
      snapshot.turn = 'b'
      snapshot.players.b = {
        id: 'computer',
        name: 'Computer',
        kind: PlayerKind.Computer
      }

      renderHook(() => useGame(true))

      expect(createStockfishEngine).not.toHaveBeenCalled()
    })

    it("asks the engine for a move and submits it on the computer's turn", async () => {
      const mockEngine = createMockEngine()
      vi.mocked(createStockfishEngine).mockReturnValue(
        mockEngine as unknown as StockfishEngine
      )
      snapshot.turn = 'b'
      snapshot.players.b = {
        id: 'computer',
        name: 'Computer',
        kind: PlayerKind.Computer
      }

      renderHook(() => useGame(true))

      await waitFor(() => {
        expect(mockGameInstance.submitMove).toHaveBeenCalledWith('b', {
          from: 'e7',
          to: 'e5'
        })
      })
    })

    it('reuses the same engine instance across multiple computer turns', async () => {
      const mockEngine = createMockEngine()
      vi.mocked(createStockfishEngine).mockReturnValue(
        mockEngine as unknown as StockfishEngine
      )
      snapshot.turn = 'b'
      snapshot.players.b = {
        id: 'computer',
        name: 'Computer',
        kind: PlayerKind.Computer
      }

      const { rerender } = renderHook(() => useGame(true))
      await waitFor(() => {
        expect(mockEngine.getBestMove).toHaveBeenCalledTimes(1)
      })

      snapshot = buildSnapshot({
        turn: 'b',
        players: {
          ...buildPlayers(),
          b: { id: 'computer', name: 'Computer', kind: PlayerKind.Computer }
        }
      })
      mockGameInstance.getSnapshot.mockReturnValue(snapshot)
      rerender()

      await waitFor(() => {
        expect(mockEngine.getBestMove).toHaveBeenCalledTimes(2)
      })
      expect(createStockfishEngine).toHaveBeenCalledTimes(1)
    })

    it('ignores a stale engine response once the game has moved on', async () => {
      let resolveMove: (move: { from: string; to: string }) => void = () => {}
      const mockEngine = {
        getBestMove: vi.fn(
          () =>
            new Promise((resolve) => {
              resolveMove = resolve
            })
        ),
        terminate: vi.fn()
      }
      vi.mocked(createStockfishEngine).mockReturnValue(
        mockEngine as unknown as StockfishEngine
      )
      snapshot.turn = 'b'
      snapshot.players.b = {
        id: 'computer',
        name: 'Computer',
        kind: PlayerKind.Computer
      }

      const { rerender } = renderHook(() => useGame(true))
      await waitFor(() => {
        expect(mockEngine.getBestMove).toHaveBeenCalledTimes(1)
      })

      snapshot = buildSnapshot()
      mockGameInstance.getSnapshot.mockReturnValue(snapshot)
      rerender()

      resolveMove({ from: 'e7', to: 'e5' })
      await Promise.resolve()
      await Promise.resolve()

      expect(mockGameInstance.submitMove).not.toHaveBeenCalled()
    })

    it('terminates the engine on unmount', async () => {
      const mockEngine = createMockEngine()
      vi.mocked(createStockfishEngine).mockReturnValue(
        mockEngine as unknown as StockfishEngine
      )
      snapshot.turn = 'b'
      snapshot.players.b = {
        id: 'computer',
        name: 'Computer',
        kind: PlayerKind.Computer
      }

      const { unmount } = renderHook(() => useGame(true))
      await waitFor(() => {
        expect(mockEngine.getBestMove).toHaveBeenCalled()
      })

      unmount()

      expect(mockEngine.terminate).toHaveBeenCalled()
    })
  })
})
