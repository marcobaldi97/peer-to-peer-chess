vi.mock('./game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game')>()
  return { ...actual, Game: vi.fn(), createPlayers: vi.fn() }
})
vi.mock('react-chessboard', () => ({ Chessboard: vi.fn(() => null) }))
vi.mock('./online-chess-game', () => ({
  default: vi.fn(() => <div>online chess game</div>)
}))
vi.mock('react-sounds', async () => {
  const { useState } = await import('react')
  return {
    playSound: vi.fn(),
    SoundProvider: ({ children }: { children: unknown }) => children,
    useSoundEnabled: () => useState(true)
  }
})
vi.mock('./game-storage', () => ({
  loadInProgressGame: vi.fn(),
  saveInProgressGame: vi.fn(),
  clearInProgressGame: vi.fn()
}))

import { render, screen, fireEvent, within } from '@testing-library/react'
import { Chessboard } from 'react-chessboard'
import { Game, createPlayers, GameStatus, type GameSnapshot } from './game'
import { loadInProgressGame } from './game-storage'
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

function desktopNav() {
  return within(screen.getByRole('banner'))
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
    vi.mocked(createPlayers).mockReturnValue(players)
    vi.mocked(loadInProgressGame).mockReturnValue(null)
  })

  it('highlights the side to move instead of repeating it in text', () => {
    render(<ChessGame />)

    expect(screen.getByTestId('active-player')).toHaveTextContent('Player 1')
    expect(screen.queryByTestId('game-status')).not.toBeInTheDocument()
  })

  it('shows the status line once there is something to say beyond whose turn it is', () => {
    mockGameInstance.getSnapshot.mockReturnValue(
      buildSnapshot({ status: GameStatus.Check })
    )

    render(<ChessGame />)

    expect(screen.getByTestId('game-status')).toHaveTextContent(
      'Player 1 is in check'
    )
  })

  it('shows the Local match kicker and player names by default', () => {
    render(<ChessGame />)

    expect(screen.getByText('Local match')).toBeInTheDocument()
    expect(screen.getByText('Player 1')).toBeInTheDocument()
    expect(screen.getByText('Player 2')).toBeInTheDocument()
  })

  it('highlights whichever side is on move', () => {
    mockGameInstance.getSnapshot.mockReturnValue(buildSnapshot({ turn: 'b' }))

    render(<ChessGame />)

    expect(screen.getByText('Player 2')).toHaveClass('text-accent-700')
    expect(screen.getByText('Player 1')).toHaveClass('text-text/45')
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

  describe('mode selection', () => {
    it('defaults to Local mode', () => {
      render(<ChessGame />)

      expect(
        desktopNav().getByRole('radio', { name: /^local$/i })
      ).toBeChecked()
      expect(screen.getByTestId('active-player')).toBeInTheDocument()
      expect(screen.queryByText('online chess game')).not.toBeInTheDocument()
    })

    it('Local mode plays against the computer on the next New Game', () => {
      render(<ChessGame />)

      expect(screen.getByText('Local match')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /new game/i }))

      expect(createPlayers).toHaveBeenLastCalledWith(true)
    })

    it('selecting Solo swaps to hot-seat play on the next New Game', () => {
      render(<ChessGame />)

      fireEvent.click(desktopNav().getByRole('radio', { name: /^solo$/i }))

      expect(screen.getByText('Solo match')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /new game/i }))

      expect(createPlayers).toHaveBeenLastCalledWith(false)
    })

    it('Solo mode labels the sides Whites and Blacks instead of the player names', () => {
      render(<ChessGame />)

      fireEvent.click(desktopNav().getByRole('radio', { name: /^solo$/i }))

      expect(screen.getByTestId('active-player')).toHaveTextContent('Whites')
      expect(screen.getByText('Blacks')).toBeInTheDocument()
      expect(screen.queryByText('Player 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Player 2')).not.toBeInTheDocument()
    })

    it('resumes into Local mode with the saved pgn when a saved vsComputer game exists', () => {
      vi.mocked(loadInProgressGame).mockReturnValue({
        vsComputer: true,
        pgn: '1. e4 e5'
      })

      render(<ChessGame />)

      expect(
        desktopNav().getByRole('radio', { name: /^local$/i })
      ).toBeChecked()
      expect(vi.mocked(Game)).toHaveBeenCalledWith(players, '1. e4 e5')
    })

    it('resumes into Solo mode when a saved hot-seat game exists', () => {
      vi.mocked(loadInProgressGame).mockReturnValue({
        vsComputer: false,
        pgn: '1. d4 d5'
      })

      render(<ChessGame />)

      expect(desktopNav().getByRole('radio', { name: /^solo$/i })).toBeChecked()
      expect(vi.mocked(Game)).toHaveBeenCalledWith(players, '1. d4 d5')
    })

    it('switches to Online and back to Local', () => {
      render(<ChessGame />)

      fireEvent.click(desktopNav().getByRole('radio', { name: /^online$/i }))

      expect(screen.getByText('online chess game')).toBeInTheDocument()
      expect(screen.queryByTestId('game-status')).not.toBeInTheDocument()

      fireEvent.click(desktopNav().getByRole('radio', { name: /^local$/i }))

      expect(screen.getByTestId('active-player')).toBeInTheDocument()
      expect(screen.queryByText('online chess game')).not.toBeInTheDocument()
    })
  })

  describe('sound toggle', () => {
    it('toggles the pressed state', () => {
      render(<ChessGame />)

      const toggle = desktopNav().getByRole('button', {
        name: /toggle sound/i
      })

      expect(toggle).toHaveAttribute('aria-pressed', 'true')

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
