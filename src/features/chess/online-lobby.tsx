import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent
} from 'react'
import type { Color } from 'chess.js'
import { Check, Copy } from 'lucide-react'
import { cn } from 'lib/utils'
import { Button } from 'components/ui/button'
import { Input } from 'components/ui/input'
import {
  ConnectionStatus,
  hostGame,
  joinGame,
  type PeerConnection
} from './peer-connection'

type OnlineLobbyProps = {
  onConnected: (connection: PeerConnection, localColor: Color) => void
}

type LobbyView =
  | { kind: 'menu' }
  | { kind: 'join-form' }
  | { kind: 'connecting'; connection: PeerConnection; localColor: Color }

function statusMessage(snapshot: ReturnType<PeerConnection['getSnapshot']>): {
  isError: boolean
  text: string | null
} {
  switch (snapshot.status) {
    case ConnectionStatus.Waiting:
      return { isError: false, text: 'Waiting for your opponent to join…' }
    case ConnectionStatus.Connecting:
      return { isError: false, text: 'Connecting…' }
    case ConnectionStatus.Disconnected:
      return { isError: true, text: 'The connection was closed.' }
    case ConnectionStatus.Error:
      return {
        isError: true,
        text: snapshot.errorMessage ?? 'Connection failed.'
      }
    default:
      return { isError: false, text: null }
  }
}

function ConnectingScreen({
  connection,
  localColor,
  onConnected,
  onCancel
}: {
  connection: PeerConnection
  localColor: Color
  onConnected: (connection: PeerConnection, localColor: Color) => void
  onCancel: () => void
}) {
  const snapshot = useSyncExternalStore(
    connection.subscribe,
    connection.getSnapshot
  )
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    if (snapshot.status === ConnectionStatus.Connected) {
      onConnected(connection, localColor)
    }
  }, [snapshot, connection, localColor, onConnected])

  const { isError, text } = statusMessage(snapshot)
  const isTerminal =
    snapshot.status === ConnectionStatus.Disconnected ||
    snapshot.status === ConnectionStatus.Error
  const isSharingCode = snapshot.status === ConnectionStatus.Waiting

  const copyCode = (): void => {
    navigator.clipboard.writeText(snapshot.localPeerId as string)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded border border-divider p-4 text-center shadow-board">
      {isSharingCode && (
        <>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Share this code
          </p>
          <div className="flex w-full items-center gap-2">
            <div className="flex h-9 flex-1 items-center justify-center rounded border border-divider font-heading text-xl tracking-wide">
              {snapshot.localPeerId}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Copy code"
              onClick={copyCode}
            >
              {codeCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </>
      )}

      {text && (
        <p
          data-testid="connection-status"
          className={cn(
            'text-sm',
            isError ? 'text-accent-700' : 'text-text/55'
          )}
        >
          {text}
        </p>
      )}

      <Button type="button" variant="secondary" size="block" onClick={onCancel}>
        {isTerminal ? 'Try again' : 'Cancel'}
      </Button>
    </div>
  )
}

export default function OnlineLobby({ onConnected }: OnlineLobbyProps) {
  const [view, setView] = useState<LobbyView>({ kind: 'menu' })
  const [joinId, setJoinId] = useState('')

  const handleCreateGame = (): void => {
    setView({ kind: 'connecting', connection: hostGame(), localColor: 'w' })
  }

  const handleJoinSubmit = (event: FormEvent): void => {
    event.preventDefault()

    const id = joinId.trim()
    if (!id) return

    setView({ kind: 'connecting', connection: joinGame(id), localColor: 'b' })
  }

  if (view.kind === 'connecting') {
    return (
      <ConnectingScreen
        connection={view.connection}
        localColor={view.localColor}
        onConnected={onConnected}
        onCancel={() => {
          view.connection.close()
          setView({ kind: 'menu' })
        }}
      />
    )
  }

  if (view.kind === 'join-form') {
    return (
      <form
        onSubmit={handleJoinSubmit}
        className="flex flex-1 flex-col justify-center gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="join-code" className="text-xs text-text/70">
            Game code
          </label>
          <Input
            id="join-code"
            value={joinId}
            onChange={(event) => setJoinId(event.target.value)}
            placeholder="e.g. 8F3A-91C2"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setView({ kind: 'menu' })}
          >
            Back
          </Button>
          <Button type="submit" variant="primary" size="lg" className="flex-1">
            Join
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <Button
        type="button"
        variant="primary"
        size="block"
        onClick={handleCreateGame}
      >
        Create Game
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="block"
        onClick={() => setView({ kind: 'join-form' })}
      >
        Join Game
      </Button>
    </div>
  )
}
