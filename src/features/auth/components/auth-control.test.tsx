vi.mock('../use-auth-session', () => ({ useAuthSession: vi.fn() }))

import { render, screen, fireEvent } from '@testing-library/react'
import { useAuthSession, type AuthSession } from '../use-auth-session'
import { AuthControl } from './auth-control'

function mockSession(overrides: Partial<AuthSession> = {}) {
  vi.mocked(useAuthSession).mockReturnValue({
    isConfigured: true,
    isLoading: false,
    isAuthenticated: false,
    email: null,
    picture: null,
    idToken: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('<AuthControl />', () => {
  it('renders nothing when Cognito is not configured', () => {
    mockSession({ isConfigured: false })

    const { container } = render(<AuthControl size="icon" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('offers a sign in button when signed out', () => {
    const signIn = vi.fn()
    mockSession({ signIn })

    render(<AuthControl size="icon" />)

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(signIn).toHaveBeenCalledTimes(1)
  })

  it('disables the sign in button while the session is loading', () => {
    mockSession({ isLoading: true })

    render(<AuthControl size="icon" />)

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled()
  })

  it('shows a placeholder avatar and a sign out button when signed in without a picture', () => {
    const signOut = vi.fn()
    mockSession({
      isAuthenticated: true,
      email: 'player@example.com',
      signOut
    })

    render(<AuthControl size="icon-lg" />)

    expect(screen.getByTestId('empty-avatar')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('labels the avatar generically when the token carries no email claim', () => {
    mockSession({
      isAuthenticated: true,
      email: null,
      picture: 'https://example.com/avatar.png'
    })

    render(<AuthControl size="icon" />)

    expect(screen.getByRole('img', { name: 'Signed in' })).toBeInTheDocument()
  })

  it('shows the profile picture when the identity provider supplied one', () => {
    mockSession({
      isAuthenticated: true,
      email: 'player@example.com',
      picture: 'https://example.com/avatar.png'
    })

    render(<AuthControl size="icon" />)

    expect(
      screen.getByRole('img', { name: 'player@example.com' })
    ).toHaveAttribute('src', 'https://example.com/avatar.png')
    expect(screen.queryByTestId('empty-avatar')).not.toBeInTheDocument()
  })
})
