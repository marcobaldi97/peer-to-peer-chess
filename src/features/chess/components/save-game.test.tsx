vi.mock('features/auth', () => ({ useAuthSession: vi.fn() }))

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuthSession, type AuthSession } from 'features/auth'
import { GameStatus, type GameSnapshot } from '../game'
import { PlayerKind, type Player } from '../players'
import { SaveGame } from './save-game'

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
    status: GameStatus.Checkmate,
    isGameOver: true,
    players: buildPlayers(),
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#',
    history: [],
    winner: null,
    ...overrides
  }
}

function mockSession(overrides: Partial<AuthSession> = {}) {
  const signIn = vi.fn()

  vi.mocked(useAuthSession).mockReturnValue({
    isConfigured: true,
    isLoading: false,
    isAuthenticated: true,
    email: 'player@example.com',
    picture: null,
    idToken: 'test-id-token',
    signIn,
    signOut: vi.fn(),
    ...overrides
  })

  return { signIn }
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /save game/i }))
}

describe('<SaveGame />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing while the game is still in progress', () => {
    mockSession()

    const { container } = render(
      <SaveGame
        snapshot={buildSnapshot({
          status: GameStatus.InProgress,
          isGameOver: false
        })}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when Cognito is not configured for this build', () => {
    mockSession({ isConfigured: false })

    const { container } = render(<SaveGame snapshot={buildSnapshot()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('asks a signed-out player to sign in instead of collecting an email', () => {
    const { signIn } = mockSession({ isAuthenticated: false })

    render(<SaveGame snapshot={buildSnapshot()} />)

    expect(screen.getByText('Sign in to save this game.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(signIn).toHaveBeenCalledTimes(1)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('disables the sign in button while the session is still loading', () => {
    mockSession({ isAuthenticated: false, isLoading: true })

    render(<SaveGame snapshot={buildSnapshot()} />)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
  })

  it('offers a save button with no email field once signed in', () => {
    mockSession()

    render(<SaveGame snapshot={buildSnapshot()} />)

    expect(
      screen.getByRole('button', { name: /save game/i })
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('POSTs the game with a bearer token and no email in the body', async () => {
    mockSession()
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 201 } as Response)

    render(
      <SaveGame
        snapshot={buildSnapshot({
          status: GameStatus.Stalemate,
          pgn: '1. e4 e5 draw pgn'
        })}
      />
    )

    clickSave()

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://localhost:3000/games')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-id-token'
    })

    const body = JSON.parse(options?.body as string)
    expect(body).toMatchObject({
      pgn: '1. e4 e5 draw pgn',
      status: GameStatus.Stalemate
    })
    expect(body).not.toHaveProperty('email')
    expect(() => new Date(body.playedAt).toISOString()).not.toThrow()
  })

  it('shows a saving state while the request is pending, then success', async () => {
    mockSession()
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    render(<SaveGame snapshot={buildSnapshot()} />)

    clickSave()

    expect(
      await screen.findByRole('button', { name: /saving/i })
    ).toBeDisabled()

    resolveFetch({ ok: true, status: 201 } as Response)

    expect(await screen.findByTestId('save-game-success')).toHaveTextContent(
      'Game saved!'
    )
  })

  it('shows an error state when the request fails', async () => {
    mockSession()
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    render(<SaveGame snapshot={buildSnapshot()} />)

    clickSave()

    expect(await screen.findByTestId('save-game-error')).toHaveTextContent(
      'Could not save the game. Please try again.'
    )
  })

  it('shows an error state when the response is not ok', async () => {
    mockSession()
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)

    render(<SaveGame snapshot={buildSnapshot()} />)

    clickSave()

    expect(await screen.findByTestId('save-game-error')).toBeInTheDocument()
  })

  it('asks the player to sign in again when the token has expired', async () => {
    const { signIn } = mockSession()
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response)

    render(<SaveGame snapshot={buildSnapshot()} />)

    clickSave()

    expect(await screen.findByTestId('save-game-expired')).toHaveTextContent(
      'Your session expired. Sign in to save this game.'
    )

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(signIn).toHaveBeenCalledTimes(1)
  })
})
