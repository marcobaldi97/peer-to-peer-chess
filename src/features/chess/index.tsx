import { useState } from 'react'
import { Chessboard, ChessboardOptions } from 'react-chessboard'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from 'components/ui/button'
import {
  SegmentedControl,
  type SegmentedControlOption
} from 'components/ui/segmented-control'
import SiteFooter from 'components/site-footer'
import logo from 'assets/logo.png'
import { GameStatus, statusText } from './game'
import { useGame } from './use-game'
import OnlineChessGame from './online-chess-game'

export { statusText }

type Mode = 'local' | 'solo' | 'online'

const modeOptions: SegmentedControlOption<Mode>[] = [
  { value: 'local', label: 'Local' },
  { value: 'solo', label: 'Solo' },
  { value: 'online', label: 'Online' }
]

const squareStyles: Partial<ChessboardOptions> = {
  darkSquareStyle: { backgroundColor: 'rgb(var(--color-neutral-300))' },
  lightSquareStyle: { backgroundColor: 'rgb(var(--color-neutral-100))' }
}

function LocalChessGame({ vsComputer }: { vsComputer: boolean }) {
  const { snapshot, onPieceDrop, canDragPiece, newGame } = useGame(vsComputer)
  const turnPlayer = snapshot.players[snapshot.turn]

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div
        id="center-piece"
        className="flex h-screen flex-col justify-center gap-4 sm:h-auto"
      >
        <div className="overflow-hidden rounded-sm border-[6px] border-surface shadow-board outline outline-1 outline-divider">
          <Chessboard
            options={{
              id: 'hot-seat-chess',
              position: snapshot.fen,
              onPieceDrop,
              canDragPiece,
              ...squareStyles
            }}
          />
        </div>

        <div className="text-center">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
            {vsComputer ? 'Local match' : 'Solo match'}
          </p>
          <div className="flex items-baseline justify-center gap-3 font-heading text-[28px] font-semibold">
            <span
              data-testid={snapshot.turn === 'w' ? 'active-player' : undefined}
              className={
                snapshot.turn === 'w'
                  ? 'border-b-2 border-accent pb-0.5 text-accent-700'
                  : 'text-text/45'
              }
            >
              {vsComputer ? snapshot.players.w.name : 'Whites'}
            </span>
            <span className="font-body text-[15px] font-normal text-text/55">
              vs
            </span>
            <span
              data-testid={snapshot.turn === 'b' ? 'active-player' : undefined}
              className={
                snapshot.turn === 'b'
                  ? 'border-b-2 border-accent pb-0.5 text-accent-700'
                  : 'text-text/45'
              }
            >
              {vsComputer ? snapshot.players.b.name : 'Blacks'}
            </span>
          </div>
          {snapshot.status !== GameStatus.InProgress && (
            <p
              data-testid="game-status"
              className="mt-2 text-base text-text/55"
            >
              {statusText(snapshot, turnPlayer)}
            </p>
          )}
        </div>
      </div>

      <Button variant="primary" size="block" onClick={newGame}>
        New Game
      </Button>
    </div>
  )
}

export default function ChessGame() {
  const [mode, setMode] = useState<Mode>('local')
  const [soundOn, setSoundOn] = useState(true)

  const soundToggle = (size: 'icon' | 'icon-lg') => (
    <Button
      type="button"
      variant="secondary"
      size={size}
      aria-label="Toggle sound"
      aria-pressed={soundOn}
      onClick={() => setSoundOn((value) => !value)}
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
          <OnlineChessGame />
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
