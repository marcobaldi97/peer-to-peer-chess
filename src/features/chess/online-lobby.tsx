import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent
} from 'react'
import type { Color } from 'chess.js'
import { classNames } from 'utils'
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

const buttonClassName = classNames(
  'rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white',
  'hover:bg-gray-700'
)

function statusMessage(snapshot: ReturnType<PeerConnection['getSnapshot']>): {
  isError: boolean
  text: string | null
} {
  switch (snapshot.status) {
    case ConnectionStatus.Waiting:
      return {
        isError: false,
        text: `Share this code: ${snapshot.localPeerId}`
      }
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

  useEffect(() => {
    if (snapshot.status === ConnectionStatus.Connected) {
      onConnected(connection, localColor)
    }
  }, [snapshot, connection, localColor, onConnected])

  const { isError, text } = statusMessage(snapshot)
  const isTerminal =
    snapshot.status === ConnectionStatus.Disconnected ||
    snapshot.status === ConnectionStatus.Error

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {text && (
        <p
          data-testid="connection-status"
          className={classNames(
            'text-sm',
            isError ? 'text-red-600' : 'text-gray-700'
          )}
        >
          {text}
        </p>
      )}

      <button type="button" onClick={onCancel} className={buttonClassName}>
        {isTerminal ? 'Try again' : 'Cancel'}
      </button>
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
        className="flex flex-col items-center gap-4 p-4"
      >
        <input
          type="text"
          value={joinId}
          onChange={(event) => setJoinId(event.target.value)}
          placeholder="Game code"
          aria-label="Game code"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="submit" className={buttonClassName}>
            Join
          </button>
          <button
            type="button"
            onClick={() => setView({ kind: 'menu' })}
            className={buttonClassName}
          >
            Back
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <button
        type="button"
        onClick={handleCreateGame}
        className={buttonClassName}
      >
        Create Game
      </button>
      <button
        type="button"
        onClick={() => setView({ kind: 'join-form' })}
        className={buttonClassName}
      >
        Join Game
      </button>
    </div>
  )
}
