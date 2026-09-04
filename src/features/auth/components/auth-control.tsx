import { LogIn, LogOut } from 'lucide-react'
import { Button } from 'components/ui/button'
import Avatar from 'components/avatar'
import { useAuthSession } from '../use-auth-session'

type AuthControlProps = {
  size: 'icon' | 'icon-lg'
}

export function AuthControl({ size }: AuthControlProps) {
  const {
    isConfigured,
    isLoading,
    isAuthenticated,
    email,
    picture,
    signIn,
    signOut
  } = useAuthSession()

  // Nothing to show when Cognito is not configured for this build.
  if (!isConfigured) return null

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Avatar
          size="small"
          src={picture ?? undefined}
          alt={email ?? 'Signed in'}
        />
        <Button
          type="button"
          variant="secondary"
          size={size}
          aria-label="Sign out"
          onClick={signOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
        </Button>
      </div>
    )
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      aria-label="Sign in"
      disabled={isLoading}
      onClick={signIn}
    >
      <LogIn className="h-[18px] w-[18px]" />
    </Button>
  )
}
