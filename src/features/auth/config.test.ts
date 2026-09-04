import {
  buildLogoutUrl,
  buildOidcConfig,
  getAuthConfig,
  getRedirectUri
} from './config'

const config = {
  authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123',
  clientId: 'client-123',
  domain: 'https://chess-test.auth.us-east-1.amazoncognito.com'
}

function stubEnv(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    VITE_COGNITO_AUTHORITY: config.authority,
    VITE_COGNITO_CLIENT_ID: config.clientId,
    VITE_COGNITO_DOMAIN: config.domain,
    ...overrides
  }

  Object.entries(values).forEach(([key, value]) => vi.stubEnv(key, value))
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getAuthConfig', () => {
  it('returns the config when every variable is set', () => {
    stubEnv()

    expect(getAuthConfig()).toEqual(config)
  })

  it.each([
    'VITE_COGNITO_AUTHORITY',
    'VITE_COGNITO_CLIENT_ID',
    'VITE_COGNITO_DOMAIN'
  ])('returns null when %s is missing', (missing) => {
    stubEnv({ [missing]: '' })

    expect(getAuthConfig()).toBeNull()
  })
})

describe('getRedirectUri', () => {
  it('is the current origin with a trailing slash', () => {
    expect(getRedirectUri()).toBe(`${window.location.origin}/`)
  })
})

describe('buildOidcConfig', () => {
  it('requests an authorization code with the OIDC profile scopes', () => {
    const oidcConfig = buildOidcConfig(config)

    expect(oidcConfig).toMatchObject({
      authority: config.authority,
      client_id: config.clientId,
      redirect_uri: `${window.location.origin}/`,
      response_type: 'code',
      scope: 'openid email profile',
      monitorSession: false
    })
  })

  it('strips the auth query params once the callback has been handled', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState')

    buildOidcConfig(config).onSigninCallback?.(undefined)

    expect(replaceState).toHaveBeenCalledWith(
      {},
      document.title,
      window.location.pathname
    )

    replaceState.mockRestore()
  })
})

describe('buildLogoutUrl', () => {
  it("points at Cognito's non-standard logout endpoint with an encoded return URI", () => {
    const url = new URL(buildLogoutUrl(config))

    expect(url.origin + url.pathname).toBe(`${config.domain}/logout`)
    expect(url.searchParams.get('client_id')).toBe(config.clientId)
    expect(url.searchParams.get('logout_uri')).toBe(
      `${window.location.origin}/`
    )
  })
})
