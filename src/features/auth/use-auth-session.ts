import { useContext } from 'react'
import { AuthContext } from 'react-oidc-context'
import { buildLogoutUrl, getAuthConfig } from './config'

export type AuthSession = {
  isConfigured: boolean
  isLoading: boolean
  isAuthenticated: boolean
  email: string | null
  picture: string | null
  idToken: string | null
  signIn: () => void
  signOut: () => void
}

const noop = (): void => {}

const SIGNED_OUT: AuthSession = {
  isConfigured: false,
  isLoading: false,
  isAuthenticated: false,
  email: null,
  picture: null,
  idToken: null,
  signIn: noop,
  signOut: noop
}

// The only place in the app that touches react-oidc-context. Keeping the
// library behind this adapter gives consumers a single mock point and keeps
// the Context an implementation detail, since the rest of the codebase shares
// state through observable stores instead.
export function useAuthSession(): AuthSession {
  // Read the context directly rather than through useAuth(): outside a provider
  // the context is undefined — which is exactly the "Cognito not configured"
  // case — and useAuth() both mistypes that as non-undefined and logs a console
  // warning every time it happens.
  const auth = useContext(AuthContext)
  const config = getAuthConfig()

  if (!auth || !config) return SIGNED_OUT

  return {
    isConfigured: true,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    email:
      typeof auth.user?.profile.email === 'string'
        ? auth.user.profile.email
        : null,
    picture:
      typeof auth.user?.profile.picture === 'string'
        ? auth.user.profile.picture
        : null,
    idToken: auth.user?.id_token ?? null,
    signIn: () => void auth.signinRedirect(),
    signOut: () => {
      // Clear local tokens first, then bounce through Cognito's non-standard
      // /logout endpoint to drop its session cookie.
      void auth.removeUser().then(() => {
        window.location.assign(buildLogoutUrl(config))
      })
    }
  }
}
