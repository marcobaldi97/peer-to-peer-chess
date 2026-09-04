import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import {
  SoundProvider,
  useSoundEnabled,
  type LibrarySoundName
} from 'react-sounds'
import { Button } from 'components/ui/button'
import { ConfirmDialog } from 'components/ui/confirm-dialog'
import {
  SegmentedControl,
  type SegmentedControlOption
} from 'components/ui/segmented-control'
import SiteFooter from 'components/site-footer'
import logo from 'assets/logo.png'
import { statusText } from './game'
import { PlayerKind } from './players'
import { useGame } from './hooks/use-game'
import { ChessBoard } from './components/chess-board'
import OnlineChessGame from './components/online-chess-game'

const preloadSounds: LibrarySoundName[] = [
  'ui/button_soft',
  'ui/blocked',
  'game/hit',
  'notification/success',
  'notification/warning',
  'notification/info'
]

export { statusText }

type Mode = 'local' | 'solo' | 'online'

const modeOptions: SegmentedControlOption<Mode>[] = [
  { value: 'local', label: 'Local' },
  { value: 'solo', label: 'Solo' },
  { value: 'online', label: 'Online' }
]

function LocalChessGame({ vsComputer }: { vsComputer: boolean }) {
  const { snapshot, onPieceDrop, canDragPiece, newGame, resign } =
    useGame(vsComputer)
  const [confirmingResign, setConfirmingResign] = useState(false)

  const canResign =
    !snapshot.isGameOver &&
    snapshot.players[snapshot.turn].kind === PlayerKind.LocalHuman

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div
        id="center-piece"
        className="flex h-screen flex-col justify-center gap-4 sm:h-auto"
      >
        <ChessBoard
          boardId="hot-seat-chess"
          snapshot={snapshot}
          onPieceDrop={onPieceDrop}
          canDragPiece={canDragPiece}
          matchLabel={vsComputer ? 'Local match' : 'Solo match'}
          whiteName={vsComputer ? snapshot.players.w.name : 'Whites'}
          blackName={vsComputer ? snapshot.players.b.name : 'Blacks'}
          hideStatusWhenInProgress
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={newGame}
        >
          New Game
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => setConfirmingResign(true)}
          disabled={!canResign}
        >
          Surrender
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingResign}
        title="Surrender the game?"
        description="This ends the game immediately and counts as a loss."
        confirmLabel="Yes, surrender"
        cancelLabel="Cancel"
        onCancel={() => setConfirmingResign(false)}
        onConfirm={() => {
          setConfirmingResign(false)
          resign(snapshot.turn)
        }}
      />
    </div>
  )
}

type ChessGameProps = {
  invitePeerId?: string
  onInviteSettled?: (connected: boolean) => void
}

function ChessGameContent({ invitePeerId, onInviteSettled }: ChessGameProps) {
  const [mode, setMode] = useState<Mode>(invitePeerId ? 'online' : 'local')
  const [autoJoinPeerId, setAutoJoinPeerId] = useState(invitePeerId)
  const [soundOn, setSoundOn] = useSoundEnabled()

  const handleInviteSettled = (connected: boolean): void => {
    setAutoJoinPeerId(undefined)
    onInviteSettled?.(connected)
  }

  const soundToggle = (size: 'icon' | 'icon-lg') => (
    <Button
      type="button"
      variant="secondary"
      size={size}
      aria-label="Toggle sound"
      aria-pressed={soundOn}
      onClick={() => setSoundOn(!soundOn)}
    >
      {soundOn ? (
        <Volume2 className="h-[18px] w-[18px]" />
      ) : (
        <VolumeX className="h-[18px] w-[18px]" />
      )}
    </Button>
  )

  return (
    <>
      <header className="hidden items-center justify-between border-b border-divider px-4 py-3 md:flex">
        <img src={logo} alt="Chess" className="h-8 w-auto" />
        <div className="flex items-center gap-3">
          <SegmentedControl
            name="mode"
            value={mode}
            onChange={setMode}
            options={modeOptions}
            className="h-9"
          />
          {soundToggle('icon')}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 p-4">
        {mode === 'online' ? (
          <OnlineChessGame
            invitePeerId={autoJoinPeerId}
            onInviteSettled={handleInviteSettled}
          />
        ) : (
          <LocalChessGame vsComputer={mode === 'local'} />
        )}

        <div className="flex items-center gap-3 md:hidden">
          <SegmentedControl
            name="mode-mobile"
            value={mode}
            onChange={setMode}
            options={modeOptions}
            className="h-12 flex-1"
          />
          {soundToggle('icon-lg')}
        </div>
      </div>

      <SiteFooter />
    </>
  )
}

export default function ChessGame({
  invitePeerId,
  onInviteSettled
}: ChessGameProps = {}) {
  return (
    <SoundProvider preload={preloadSounds}>
      <ChessGameContent
        invitePeerId={invitePeerId}
        onInviteSettled={onInviteSettled}
      />
    </SoundProvider>
  )
}
