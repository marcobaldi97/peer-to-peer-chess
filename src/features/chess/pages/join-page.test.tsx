vi.mock('..', () => ({ default: vi.fn(() => <div>chess game</div>) }))

import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ChessGame from '..'
import JoinPage from './join-page'

function renderJoinPage() {
  return render(
    <MemoryRouter initialEntries={['/join/abc123']}>
      <Routes>
        <Route path="/join/:peerId" element={<JoinPage />} />
        <Route path="/" element={<div>home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('<JoinPage />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads peerId from the route and forwards it to ChessGame', () => {
    renderJoinPage()

    expect(screen.getByText('chess game')).toBeInTheDocument()
    expect(vi.mocked(ChessGame).mock.calls[0][0]).toMatchObject({
      invitePeerId: 'abc123'
    })
  })

  it('navigates back to / when the invite is settled without connecting', () => {
    renderJoinPage()

    act(() => vi.mocked(ChessGame).mock.calls[0]?.[0]?.onInviteSettled?.(false))

    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('stays on the join route once the invite connects, so the live session is not unmounted', () => {
    renderJoinPage()

    act(() => vi.mocked(ChessGame).mock.calls[0]?.[0]?.onInviteSettled?.(true))

    expect(screen.queryByText('home')).not.toBeInTheDocument()
    expect(screen.getByText('chess game')).toBeInTheDocument()
  })
})
