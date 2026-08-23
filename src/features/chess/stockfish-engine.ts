import type { Square } from 'chess.js'
import { PromotionPiece } from './game'

const ENGINE_URL = `${
  import.meta.env.BASE_URL
}stockfish/stockfish-18-lite-single.js`
const SEARCH_DEPTH = 12

export type UciMove = {
  from: Square
  to: Square
  promotion?: PromotionPiece
}

export type StockfishEngine = {
  getBestMove: (fen: string) => Promise<UciMove>
  terminate: () => void
}

export function parseUciMove(bestmoveLine: string): UciMove {
  const uci = bestmoveLine.split(' ')[1]
  const from = uci.slice(0, 2) as Square
  const to = uci.slice(2, 4) as Square
  const promotionChar = uci.slice(4, 5)

  if (!promotionChar) return { from, to }

  return { from, to, promotion: promotionChar as PromotionPiece }
}

export function createStockfishEngine(): StockfishEngine {
  const worker = new Worker(ENGINE_URL)
  let ready: Promise<void> | null = null

  function waitFor(predicate: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      function onMessage(event: MessageEvent<string>): void {
        if (!predicate(event.data)) return

        worker.removeEventListener('message', onMessage)
        resolve(event.data)
      }

      worker.addEventListener('message', onMessage)
    })
  }

  function ensureReady(): Promise<void> {
    if (!ready) {
      ready = waitFor((line) => line === 'uciok').then(async () => {
        worker.postMessage('isready')
        await waitFor((line) => line === 'readyok')
      })
      worker.postMessage('uci')
    }

    return ready
  }

  async function getBestMove(fen: string): Promise<UciMove> {
    await ensureReady()

    worker.postMessage(`position fen ${fen}`)
    worker.postMessage(`go depth ${SEARCH_DEPTH}`)

    const line = await waitFor((data) => data.startsWith('bestmove'))

    return parseUciMove(line)
  }

  function terminate(): void {
    worker.terminate()
  }

  return { getBestMove, terminate }
}
