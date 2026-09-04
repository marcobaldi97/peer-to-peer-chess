vi.mock('react-sounds', async () => {
  const { useState } = await import('react')
  return {
    playSound: vi.fn(),
    SoundProvider: ({ children }: { children: unknown }) => children,
    useSoundEnabled: () => useState(true)
  }
})
vi.mock('features/chess/peer-connection', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('features/chess/peer-connection')>()
  return { ...actual, hostGame: vi.fn(), joinGame: vi.fn() }
})

import { render, screen, act, fireEvent } from '@testing-library/react'
import {
  ConnectionStatus,
  joinGame,
  type ConnectionSnapshot,
  type PeerConnection
} from 'features/chess/peer-connection'
import App from './app'

function createFakeConnection(): {
  connection: PeerConnection
  setSnapshot: (partial: Partial<ConnectionSnapshot>) => void
} {
  let snapshot: ConnectionSnapshot = {
    status: ConnectionStatus.Connecting,
    localPeerId: null,
    errorMessage: null
  }
  const listeners = new Set<() => void>()

  const connection = {
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }),
    getSnapshot: vi.fn(() => snapshot),
    onMove: vi.fn(() => vi.fn()),
    onReset: vi.fn(() => vi.fn()),
    onResign: vi.fn(() => vi.fn()),
    sendMove: vi.fn(),
    sendReset: vi.fn(),
    sendResign: vi.fn(),
    close: vi.fn()
  } as unknown as PeerConnection

  return {
    connection,
    setSnapshot: (partial) => {
      snapshot = { ...snapshot, ...partial }
      listeners.forEach((listener) => listener())
    }
  }
}

describe('<App /> routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.pushState({}, '', '/')
  })

  it('auto-joins the peer from /join/:peerId', () => {
    const { connection } = createFakeConnection()
    vi.mocked(joinGame).mockReturnValue(connection)
    window.history.pushState({}, '', '/join/abc123')

    render(<App />)

    expect(joinGame).toHaveBeenCalledWith('abc123')
    expect(screen.getByTestId('connection-status')).toHaveTextContent(
      'Connecting…'
    )
  })

  it('stays connected and on the join URL once the auto-joined connection succeeds, instead of unmounting back to the home route', () => {
    const { connection, setSnapshot } = createFakeConnection()
    vi.mocked(joinGame).mockReturnValue(connection)
    window.history.pushState({}, '', '/join/abc123')

    render(<App />)
    act(() => setSnapshot({ status: ConnectionStatus.Connected }))

    expect(window.location.pathname).toBe('/join/abc123')
    expect(screen.getByTestId('game-status')).toHaveTextContent(
      'Opponent to move'
    )
    expect(screen.queryByTestId('connection-status')).not.toBeInTheDocument()
  })

  it('navigates back to / when an auto-joined connection is cancelled instead of succeeding', () => {
    const { connection, setSnapshot } = createFakeConnection()
    vi.mocked(joinGame).mockReturnValue(connection)
    window.history.pushState({}, '', '/join/abc123')

    render(<App />)
    act(() => setSnapshot({ status: ConnectionStatus.Connecting }))
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(window.location.pathname).toBe('/')
  })

  it('renders the app for an unknown path via the catch-all route', () => {
    window.history.pushState({}, '', '/some/random/path')

    render(<App />)

    expect(
      screen.getByRole('button', { name: /new game/i })
    ).toBeInTheDocument()
  })
})
