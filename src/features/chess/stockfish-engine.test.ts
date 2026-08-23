import { PromotionPiece } from './game'
import { createStockfishEngine, parseUciMove } from './stockfish-engine'

class MockWorker {
  static instances: MockWorker[] = []
  listeners: Array<(event: MessageEvent<string>) => void> = []
  postMessage = vi.fn((command: string) => {
    this.sentCommands.push(command)
  })
  terminate = vi.fn()
  sentCommands: string[] = []

  constructor() {
    MockWorker.instances.push(this)
  }

  addEventListener(
    _type: 'message',
    listener: (event: MessageEvent<string>) => void
  ): void {
    this.listeners.push(listener)
  }

  removeEventListener(
    _type: 'message',
    listener: (event: MessageEvent<string>) => void
  ): void {
    this.listeners = this.listeners.filter((l) => l !== listener)
  }

  emit(data: string): void {
    this.listeners.forEach((listener) =>
      listener({ data } as MessageEvent<string>)
    )
  }
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

beforeEach(() => {
  MockWorker.instances = []
  vi.stubGlobal('Worker', MockWorker)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseUciMove', () => {
  it('parses a move with no promotion', () => {
    expect(parseUciMove('bestmove e2e4')).toEqual({ from: 'e2', to: 'e4' })
  })

  it('parses a move with a promotion', () => {
    expect(parseUciMove('bestmove e7e8q')).toEqual({
      from: 'e7',
      to: 'e8',
      promotion: PromotionPiece.Queen
    })
  })
})

describe('createStockfishEngine', () => {
  it('runs the uci/isready handshake before asking for a move', async () => {
    const engine = createStockfishEngine()
    const worker = MockWorker.instances[0]

    const movePromise = engine.getBestMove('mock-fen')

    expect(worker.sentCommands).toEqual(['uci'])
    worker.emit('uciok')

    await flush()
    expect(worker.sentCommands).toEqual(['uci', 'isready'])
    worker.emit('readyok')

    await flush()
    expect(worker.sentCommands).toEqual([
      'uci',
      'isready',
      'position fen mock-fen',
      'go depth 12'
    ])

    worker.emit('info depth 1')
    worker.emit('bestmove e2e4 ponder e7e5')

    await expect(movePromise).resolves.toEqual({ from: 'e2', to: 'e4' })
  })

  it('only performs the handshake once across multiple getBestMove calls', async () => {
    const engine = createStockfishEngine()
    const worker = MockWorker.instances[0]

    const firstMove = engine.getBestMove('fen-1')
    worker.emit('uciok')
    await flush()
    worker.emit('readyok')
    await flush()
    worker.emit('bestmove e2e4')
    await firstMove

    worker.sentCommands = []
    const secondMove = engine.getBestMove('fen-2')
    await flush()
    worker.emit('bestmove d2d4')

    await expect(secondMove).resolves.toEqual({ from: 'd2', to: 'd4' })
    expect(worker.sentCommands).toEqual(['position fen fen-2', 'go depth 12'])
  })

  it('terminates the underlying worker', () => {
    const engine = createStockfishEngine()
    const worker = MockWorker.instances[0]

    engine.terminate()

    expect(worker.terminate).toHaveBeenCalled()
  })
})
