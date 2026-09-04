import type { AuthProviderProps } from 'react-oidc-context'

export type AuthConfig = {
  authority: string
  clientId: string
  domain: string
}

// Read inside the function rather than at module scope so tests can stub the
// environment with vi.stubEnv — module-scope reads are captured at import time.
//
// Returns null when anything is missing, which cascades into the auth UI and
// the save-game form rendering nothing. That keeps `pnpm dev` and the whole
// test suite working with no AWS setup, and turns a forgotten CI variable into
// a missing sign-in button rather than a crash on load.
export function getAuthConfig(): AuthConfig | null {
  const authority = import.meta.env.VITE_COGNITO_AUTHORITY
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
  const domain = import.meta.env.VITE_COGNITO_DOMAIN

  if (!authority || !clientId || !domain) return null

  return { authority, clientId, domain }
}

// Derived from the current origin rather than a fourth env var, so one build
// works on both localhost and the deployed site. The trailing slash matters:
// Cognito matches callback and logout URLs exactly.
export function getRedirectUri(): string {
  return `${window.location.origin}/`
}

export function buildOidcConfig(config: AuthConfig): AuthProviderProps {
  return {
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    // Cognito does not implement the OIDC session-management iframe.
    monitorSession: false,
    onSigninCallback: () => {
      // Strip ?code=&state= from the URL once the exchange is done. Only the
      // search string is cleared, so React Router's history stays consistent.
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }
}

// Cognito's discovery document publishes no end_session_endpoint, so the
// standard signoutRedirect() throws and logout has to be built by hand.
// Skipping this and only clearing local tokens would leave the Cognito session
// cookie intact, silently re-authenticating the same user on the next sign-in.
export function buildLogoutUrl(config: AuthConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: getRedirectUri()
  })

  return `${config.domain}/logout?${params.toString()}`
}
