vi.mock('react-oidc-context', () => ({
  AuthProvider: vi.fn(({ children }: { children: ReactNode }) => (
    <div data-testid="oidc-provider">{children}</div>
  ))
}))

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { AuthProvider as OidcAuthProvider } from 'react-oidc-context'
import { AuthProvider } from './auth-provider'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('<AuthProvider />', () => {
  it('renders children without an OIDC provider when Cognito is not configured', () => {
    render(
      <AuthProvider>
        <span>app</span>
      </AuthProvider>
    )

    expect(screen.getByText('app')).toBeInTheDocument()
    expect(screen.queryByTestId('oidc-provider')).not.toBeInTheDocument()
    expect(OidcAuthProvider).not.toHaveBeenCalled()
  })

  it('wraps children in the OIDC provider when Cognito is configured', () => {
    const authority =
      'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123'
    vi.stubEnv('VITE_COGNITO_AUTHORITY', authority)
    vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'client-123')
    vi.stubEnv(
      'VITE_COGNITO_DOMAIN',
      'https://chess-test.auth.us-east-1.amazoncognito.com'
    )

    render(
      <AuthProvider>
        <span>app</span>
      </AuthProvider>
    )

    expect(screen.getByTestId('oidc-provider')).toBeInTheDocument()
    expect(screen.getByText('app')).toBeInTheDocument()
    expect(vi.mocked(OidcAuthProvider).mock.calls[0][0]).toMatchObject({
      authority,
      client_id: 'client-123',
      response_type: 'code'
    })
  })
})
