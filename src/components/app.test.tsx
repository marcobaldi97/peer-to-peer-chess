vi.mock('react-sounds', async () => {
  const { useState } = await import('react')
  return {
    playSound: vi.fn(),
    SoundProvider: ({ children }: { children: unknown }) => children,
    useSoundEnabled: () => useState(true)
  }
})

import { render, screen } from '@testing-library/react'

import App from './app'

describe('<App />', () => {
  it('should render the App with a fresh hot-seat game', () => {
    const { container } = render(<App />)

    expect(screen.getByTestId('active-player')).toHaveTextContent('Player 1')
    expect(screen.queryByTestId('game-status')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /new game/i })
    ).toBeInTheDocument()
    expect(container.firstChild).toBeInTheDocument()
  })
})
