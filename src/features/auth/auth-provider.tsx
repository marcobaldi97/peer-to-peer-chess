import { useMemo, type ReactNode } from 'react'
import { AuthProvider as OidcAuthProvider } from 'react-oidc-context'
import { buildOidcConfig, getAuthConfig } from './config'

export function AuthProvider({ children }: { children: ReactNode }) {
  // Memoised so the underlying UserManager is not rebuilt on every render.
  const oidcConfig = useMemo(() => {
    const config = getAuthConfig()

    return config ? buildOidcConfig(config) : null
  }, [])

  if (!oidcConfig) return <>{children}</>

  return <OidcAuthProvider {...oidcConfig}>{children}</OidcAuthProvider>
}
