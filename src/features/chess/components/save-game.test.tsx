import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    ...overrides
  }
}

function fillEmail(value: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value } })
}

describe('<SaveGame />', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing while the game is still in progress', () => {
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

  it('renders once the game is over', () => {
    render(<SaveGame snapshot={buildSnapshot()} />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /save game/i })
    ).toBeInTheDocument()
  })

  it('shows an inline error for an invalid email and keeps the button disabled', () => {
    render(<SaveGame snapshot={buildSnapshot()} />)

    fillEmail('not-an-email')
    fireEvent.blur(screen.getByLabelText('Email'))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save game/i })).toBeDisabled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('enables the button once a valid email is entered', () => {
    render(<SaveGame snapshot={buildSnapshot()} />)

    fillEmail('player@example.com')

    expect(
      screen.getByRole('button', { name: /save game/i })
    ).not.toBeDisabled()
    expect(
      screen.queryByText('Enter a valid email address.')
    ).not.toBeInTheDocument()
  })

  it('POSTs the expected payload to the API on submit', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
    const snapshot = buildSnapshot({
      status: GameStatus.Stalemate,
      pgn: '1. e4 e5 draw pgn'
    })

    render(<SaveGame snapshot={snapshot} />)

    fillEmail('player@example.com')
    fireEvent.click(screen.getByRole('button', { name: /save game/i }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('http://localhost:3000/saved-games')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json'
    })

    const body = JSON.parse(options?.body as string)
    expect(body).toMatchObject({
      email: 'player@example.com',
      pgn: '1. e4 e5 draw pgn',
      status: GameStatus.Stalemate
    })
    expect(typeof body.playedAt).toBe('string')
    expect(() => new Date(body.playedAt).toISOString()).not.toThrow()
  })

  it('shows a saving state while the request is pending, then success', async () => {
    let resolveFetch: (value: Response) => void = () => {}
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )

    render(<SaveGame snapshot={buildSnapshot()} />)

    fillEmail('player@example.com')
    fireEvent.click(screen.getByRole('button', { name: /save game/i }))

    expect(
      await screen.findByRole('button', { name: /saving/i })
    ).toBeDisabled()

    resolveFetch({ ok: true } as Response)

    expect(await screen.findByTestId('save-game-success')).toHaveTextContent(
      'Game saved!'
    )
  })

  it('shows an error state when the request fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    render(<SaveGame snapshot={buildSnapshot()} />)

    fillEmail('player@example.com')
    fireEvent.click(screen.getByRole('button', { name: /save game/i }))

    expect(await screen.findByTestId('save-game-error')).toHaveTextContent(
      'Could not save the game. Please try again.'
    )
  })

  it('shows an error state when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response)

    render(<SaveGame snapshot={buildSnapshot()} />)

    fillEmail('player@example.com')
    fireEvent.click(screen.getByRole('button', { name: /save game/i }))

    expect(await screen.findByTestId('save-game-error')).toBeInTheDocument()
  })

  it('clears a prior success/error state when the email is edited again', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)

    render(<SaveGame snapshot={buildSnapshot()} />)

    fillEmail('player@example.com')
    fireEvent.click(screen.getByRole('button', { name: /save game/i }))

    expect(await screen.findByTestId('save-game-success')).toBeInTheDocument()

    fillEmail('player2@example.com')

    expect(screen.queryByTestId('save-game-success')).not.toBeInTheDocument()
  })
})
