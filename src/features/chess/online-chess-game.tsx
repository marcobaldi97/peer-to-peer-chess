import { useState, useSyncExternalStore } from 'react'
import type { Color } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { TriangleAlert } from 'lucide-react'
import { Button } from 'components/ui/button'
import { statusText } from './game'
import { ConnectionStatus, type PeerConnection } from './peer-connection'
import { useNetGame } from './use-net-game'
import OnlineLobby from './online-lobby'

type Session = { connection: PeerConnection; localColor: Color }

const squareStyles = {
  darkSquareStyle: { backgroundColor: 'rgb(var(--color-neutral-300))' },
  lightSquareStyle: { backgroundColor: 'rgb(var(--color-neutral-100))' }
}

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
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="overflow-hidden rounded-sm border-[6px] border-surface shadow-board outline outline-1 outline-divider">
        <Chessboard
          options={{
            id: 'online-chess',
            position: snapshot.fen,
            boardOrientation: localColor === 'w' ? 'white' : 'black',
            onPieceDrop,
            canDragPiece,
            ...squareStyles
          }}
        />
      </div>

      <div className="text-center">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
          Online match
        </p>
        <div className="flex items-baseline justify-center gap-3 font-heading text-[28px] font-semibold">
          <span
            className={
              snapshot.turn === 'w'
                ? 'border-b-2 border-accent pb-0.5 text-accent-700'
                : 'text-text/45'
            }
          >
            {snapshot.players.w.name}
          </span>
          <span className="font-body text-[15px] font-normal text-text/55">
            vs
          </span>
          <span
            className={
              snapshot.turn === 'b'
                ? 'border-b-2 border-accent pb-0.5 text-accent-700'
                : 'text-text/45'
            }
          >
            {snapshot.players.b.name}
          </span>
        </div>
        <p data-testid="game-status" className="mt-2 text-base text-text/55">
          {statusText(snapshot, turnPlayer)}
        </p>
      </div>

      {isDisconnected && (
        <div className="flex flex-row items-center gap-2 rounded border border-accent-700 p-3">
          <TriangleAlert className="size-4 flex-none text-accent-700" />
          <span
            data-testid="connection-status"
            className="text-[13px] text-accent-700"
          >
            {connectionSnapshot.errorMessage ?? 'Opponent disconnected.'}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={newGame}
        >
          New Game
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={onLeave}
        >
          Leave Game
        </Button>
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
