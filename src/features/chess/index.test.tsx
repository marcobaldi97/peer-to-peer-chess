vi.mock('./game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game')>()
  return { ...actual, Game: vi.fn(), createDefaultPlayers: vi.fn() }
})
vi.mock('react-chessboard', () => ({ Chessboard: vi.fn(() => null) }))

import { render, screen, fireEvent } from '@testing-library/react'
import { Chessboard } from 'react-chessboard'
import {
  Game,
  createDefaultPlayers,
  GameStatus,
  type GameSnapshot
} from './game'
import { PlayerKind, type Player } from './players'
import ChessGame, { statusText } from './index'

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

describe('statusText', () => {
  const player: Player = { id: 'p1', name: 'Ada', kind: PlayerKind.LocalHuman }

  it.each([
    [GameStatus.Checkmate, 'Checkmate — Ada has no legal moves'],
    [GameStatus.Stalemate, 'Draw by stalemate'],
    [GameStatus.Draw, 'Draw'],
    [GameStatus.Check, 'Ada is in check'],
    [GameStatus.InProgress, 'Ada to move']
  ])('formats %s', (status, expected) => {
    expect(statusText(buildSnapshot({ status }), player)).toBe(expected)
  })
})

describe('<ChessGame />', () => {
  let mockGameInstance: ReturnType<typeof createMockGameInstance>
  let players: Record<'w' | 'b', Player>

  beforeEach(() => {
    vi.clearAllMocks()
    const snapshot = buildSnapshot()
    players = snapshot.players
    mockGameInstance = createMockGameInstance(snapshot)
    vi.mocked(Game).mockImplementation(
      () => mockGameInstance as unknown as Game
    )
    vi.mocked(createDefaultPlayers).mockReturnValue(players)
  })

  it('renders the status line for the side to move', () => {
    render(<ChessGame />)

    expect(screen.getByTestId('game-status')).toHaveTextContent(
      'Player 1 to move'
    )
  })

  it('passes the board position and handlers through to Chessboard', () => {
    render(<ChessGame />)

    const { options } = vi.mocked(Chessboard).mock.calls[0][0]

    if (!options) throw new Error('Chessboard was rendered without options')

    expect(options.position).toBe('mock-fen')
    expect(typeof options.onPieceDrop).toBe('function')
    expect(typeof options.canDragPiece).toBe('function')
  })

  it('calls Game#reset when the New Game button is clicked', () => {
    render(<ChessGame />)

    fireEvent.click(screen.getByRole('button', { name: /new game/i }))

    expect(mockGameInstance.reset).toHaveBeenCalledWith(players)
  })
})
