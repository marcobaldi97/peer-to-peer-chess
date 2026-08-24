vi.mock('react-sounds', () => ({ playSound: vi.fn() }))

import { renderHook } from '@testing-library/react'
import { playSound } from 'react-sounds'
import type { Move } from 'chess.js'
import { GameStatus, type GameSnapshot } from '../game'
import { PlayerKind, type Player } from '../players'
import { usePieceSounds } from './use-piece-sounds'

function buildPlayers(): Record<'w' | 'b', Player> {
  return {
    w: { id: 'w1', name: 'Player 1', kind: PlayerKind.LocalHuman },
    b: { id: 'b1', name: 'Player 2', kind: PlayerKind.LocalHuman }
  }
}

function buildMove(overrides: Partial<Move> = {}): Move {
  return { from: 'e2', to: 'e4', san: 'e4', ...overrides } as Move
}

function buildSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    fen: 'mock-fen',
    turn: 'w',
    status: GameStatus.InProgress,
    isGameOver: false,
    players: buildPlayers(),
    pgn: '',
    history: [],
    ...overrides
  }
}

describe('usePieceSounds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not play a sound on initial mount', () => {
    renderHook(({ snapshot }) => usePieceSounds(snapshot), {
      initialProps: { snapshot: buildSnapshot() }
    })

    expect(playSound).not.toHaveBeenCalled()
  })

  it('plays a move sound when a new, non-capturing move lands', () => {
    const { rerender } = renderHook(
      ({ snapshot }) => usePieceSounds(snapshot),
      {
        initialProps: { snapshot: buildSnapshot() }
      }
    )

    rerender({ snapshot: buildSnapshot({ history: [buildMove()] }) })

    expect(playSound).toHaveBeenCalledWith('ui/button_soft')
  })

  it('plays a capture sound when the new move captured a piece', () => {
    const { rerender } = renderHook(
      ({ snapshot }) => usePieceSounds(snapshot),
      {
        initialProps: { snapshot: buildSnapshot() }
      }
    )

    rerender({
      snapshot: buildSnapshot({
        history: [buildMove({ captured: 'p' })]
      })
    })

    expect(playSound).toHaveBeenCalledWith('game/hit')
  })

  it('plays a success sound in addition to the move sound on checkmate', () => {
    const { rerender } = renderHook(
      ({ snapshot }) => usePieceSounds(snapshot),
      {
        initialProps: { snapshot: buildSnapshot() }
      }
    )

    rerender({
      snapshot: buildSnapshot({
        history: [buildMove()],
        status: GameStatus.Checkmate
      })
    })

    expect(playSound).toHaveBeenCalledWith('ui/button_soft')
    expect(playSound).toHaveBeenCalledWith('notification/success')
  })

  it('plays an info sound on stalemate or draw', () => {
    const { rerender } = renderHook(
      ({ snapshot }) => usePieceSounds(snapshot),
      {
        initialProps: { snapshot: buildSnapshot() }
      }
    )

    rerender({
      snapshot: buildSnapshot({
        history: [buildMove()],
        status: GameStatus.Stalemate
      })
    })

    expect(playSound).toHaveBeenCalledWith('notification/info')
  })

  it('plays a warning sound on check', () => {
    const { rerender } = renderHook(
      ({ snapshot }) => usePieceSounds(snapshot),
      {
        initialProps: { snapshot: buildSnapshot() }
      }
    )

    rerender({
      snapshot: buildSnapshot({
        history: [buildMove()],
        status: GameStatus.Check
      })
    })

    expect(playSound).toHaveBeenCalledWith('notification/warning')
  })

  it('does not play a move sound when the history resets on a new game', () => {
    const { rerender } = renderHook(
      ({ snapshot }) => usePieceSounds(snapshot),
      {
        initialProps: {
          snapshot: buildSnapshot({ history: [buildMove(), buildMove()] })
        }
      }
    )
    vi.clearAllMocks()

    rerender({ snapshot: buildSnapshot({ history: [] }) })

    expect(playSound).not.toHaveBeenCalled()
  })
})
