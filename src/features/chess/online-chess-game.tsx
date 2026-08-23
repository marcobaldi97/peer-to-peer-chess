import { useState, useSyncExternalStore } from 'react'
import type { Color } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { classNames } from 'utils'
import { statusText } from './game'
import { ConnectionStatus, type PeerConnection } from './peer-connection'
import { useNetGame } from './use-net-game'
import OnlineLobby from './online-lobby'

type Session = { connection: PeerConnection; localColor: Color }

const buttonClassName = classNames(
  'rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white',
  'hover:bg-gray-700'
)

function NetworkChessBoard({
  connection,
  localColor,
  onLeave
}: {
  connection: PeerConnection
  localColor: Color
  onLeave: () => void
}) {
  const connectionSnapshot = useSyncExternalStore(
    connection.subscribe,
    connection.getSnapshot
  )
  const { snapshot, onPieceDrop, canDragPiece, newGame } = useNetGame(
    connection,
    localColor
  )
  const turnPlayer = snapshot.players[snapshot.turn]

  // TODO: on reconnect, overwrite this side's game state from the host
  // (the host is the source of truth) instead of leaving the player stuck —
  // for now a dropped connection just sends them back to the lobby.
  const isDisconnected =
    connectionSnapshot.status === ConnectionStatus.Disconnected ||
    connectionSnapshot.status === ConnectionStatus.Error

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <p
        data-testid="game-status"
        className="text-lg font-medium text-gray-700"
      >
        {statusText(snapshot, turnPlayer)}
      </p>

      {isDisconnected && (
        <p data-testid="connection-status" className="text-sm text-red-600">
          {connectionSnapshot.errorMessage ?? 'Opponent disconnected.'}
        </p>
      )}

      <div className="w-full max-w-[560px]">
        <Chessboard
          options={{
            id: 'online-chess',
            position: snapshot.fen,
            boardOrientation: localColor === 'w' ? 'white' : 'black',
            onPieceDrop,
            canDragPiece
          }}
        />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={newGame} className={buttonClassName}>
          New Game
        </button>
        <button type="button" onClick={onLeave} className={buttonClassName}>
          Leave Game
        </button>
      </div>
    </div>
  )
}

export default function OnlineChessGame() {
  const [session, setSession] = useState<Session | null>(null)

  if (!session) {
    return (
      <OnlineLobby
        onConnected={(connection, localColor) =>
          setSession({ connection, localColor })
        }
      />
    )
  }

  return (
    <NetworkChessBoard
      connection={session.connection}
      localColor={session.localColor}
      onLeave={() => {
        session.connection.close()
        setSession(null)
      }}
    />
  )
}
