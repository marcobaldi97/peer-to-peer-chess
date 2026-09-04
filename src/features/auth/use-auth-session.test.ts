import { createElement, type ReactNode } from 'react'
import { renderHook, act } from '@testing-library/react'
import { AuthContext, type AuthContextProps } from 'react-oidc-context'
import { useAuthSession } from './use-auth-session'

const authority = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123'
const clientId = 'client-123'
const domain = 'https://chess-test.auth.us-east-1.amazoncognito.com'

// Renders the hook inside a real AuthContext with a stand-in value, so the
// adapter is exercised against the actual context rather than a mocked hook.
// Passing `undefined` reproduces "rendered outside any provider".
function renderSession(auth: Partial<AuthContextProps> | undefined) {
  return renderHook(() => useAuthSession(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(
        AuthContext.Provider,
        { value: auth as AuthContextProps | undefined },
        children
      )
  })
}

function stubConfig() {
  vi.stubEnv('VITE_COGNITO_AUTHORITY', authority)
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', clientId)
  vi.stubEnv('VITE_COGNITO_DOMAIN', domain)
}

function buildUser(profile: Record<string, unknown>, idToken = 'id-token') {
  return { profile, id_token: idToken }
}

beforeEach(() => {
  stubConfig()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('useAuthSession', () => {
  it('reports an unconfigured session when rendered outside a provider', () => {
    const { result } = renderSession(undefined)

    expect(result.current.isConfigured).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.idToken).toBeNull()

    // The callbacks are inert rather than absent, so callers never need to
    // guard before wiring them to a button.
    expect(() => {
      result.current.signIn()
      result.current.signOut()
    }).not.toThrow()
  })

  it('reports an unconfigured session when the env vars are missing', () => {
    vi.unstubAllEnvs()

    const { result } = renderSession({
      isLoading: false,
      isAuthenticated: false
    })

    expect(result.current.isConfigured).toBe(false)
  })

  it('reports a signed-out but configured session', () => {
    const { result } = renderSession({
      isLoading: true,
      isAuthenticated: false
    })

    expect(result.current).toMatchObject({
      isConfigured: true,
      isLoading: true,
      isAuthenticated: false,
      email: null,
      picture: null,
      idToken: null
    })
  })

  it('exposes the email, picture and id token of a signed-in user', () => {
    const { result } = renderSession({
      isLoading: false,
      isAuthenticated: true,
      user: buildUser({
        email: 'player@example.com',
        picture: 'https://example.com/avatar.png'
      })
    } as Partial<AuthContextProps>)

    expect(result.current).toMatchObject({
      isAuthenticated: true,
      email: 'player@example.com',
      picture: 'https://example.com/avatar.png',
      idToken: 'id-token'
    })
  })

  it('falls back to null when the profile carries no email or picture', () => {
    const { result } = renderSession({
      isLoading: false,
      isAuthenticated: true,
      user: buildUser({})
    } as Partial<AuthContextProps>)

    expect(result.current.email).toBeNull()
    expect(result.current.picture).toBeNull()
  })

  it('signIn triggers the hosted UI redirect', () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined)

    renderSession({
      isLoading: false,
      isAuthenticated: false,
      signinRedirect
    }).result.current.signIn()

    expect(signinRedirect).toHaveBeenCalledTimes(1)
  })

  it('signOut clears the local user then redirects to the Cognito logout endpoint', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', {
      origin: window.location.origin,
      pathname: window.location.pathname,
      assign
    })
    const removeUser = vi.fn().mockResolvedValue(undefined)
    const { result } = renderSession({
      isLoading: false,
      isAuthenticated: true,
      removeUser
    })

    await act(async () => {
      result.current.signOut()
    })

    expect(removeUser).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith(
      expect.stringContaining(`${domain}/logout?client_id=${clientId}`)
    )
  })
})
