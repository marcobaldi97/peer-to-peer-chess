import { useState, type FormEvent } from 'react'
import { Button } from 'components/ui/button'
import { Input } from 'components/ui/input'
import type { GameSnapshot } from '../game'

// No auth yet — the backend takes this email as a stand-in identity.
// A future iteration should swap it for an authenticated user (AWS Cognito).
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

type SaveGameProps = {
  snapshot: GameSnapshot
}

export function SaveGame({ snapshot }: SaveGameProps) {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<SaveStatus>('idle')

  if (!snapshot.isGameOver) return null

  const isEmailValid = EMAIL_PATTERN.test(email)
  const showEmailError = touched && !isEmailValid

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)

    if (!isEmailValid) return

    setStatus('saving')

    try {
      const response = await fetch(`${API_BASE_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          pgn: snapshot.pgn,
          status: snapshot.status,
          playedAt: new Date().toISOString()
        })
      })

      if (!response.ok) throw new Error('Failed to save game')

      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setStatus('idle')
          }}
          onBlur={() => setTouched(true)}
          placeholder="you@example.com"
          aria-label="Email"
          aria-invalid={showEmailError}
          className="flex-1"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!isEmailValid || status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save Game'}
        </Button>
      </div>

      {showEmailError && (
        <p className="text-[13px] text-accent-700">
          Enter a valid email address.
        </p>
      )}
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
    </form>
  )
}
