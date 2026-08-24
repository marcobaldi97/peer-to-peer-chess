vi.mock('../peer-connection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../peer-connection')>()
  return { ...actual, hostGame: vi.fn(), joinGame: vi.fn() }
})

import { render, screen, fireEvent, act } from '@testing-library/react'
import {
  ConnectionStatus,
  hostGame,
  joinGame,
  type ConnectionSnapshot,
  type PeerConnection
} from '../peer-connection'
import OnlineLobby from './online-lobby'

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

describe('<OnlineLobby />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true
    })
  })

  it('renders the create/join menu by default', () => {
    render(<OnlineLobby onConnected={vi.fn()} />)

    expect(
      screen.getByRole('button', { name: /create game/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /join game/i })
    ).toBeInTheDocument()
  })

  describe('creating a game', () => {
    it('calls hostGame and shows the share link once the peer opens', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(hostGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /create game/i }))

      expect(hostGame).toHaveBeenCalledTimes(1)

      act(() =>
        setSnapshot({ status: ConnectionStatus.Waiting, localPeerId: 'abc123' })
      )

      expect(screen.getByTestId('invite-link')).toHaveTextContent(
        /\/join\/abc123$/
      )
      expect(screen.getByText(/Or share this code: abc123/)).toBeInTheDocument()
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Waiting for your opponent to join'
      )
    })

    it('copies the invite link to the clipboard', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(hostGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /create game/i }))
      act(() =>
        setSnapshot({ status: ConnectionStatus.Waiting, localPeerId: 'abc123' })
      )
      fireEvent.click(screen.getByRole('button', { name: /copy invite link/i }))

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/join/abc123')
      )
    })

    it('calls onConnected with the host connection and White once connected', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(hostGame).mockReturnValue(connection)
      const onConnected = vi.fn()
      render(<OnlineLobby onConnected={onConnected} />)

      fireEvent.click(screen.getByRole('button', { name: /create game/i }))
      act(() => setSnapshot({ status: ConnectionStatus.Connected }))

      expect(onConnected).toHaveBeenCalledWith(connection, 'w')
    })

    it('cancelling while waiting closes the connection and returns to the menu', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(hostGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /create game/i }))
      act(() =>
        setSnapshot({ status: ConnectionStatus.Waiting, localPeerId: 'abc123' })
      )
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(connection.close).toHaveBeenCalledTimes(1)
      expect(
        screen.getByRole('button', { name: /create game/i })
      ).toBeInTheDocument()
    })
  })

  describe('joining a game', () => {
    it('does nothing when submitting a blank code', () => {
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /join game/i }))
      fireEvent.click(screen.getByRole('button', { name: /^join$/i }))

      expect(joinGame).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/game code/i)).toBeInTheDocument()
    })

    it('calls joinGame with the trimmed code and shows Connecting', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(joinGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /join game/i }))
      fireEvent.change(screen.getByLabelText(/game code/i), {
        target: { value: '  xyz789  ' }
      })
      fireEvent.click(screen.getByRole('button', { name: /^join$/i }))

      expect(joinGame).toHaveBeenCalledWith('xyz789')

      act(() => setSnapshot({ status: ConnectionStatus.Connecting }))

      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Connecting…'
      )
    })

    it('calls onConnected with the joined connection and Black once connected', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(joinGame).mockReturnValue(connection)
      const onConnected = vi.fn()
      render(<OnlineLobby onConnected={onConnected} />)

      fireEvent.click(screen.getByRole('button', { name: /join game/i }))
      fireEvent.change(screen.getByLabelText(/game code/i), {
        target: { value: 'xyz789' }
      })
      fireEvent.click(screen.getByRole('button', { name: /^join$/i }))
      act(() => setSnapshot({ status: ConnectionStatus.Connected }))

      expect(onConnected).toHaveBeenCalledWith(connection, 'b')
    })

    it('the Back button returns to the menu without connecting', () => {
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /join game/i }))
      fireEvent.click(screen.getByRole('button', { name: /back/i }))

      expect(
        screen.getByRole('button', { name: /create game/i })
      ).toBeInTheDocument()
      expect(joinGame).not.toHaveBeenCalled()
    })
  })

  describe('connection failures', () => {
    it('shows the disconnected message and returns to the menu on retry', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(hostGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /create game/i }))
      act(() => setSnapshot({ status: ConnectionStatus.Disconnected }))

      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'The connection was closed.'
      )

      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      expect(connection.close).toHaveBeenCalledTimes(1)
      expect(
        screen.getByRole('button', { name: /create game/i })
      ).toBeInTheDocument()
    })

    it('shows the error message when one is provided', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(hostGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /create game/i }))
      act(() =>
        setSnapshot({
          status: ConnectionStatus.Error,
          errorMessage: 'peer unreachable'
        })
      )

      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'peer unreachable'
      )
    })

    it('falls back to a generic message when the error has none', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(hostGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /create game/i }))
      act(() => setSnapshot({ status: ConnectionStatus.Error }))

      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'Connection failed.'
      )
    })
  })

  describe('auto-joining from an invite link', () => {
    it('does not call joinGame when no autoJoinPeerId is given', () => {
      render(<OnlineLobby onConnected={vi.fn()} />)

      expect(joinGame).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: /create game/i })
      ).toBeInTheDocument()
    })

    it('joins automatically without requiring a button click', () => {
      const { connection } = createFakeConnection()
      vi.mocked(joinGame).mockReturnValue(connection)
      render(<OnlineLobby onConnected={vi.fn()} autoJoinPeerId="xyz789" />)

      expect(joinGame).toHaveBeenCalledTimes(1)
      expect(joinGame).toHaveBeenCalledWith('xyz789')
      expect(
        screen.queryByRole('button', { name: /create game/i })
      ).not.toBeInTheDocument()
    })

    it('calls onConnected and onAutoJoinSettled once connected', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(joinGame).mockReturnValue(connection)
      const onConnected = vi.fn()
      const onAutoJoinSettled = vi.fn()
      render(
        <OnlineLobby
          onConnected={onConnected}
          autoJoinPeerId="xyz789"
          onAutoJoinSettled={onAutoJoinSettled}
        />
      )

      act(() => setSnapshot({ status: ConnectionStatus.Connected }))

      expect(onConnected).toHaveBeenCalledWith(connection, 'b')
      expect(onAutoJoinSettled).toHaveBeenCalledWith(true)
    })

    it('calls onAutoJoinSettled when cancelling an auto-join', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(joinGame).mockReturnValue(connection)
      const onAutoJoinSettled = vi.fn()
      render(
        <OnlineLobby
          onConnected={vi.fn()}
          autoJoinPeerId="xyz789"
          onAutoJoinSettled={onAutoJoinSettled}
        />
      )
      act(() => setSnapshot({ status: ConnectionStatus.Connecting }))

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(connection.close).toHaveBeenCalledTimes(1)
      expect(onAutoJoinSettled).toHaveBeenCalledWith(false)
      expect(
        screen.getByRole('button', { name: /create game/i })
      ).toBeInTheDocument()
    })

    it('calls onAutoJoinSettled when retrying after a failed auto-join', () => {
      const { connection, setSnapshot } = createFakeConnection()
      vi.mocked(joinGame).mockReturnValue(connection)
      const onAutoJoinSettled = vi.fn()
      render(
        <OnlineLobby
          onConnected={vi.fn()}
          autoJoinPeerId="xyz789"
          onAutoJoinSettled={onAutoJoinSettled}
        />
      )
      act(() =>
        setSnapshot({
          status: ConnectionStatus.Error,
          errorMessage: 'peer unreachable'
        })
      )

      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      expect(onAutoJoinSettled).toHaveBeenCalledWith(false)
    })
  })
})
