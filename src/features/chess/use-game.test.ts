vi.mock('./game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game')>()
  return { ...actual, Game: vi.fn(), createDefaultPlayers: vi.fn() }
})

import { renderHook, act } from '@testing-library/react'
import {
  Game,
  createDefaultPlayers,
  GameStatus,
  PromotionPiece,
  type GameSnapshot
} from './game'
import { PlayerKind, type Player } from './players'
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
    vi.mocked(createDefaultPlayers).mockReturnValue(snapshot.players)
  })

  it('constructs exactly one Game instance across re-renders', () => {
    const { rerender } = renderHook(() => useGame())

    rerender()
    rerender()

    expect(vi.mocked(Game)).toHaveBeenCalledTimes(1)
  })

  it('exposes the snapshot from the Game instance', () => {
    const { result } = renderHook(() => useGame())

    expect(result.current.snapshot).toBe(snapshot)
  })

  describe('onPieceDrop', () => {
    it('returns false without submitting a move when targetSquare is null', () => {
      const { result } = renderHook(() => useGame())

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
      const { result } = renderHook(() => useGame())

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
      const { result } = renderHook(() => useGame())

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
  })

  describe('canDragPiece', () => {
    it('returns false when the game is over', () => {
      snapshot.isGameOver = true
      const { result } = renderHook(() => useGame())

      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'wP' },
          square: 'e2'
        })
      ).toBe(false)
    })

    it('returns false when the piece color does not match the side to move', () => {
      const { result } = renderHook(() => useGame())

      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'bP' },
          square: 'e7'
        })
      ).toBe(false)
    })

    it('returns true for the local-human side to move', () => {
      const { result } = renderHook(() => useGame())

      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'wP' },
          square: 'e2'
        })
      ).toBe(true)
    })
  })

  it('newGame resets the Game with freshly created default players', () => {
    const { result } = renderHook(() => useGame())

    act(() => {
      result.current.newGame()
    })

    expect(mockGameInstance.reset).toHaveBeenCalledWith(snapshot.players)
  })
})
