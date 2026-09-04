import { useState } from 'react'
import { Button } from 'components/ui/button'
import { useAuthSession } from 'features/auth'
import type { GameSnapshot } from '../game'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

type SaveStatus = 'idle' | 'saving' | 'success' | 'error' | 'expired'

type SaveGameProps = {
  snapshot: GameSnapshot
}

function SignInPrompt({
  message,
  testId,
  isLoading,
  onSignIn
}: {
  message: string
  testId?: string
  isLoading: boolean
  onSignIn: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p data-testid={testId} className="text-[13px] text-text/55">
        {message}
      </p>
      <Button
        type="button"
        variant="primary"
        disabled={isLoading}
        onClick={onSignIn}
      >
        Sign in
      </Button>
    </div>
  )
}

export function SaveGame({ snapshot }: SaveGameProps) {
  const { isConfigured, isLoading, isAuthenticated, idToken, signIn } =
    useAuthSession()
  const [status, setStatus] = useState<SaveStatus>('idle')

  if (!snapshot.isGameOver) return null

  // Nothing to offer when this build has no Cognito configured.
  if (!isConfigured) return null

  if (!isAuthenticated) {
    return (
      <SignInPrompt
        message="Sign in to save this game."
        isLoading={isLoading}
        onSignIn={signIn}
      />
    )
  }

  const handleSave = async (): Promise<void> => {
    setStatus('saving')

    try {
      const response = await fetch(`${API_BASE_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          pgn: snapshot.pgn,
          status: snapshot.status,
          playedAt: new Date().toISOString()
        })
      })

      // ID tokens last an hour, so an expired one is a realistic failure — and
      // the fix is to sign in again, not to retry.
      if (response.status === 401) {
        setStatus('expired')

        return
      }

      if (!response.ok) throw new Error('Failed to save game')

      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'expired') {
    return (
      <SignInPrompt
        message="Your session expired. Sign in to save this game."
        testId="save-game-expired"
        isLoading={isLoading}
        onSignIn={signIn}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="primary"
        size="block"
        disabled={status === 'saving'}
        onClick={handleSave}
      >
        {status === 'saving' ? 'Saving…' : 'Save Game'}
      </Button>

      {status === 'success' && (
        <p data-testid="save-game-success" className="text-[13px] text-text/55">
          Game saved!
        </p>
      )}
      {status === 'error' && (
        <p
          data-testid="save-game-error"
          className="text-[13px] text-accent-700"
        >
          Could not save the game. Please try again.
        </p>
      )}
    </div>
  )
}
