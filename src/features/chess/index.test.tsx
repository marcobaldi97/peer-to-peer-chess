vi.mock('./game', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game')>()
  return { ...actual, Game: vi.fn(), createPlayers: vi.fn() }
})
vi.mock('react-chessboard', () => ({ Chessboard: vi.fn(() => null) }))
vi.mock('./components/online-chess-game', () => ({
  default: vi.fn(() => <div>online chess game</div>)
}))
vi.mock('./stockfish-engine', () => ({ createStockfishEngine: vi.fn() }))
vi.mock('react-sounds', async () => {
  const { useState } = await import('react')
  return {
    playSound: vi.fn(),
    SoundProvider: ({ children }: { children: unknown }) => children,
    useSoundEnabled: () => useState(true)
  }
})

import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { Chessboard } from 'react-chessboard'
import { Game, createPlayers, GameStatus, type GameSnapshot } from './game'
import { PlayerKind, type Player } from './players'
import OnlineChessGame from './components/online-chess-game'
import { createStockfishEngine } from './stockfish-engine'
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
    winner: null,
    ...overrides
  }
}

function createMockGameInstance(snapshot: GameSnapshot) {
  return {
    subscribe: vi.fn<[() => void], () => void>(() => vi.fn()),
    getSnapshot: vi.fn(() => snapshot),
    submitMove: vi.fn(() => true),
    reset: vi.fn(),
    resign: vi.fn()
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

  const you: Player = { id: 'you', name: 'You', kind: PlayerKind.LocalHuman }

  it.each([
    [GameStatus.Checkmate, 'Checkmate — You have no legal moves'],
    [GameStatus.Check, 'You are in check'],
    [GameStatus.InProgress, 'You are to move']
  ])(
    'uses second-person grammar for %s when the player is "You"',
    (status, expected) => {
      expect(statusText(buildSnapshot({ status }), you)).toBe(expected)
    }
  )

  it('formats Resignation using the winning player looked up from snapshot.winner', () => {
    const snapshot = buildSnapshot({
      status: GameStatus.Resignation,
      winner: 'w'
    })

    expect(statusText(snapshot, snapshot.players.b)).toBe(
      'Player 1 wins by resignation'
    )
  })

  it('uses "win" grammar for Resignation when the winning player is "You"', () => {
    const snapshot = buildSnapshot({
      status: GameStatus.Resignation,
      winner: 'w',
      players: {
        w: you,
        b: { id: 'opponent', name: 'Opponent', kind: PlayerKind.RemoteHuman }
      }
    })

    expect(statusText(snapshot, snapshot.players.b)).toBe(
      'You win by resignation'
    )
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

  describe('Surrender', () => {
    it('asks for confirmation in a dialog before resigning, and cancelling closes it without resigning', () => {
      render(<ChessGame />)

      fireEvent.click(screen.getByRole('button', { name: /surrender/i }))

      const dialog = screen.getByRole('alertdialog')
      expect(
        within(dialog).getByText('Surrender the game?')
      ).toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }))

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(mockGameInstance.resign).not.toHaveBeenCalled()
    })

    it('resigns the side to move when confirmed in the dialog, ending the game and showing the resignation status', () => {
      render(<ChessGame />)
      const listener = mockGameInstance.subscribe.mock.calls[0][0]

      fireEvent.click(screen.getByRole('button', { name: /surrender/i }))

      const dialog = screen.getByRole('alertdialog')
      fireEvent.click(
        within(dialog).getByRole('button', { name: /yes, surrender/i })
      )

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(mockGameInstance.resign).toHaveBeenCalledWith('w')

      act(() => {
        mockGameInstance.getSnapshot.mockReturnValue(
          buildSnapshot({
            status: GameStatus.Resignation,
            isGameOver: true,
            winner: 'b'
          })
        )
        listener()
      })

      expect(screen.getByTestId('game-status')).toHaveTextContent(
        'Player 2 wins by resignation'
      )
    })

    it('disables the button once the game is over', () => {
      mockGameInstance.getSnapshot.mockReturnValue(
        buildSnapshot({ isGameOver: true })
      )

      render(<ChessGame />)

      expect(screen.getByRole('button', { name: /surrender/i })).toBeDisabled()
    })

    it("disables the button while it is the computer's turn", () => {
      vi.mocked(createStockfishEngine).mockReturnValue({
        getBestMove: vi.fn(() => new Promise(() => {})),
        terminate: vi.fn()
      } as unknown as ReturnType<typeof createStockfishEngine>)
      mockGameInstance.getSnapshot.mockReturnValue(
        buildSnapshot({
          turn: 'b',
          players: {
            w: { id: 'w1', name: 'Player 1', kind: PlayerKind.LocalHuman },
            b: { id: 'computer', name: 'Computer', kind: PlayerKind.Computer }
          }
        })
      )

      render(<ChessGame />)

      expect(screen.getByRole('button', { name: /surrender/i })).toBeDisabled()
    })
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

    it('switches to Online and back to Local', () => {
      render(<ChessGame />)

      fireEvent.click(desktopNav().getByRole('radio', { name: /^online$/i }))

      expect(screen.getByText('online chess game')).toBeInTheDocument()
      expect(screen.queryByTestId('game-status')).not.toBeInTheDocument()

      fireEvent.click(desktopNav().getByRole('radio', { name: /^local$/i }))

      expect(screen.getByTestId('active-player')).toBeInTheDocument()
      expect(screen.queryByText('online chess game')).not.toBeInTheDocument()
    })

    it('starts on Online mode and forwards invitePeerId when given', () => {
      const onInviteSettled = vi.fn()
      render(
        <ChessGame invitePeerId="abc123" onInviteSettled={onInviteSettled} />
      )

      expect(
        desktopNav().getByRole('radio', { name: /^online$/i })
      ).toBeChecked()
      expect(screen.getByText('online chess game')).toBeInTheDocument()
      expect(vi.mocked(OnlineChessGame).mock.calls[0][0]).toMatchObject({
        invitePeerId: 'abc123'
      })

      act(
        () =>
          vi.mocked(OnlineChessGame).mock.calls[0][0].onInviteSettled?.(true)
      )

      expect(onInviteSettled).toHaveBeenCalledWith(true)
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
