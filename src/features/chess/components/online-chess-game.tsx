import { useState, useSyncExternalStore } from 'react'
import type { Color } from 'chess.js'
import { TriangleAlert } from 'lucide-react'
import { Button } from 'components/ui/button'
import { ConnectionStatus, type PeerConnection } from '../peer-connection'
import { useNetGame } from '../hooks/use-net-game'
import { ChessBoard } from './chess-board'
import { SaveGame } from './save-game'
import OnlineLobby from './online-lobby'

type Session = { connection: PeerConnection; localColor: Color }

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

  // TODO: on reconnect, overwrite this side's game state from the host
  // (the host is the source of truth) instead of leaving the player stuck —
  // for now a dropped connection just sends them back to the lobby.
  const isDisconnected =
    connectionSnapshot.status === ConnectionStatus.Disconnected ||
    connectionSnapshot.status === ConnectionStatus.Error

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <ChessBoard
        boardId="online-chess"
        snapshot={snapshot}
        onPieceDrop={onPieceDrop}
        canDragPiece={canDragPiece}
        boardOrientation={localColor === 'w' ? 'white' : 'black'}
        matchLabel="Online match"
        whiteName={snapshot.players.w.name}
        blackName={snapshot.players.b.name}
      />

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

      <SaveGame snapshot={snapshot} />

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

type OnlineChessGameProps = {
  invitePeerId?: string
  onInviteSettled?: (connected: boolean) => void
}

export default function OnlineChessGame({
  invitePeerId,
  onInviteSettled
}: OnlineChessGameProps) {
  const [session, setSession] = useState<Session | null>(null)

  if (!session) {
    return (
      <OnlineLobby
        onConnected={(connection, localColor) =>
          setSession({ connection, localColor })
        }
        autoJoinPeerId={invitePeerId}
        onAutoJoinSettled={onInviteSettled}
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
