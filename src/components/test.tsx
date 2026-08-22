import { render, screen } from '@testing-library/react'

import App from './app'

describe('<App />', () => {
  it('should render the App with a fresh hot-seat game', () => {
    const { container } = render(<App />)

    expect(screen.getByTestId('game-status')).toHaveTextContent(
      /Player 1 to move/i
    )
    expect(
      screen.getByRole('button', { name: /new game/i })
    ).toBeInTheDocument()
    expect(container.firstChild).toBeInTheDocument()
  })
})
