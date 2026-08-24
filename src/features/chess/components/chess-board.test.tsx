vi.mock('react-chessboard', () => ({ Chessboard: vi.fn(() => null) }))
vi.mock('react-sounds', () => ({ playSound: vi.fn() }))

import { render, screen } from '@testing-library/react'
import { Chessboard } from 'react-chessboard'
import { GameStatus, type GameSnapshot } from '../game'
import { PlayerKind, type Player } from '../players'
import { ChessBoard } from './chess-board'

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

describe('<ChessBoard />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes the board id, position, and handlers through to Chessboard', () => {
    const onPieceDrop = vi.fn()
    const canDragPiece = vi.fn()

    render(
      <ChessBoard
        boardId="test-board"
        snapshot={buildSnapshot()}
        onPieceDrop={onPieceDrop}
        canDragPiece={canDragPiece}
        matchLabel="Test match"
        whiteName="Player 1"
        blackName="Player 2"
      />
    )

    const { options } = vi.mocked(Chessboard).mock.calls[0][0]
    if (!options) throw new Error('Chessboard was rendered without options')

    expect(options.id).toBe('test-board')
    expect(options.position).toBe('mock-fen')
    expect(options.onPieceDrop).toBe(onPieceDrop)
    expect(options.canDragPiece).toBe(canDragPiece)
  })

  it('passes boardOrientation through when given', () => {
    render(
      <ChessBoard
        boardId="test-board"
        snapshot={buildSnapshot()}
        onPieceDrop={vi.fn()}
        canDragPiece={vi.fn()}
        boardOrientation="black"
        matchLabel="Test match"
        whiteName="Player 1"
        blackName="Player 2"
      />
    )

    const { options } = vi.mocked(Chessboard).mock.calls[0][0]

    expect(options?.boardOrientation).toBe('black')
  })

  it('renders the match label and player names', () => {
    render(
      <ChessBoard
        boardId="test-board"
        snapshot={buildSnapshot()}
        onPieceDrop={vi.fn()}
        canDragPiece={vi.fn()}
        matchLabel="Test match"
        whiteName="Player 1"
        blackName="Player 2"
      />
    )

    expect(screen.getByText('Test match')).toBeInTheDocument()
    expect(screen.getByText('Player 1')).toBeInTheDocument()
    expect(screen.getByText('Player 2')).toBeInTheDocument()
  })

  it('highlights whichever side is on move', () => {
    render(
      <ChessBoard
        boardId="test-board"
        snapshot={buildSnapshot({ turn: 'b' })}
        onPieceDrop={vi.fn()}
        canDragPiece={vi.fn()}
        matchLabel="Test match"
        whiteName="Player 1"
        blackName="Player 2"
      />
    )

    expect(screen.getByText('Player 2')).toHaveClass('text-accent-700')
    expect(screen.getByText('Player 1')).toHaveClass('text-text/45')
    expect(screen.getByTestId('active-player')).toHaveTextContent('Player 2')
  })

  it('shows the status line by default, even while in progress', () => {
    render(
      <ChessBoard
        boardId="test-board"
        snapshot={buildSnapshot()}
        onPieceDrop={vi.fn()}
        canDragPiece={vi.fn()}
        matchLabel="Test match"
        whiteName="Player 1"
        blackName="Player 2"
      />
    )

    expect(screen.getByTestId('game-status')).toHaveTextContent(
      'Player 1 to move'
    )
  })

  it('hides the status line while in progress when hideStatusWhenInProgress is set', () => {
    render(
      <ChessBoard
        boardId="test-board"
        snapshot={buildSnapshot()}
        onPieceDrop={vi.fn()}
        canDragPiece={vi.fn()}
        matchLabel="Test match"
        whiteName="Player 1"
        blackName="Player 2"
        hideStatusWhenInProgress
      />
    )

    expect(screen.queryByTestId('game-status')).not.toBeInTheDocument()
  })

  it('still shows the status line when hideStatusWhenInProgress is set but the game is not in progress', () => {
    render(
      <ChessBoard
        boardId="test-board"
        snapshot={buildSnapshot({ status: GameStatus.Check })}
        onPieceDrop={vi.fn()}
        canDragPiece={vi.fn()}
        matchLabel="Test match"
        whiteName="Player 1"
        blackName="Player 2"
        hideStatusWhenInProgress
      />
    )

    expect(screen.getByTestId('game-status')).toHaveTextContent(
      'Player 1 is in check'
    )
  })
})
