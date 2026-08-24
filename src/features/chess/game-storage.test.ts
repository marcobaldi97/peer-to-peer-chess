import {
  saveInProgressGame,
  loadInProgressGame,
  clearInProgressGame
} from './game-storage'

const STORAGE_KEY = 'chess:in-progress-game'

beforeEach(() => {
  localStorage.clear()
})

describe('saveInProgressGame / loadInProgressGame', () => {
  it('round-trips the mode and pgn through localStorage', () => {
    saveInProgressGame(true, '1. e4 e5')

    expect(loadInProgressGame()).toEqual({
      vsComputer: true,
      pgn: '1. e4 e5'
    })
  })

  it('returns null when nothing has been saved', () => {
    expect(loadInProgressGame()).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')

    expect(loadInProgressGame()).toBeNull()
  })

  it('returns null when the stored shape does not match', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }))

    expect(loadInProgressGame()).toBeNull()
  })

  it('returns null when the stored value is not an object', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('just a string'))

    expect(loadInProgressGame()).toBeNull()
  })

  it('returns null when the stored value is null', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(null))

    expect(loadInProgressGame()).toBeNull()
  })

  it('does not throw when localStorage.setItem fails', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => saveInProgressGame(false, '1. d4')).not.toThrow()

    spy.mockRestore()
  })

  it('returns null when localStorage.getItem fails', () => {
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('unavailable')
    })

    expect(loadInProgressGame()).toBeNull()

    spy.mockRestore()
  })
})

describe('clearInProgressGame', () => {
  it('removes a previously saved game', () => {
    saveInProgressGame(true, '1. e4 e5')

    clearInProgressGame()

    expect(loadInProgressGame()).toBeNull()
  })

  it('does not throw when localStorage.removeItem fails', () => {
    const spy = vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('unavailable')
    })

    expect(() => clearInProgressGame()).not.toThrow()

    spy.mockRestore()
  })
})
