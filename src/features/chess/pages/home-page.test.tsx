vi.mock('..', () => ({ default: vi.fn(() => <div>chess game</div>) }))

import { render, screen } from '@testing-library/react'
import ChessGame from '..'
import HomePage from './home-page'

describe('<HomePage />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ChessGame with no invite props', () => {
    render(<HomePage />)

    expect(screen.getByText('chess game')).toBeInTheDocument()
    expect(vi.mocked(ChessGame)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(ChessGame).mock.calls[0][0]?.invitePeerId).toBeUndefined()
  })
})
