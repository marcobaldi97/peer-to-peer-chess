vi.mock('./game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game')>()
  return { ...actual, Game: vi.fn() }
})
vi.mock('react-sounds', () => ({ playSound: vi.fn() }))

import { renderHook, act } from '@testing-library/react'
import { playSound } from 'react-sounds'
import { Game, GameStatus, PromotionPiece, type GameSnapshot } from './game'
import { PlayerKind, type Player } from './players'
import type { PeerConnection } from './peer-connection'
import { useNetGame } from './use-net-game'

function buildPlayers(): Record<'w' | 'b', Player> {
  return {
    w: { id: 'you', name: 'You', kind: PlayerKind.LocalHuman },
    b: { id: 'opponent', name: 'Opponent', kind: PlayerKind.RemoteHuman }
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

type MoveListener = Parameters<PeerConnection['onMove']>[0]
type ResetListener = Parameters<PeerConnection['onReset']>[0]

function createMockConnection() {
  return {
    onMove: vi.fn<[MoveListener], () => void>(() => vi.fn()),
    onReset: vi.fn<[ResetListener], () => void>(() => vi.fn()),
    sendMove: vi.fn(),
    sendReset: vi.fn()
  }
}

describe('useNetGame', () => {
  let snapshot: GameSnapshot
  let mockGameInstance: ReturnType<typeof createMockGameInstance>
  let connection: ReturnType<typeof createMockConnection>

  beforeEach(() => {
    vi.clearAllMocks()
    snapshot = buildSnapshot()
    mockGameInstance = createMockGameInstance(snapshot)
    vi.mocked(Game).mockImplementation(
      () => mockGameInstance as unknown as Game
    )
    connection = createMockConnection()
  })

  it('constructs one Game with the local player as White when hosting', () => {
    renderHook(() => useNetGame(connection as unknown as PeerConnection, 'w'))

    expect(vi.mocked(Game)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(Game).mock.calls[0][0]).toEqual({
      w: { id: 'you', name: 'You', kind: PlayerKind.LocalHuman },
      b: { id: 'opponent', name: 'Opponent', kind: PlayerKind.RemoteHuman }
    })
  })

  it('constructs the Game with the local player as Black when joining', () => {
    renderHook(() => useNetGame(connection as unknown as PeerConnection, 'b'))

    expect(vi.mocked(Game).mock.calls[0][0]).toEqual({
      b: { id: 'you', name: 'You', kind: PlayerKind.LocalHuman },
      w: { id: 'opponent', name: 'Opponent', kind: PlayerKind.RemoteHuman }
    })
  })

  it('exposes the snapshot from the Game instance', () => {
    const { result } = renderHook(() =>
      useNetGame(connection as unknown as PeerConnection, 'w')
    )

    expect(result.current.snapshot).toBe(snapshot)
  })

  describe('incoming moves', () => {
    it("submits an incoming move for the opponent's color", () => {
      renderHook(() => useNetGame(connection as unknown as PeerConnection, 'w'))

      const moveHandler = connection.onMove.mock.calls[0][0]
      act(() => moveHandler({ from: 'e7', to: 'e5' }))

      expect(mockGameInstance.submitMove).toHaveBeenCalledWith('b', {
        from: 'e7',
        to: 'e5'
      })
    })

    it('unsubscribes the move listener on unmount', () => {
      const unsubscribe = vi.fn()
      connection.onMove.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() =>
        useNetGame(connection as unknown as PeerConnection, 'w')
      )
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('incoming reset', () => {
    it('resets the local game, keeping the same players', () => {
      renderHook(() => useNetGame(connection as unknown as PeerConnection, 'w'))

      const resetHandler = connection.onReset.mock.calls[0][0]
      act(() => resetHandler())

      expect(mockGameInstance.reset).toHaveBeenCalledWith()
    })
  })

  describe('onPieceDrop', () => {
    it('returns false without submitting when targetSquare is null', () => {
      const { result } = renderHook(() =>
        useNetGame(connection as unknown as PeerConnection, 'w')
      )

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
      expect(connection.sendMove).not.toHaveBeenCalled()
    })

    it('submits locally and relays the move over the connection on success', () => {
      const { result } = renderHook(() =>
        useNetGame(connection as unknown as PeerConnection, 'w')
      )

      let dropResult: boolean | undefined
      act(() => {
        dropResult = result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'wP', position: 'e2' },
          sourceSquare: 'e2',
          targetSquare: 'e4'
        })
      })

      expect(dropResult).toBe(true)
      expect(mockGameInstance.submitMove).toHaveBeenCalledWith('w', {
        from: 'e2',
        to: 'e4',
        promotion: PromotionPiece.Queen
      })
      expect(connection.sendMove).toHaveBeenCalledWith({
        from: 'e2',
        to: 'e4',
        promotion: PromotionPiece.Queen
      })
    })

    it('does not relay the move over the connection when the local submit fails', () => {
      mockGameInstance.submitMove.mockReturnValue(false)
      const { result } = renderHook(() =>
        useNetGame(connection as unknown as PeerConnection, 'w')
      )

      act(() => {
        result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'bP', position: 'e7' },
          sourceSquare: 'e7',
          targetSquare: 'e5'
        })
      })

      expect(connection.sendMove).not.toHaveBeenCalled()
    })

    it('plays a blocked sound when the local submit fails', () => {
      mockGameInstance.submitMove.mockReturnValue(false)
      const { result } = renderHook(() =>
        useNetGame(connection as unknown as PeerConnection, 'w')
      )

      act(() => {
        result.current.onPieceDrop({
          piece: { isSparePiece: false, pieceType: 'bP', position: 'e7' },
          sourceSquare: 'e7',
          targetSquare: 'e5'
        })
      })

      expect(playSound).toHaveBeenCalledWith('ui/blocked')
    })
  })

  describe('canDragPiece', () => {
    it('delegates to the shared canDragPiece helper', () => {
      const { result } = renderHook(() =>
        useNetGame(connection as unknown as PeerConnection, 'w')
      )

      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'wP' },
          square: 'e2'
        })
      ).toBe(true)
      expect(
        result.current.canDragPiece({
          isSparePiece: false,
          piece: { pieceType: 'bP' },
          square: 'e7'
        })
      ).toBe(false)
    })
  })

  it('newGame resets the local game and broadcasts a reset', () => {
    const { result } = renderHook(() =>
      useNetGame(connection as unknown as PeerConnection, 'w')
    )

    act(() => result.current.newGame())

    expect(mockGameInstance.reset).toHaveBeenCalledWith()
    expect(connection.sendReset).toHaveBeenCalled()
  })
})
