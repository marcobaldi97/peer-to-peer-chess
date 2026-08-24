vi.mock('./online-lobby', () => ({ default: vi.fn() }))
vi.mock('./use-net-game', () => ({ useNetGame: vi.fn() }))
vi.mock('react-chessboard', () => ({ Chessboard: vi.fn(() => null) }))
vi.mock('react-sounds', () => ({ playSound: vi.fn() }))

import { render, screen, fireEvent } from '@testing-library/react'
import { Chessboard } from 'react-chessboard'
import { GameStatus, type GameSnapshot } from './game'
import { PlayerKind, type Player } from './players'
import { ConnectionStatus, type PeerConnection } from './peer-connection'
import { useNetGame } from './use-net-game'
import OnlineLobby from './online-lobby'
import OnlineChessGame from './online-chess-game'

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

type ConnectionSnapshotOverrides = Partial<
  ReturnType<PeerConnection['getSnapshot']>
>

function createFakeConnection(
  overrides: ConnectionSnapshotOverrides = {}
): PeerConnection {
  const snapshot = {
    status: ConnectionStatus.Connected,
    localPeerId: null,
    errorMessage: null,
    ...overrides
  }

  return {
    subscribe: vi.fn(() => vi.fn()),
    getSnapshot: vi.fn(() => snapshot),
    close: vi.fn()
  } as unknown as PeerConnection
}

function mockLobbyToConnect(connection: PeerConnection, localColor: 'w' | 'b') {
  vi.mocked(OnlineLobby).mockImplementation(({ onConnected }) => (
    <button onClick={() => onConnected(connection, localColor)}>connect</button>
  ))
}

describe('<OnlineChessGame />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNetGame).mockReturnValue({
      snapshot: buildSnapshot(),
      onPieceDrop: vi.fn(),
      canDragPiece: vi.fn(),
      newGame: vi.fn()
    })
  })

  it('renders the lobby until a connection is established', () => {
    vi.mocked(OnlineLobby).mockImplementation(() => <div>lobby</div>)

    render(<OnlineChessGame />)

    expect(screen.getByText('lobby')).toBeInTheDocument()
  })

  it('renders the network board once the lobby connects', () => {
    const connection = createFakeConnection()
    mockLobbyToConnect(connection, 'w')
    render(<OnlineChessGame />)

    fireEvent.click(screen.getByText('connect'))

    expect(screen.getByTestId('game-status')).toHaveTextContent('You to move')
    expect(useNetGame).toHaveBeenCalledWith(connection, 'w')
  })

  it('orients the board for the local color', () => {
    const connection = createFakeConnection()
    mockLobbyToConnect(connection, 'b')
    render(<OnlineChessGame />)

    fireEvent.click(screen.getByText('connect'))

    const { options } = vi.mocked(Chessboard).mock.calls[0][0]
    expect(options?.boardOrientation).toBe('black')
  })

  it('shows a generic disconnected message when none is provided', () => {
    const connection = createFakeConnection({
      status: ConnectionStatus.Disconnected
    })
    mockLobbyToConnect(connection, 'w')
    render(<OnlineChessGame />)

    fireEvent.click(screen.getByText('connect'))

    expect(screen.getByTestId('connection-status')).toHaveTextContent(
      'Opponent disconnected.'
    )
  })

  it('shows the specific error message when one is provided', () => {
    const connection = createFakeConnection({
      status: ConnectionStatus.Error,
      errorMessage: 'peer unreachable'
    })
    mockLobbyToConnect(connection, 'w')
    render(<OnlineChessGame />)

    fireEvent.click(screen.getByText('connect'))

    expect(screen.getByTestId('connection-status')).toHaveTextContent(
      'peer unreachable'
    )
  })

  it('highlights black when it is their move', () => {
    vi.mocked(useNetGame).mockReturnValue({
      snapshot: buildSnapshot({ turn: 'b' }),
      onPieceDrop: vi.fn(),
      canDragPiece: vi.fn(),
      newGame: vi.fn()
    })
    const connection = createFakeConnection()
    mockLobbyToConnect(connection, 'w')
    render(<OnlineChessGame />)

    fireEvent.click(screen.getByText('connect'))

    expect(screen.getByText('Opponent')).toHaveClass('text-accent-700')
    expect(screen.getByText('You')).toHaveClass('text-text/45')
  })

  it('does not show a connection banner while connected', () => {
    const connection = createFakeConnection()
    mockLobbyToConnect(connection, 'w')
    render(<OnlineChessGame />)

    fireEvent.click(screen.getByText('connect'))

    expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument()
  })

  it('New Game calls newGame from the hook', () => {
    const newGame = vi.fn()
    vi.mocked(useNetGame).mockReturnValue({
      snapshot: buildSnapshot(),
      onPieceDrop: vi.fn(),
      canDragPiece: vi.fn(),
      newGame
    })
    const connection = createFakeConnection()
    mockLobbyToConnect(connection, 'w')
    render(<OnlineChessGame />)
    fireEvent.click(screen.getByText('connect'))

    fireEvent.click(screen.getByRole('button', { name: /new game/i }))

    expect(newGame).toHaveBeenCalled()
  })

  it('Leave Game closes the connection and returns to the lobby', () => {
    const connection = createFakeConnection()
    mockLobbyToConnect(connection, 'w')
    render(<OnlineChessGame />)
    fireEvent.click(screen.getByText('connect'))

    fireEvent.click(screen.getByRole('button', { name: /leave game/i }))

    expect(connection.close).toHaveBeenCalledTimes(1)
    expect(screen.getByText('connect')).toBeInTheDocument()
  })

  it('forwards invitePeerId/onInviteSettled to the lobby as autoJoinPeerId/onAutoJoinSettled', () => {
    vi.mocked(OnlineLobby).mockImplementation(() => <div>lobby</div>)
    const onInviteSettled = vi.fn()

    render(
      <OnlineChessGame
        invitePeerId="abc123"
        onInviteSettled={onInviteSettled}
      />
    )

    const props = vi.mocked(OnlineLobby).mock.calls[0][0]
    expect(props.autoJoinPeerId).toBe('abc123')

    props.onAutoJoinSettled?.(true)

    expect(onInviteSettled).toHaveBeenCalledWith(true)
  })
})
