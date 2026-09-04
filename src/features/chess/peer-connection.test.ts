type Handler = (...args: unknown[]) => void

const { MockPeer, MockDataConnection } = vi.hoisted(() => {
  class MockDataConnection {
    listeners: Record<string, Handler[]> = {}
    send = vi.fn()
    close = vi.fn()

    constructor(public peer: string) {}

    on(event: string, handler: Handler): void {
      ;(this.listeners[event] ??= []).push(handler)
    }

    emit(event: string, ...args: unknown[]): void {
      this.listeners[event]?.forEach((handler) => handler(...args))
    }
  }

  class MockPeer {
    static instances: MockPeer[] = []
    listeners: Record<string, Handler[]> = {}
    destroy = vi.fn()
    connect = vi.fn((remoteId: string) => new MockDataConnection(remoteId))

    constructor() {
      MockPeer.instances.push(this)
    }

    on(event: string, handler: Handler): void {
      ;(this.listeners[event] ??= []).push(handler)
    }

    emit(event: string, ...args: unknown[]): void {
      this.listeners[event]?.forEach((handler) => handler(...args))
    }
  }

  return { MockPeer, MockDataConnection }
})

vi.mock('peerjs', () => ({ default: MockPeer }))

import { ConnectionStatus, hostGame, joinGame } from './peer-connection'

beforeEach(() => {
  MockPeer.instances = []
})

describe('hostGame', () => {
  it('starts Connecting with no peer id', () => {
    const connection = hostGame()

    expect(connection.getSnapshot()).toEqual({
      status: ConnectionStatus.Connecting,
      localPeerId: null,
      errorMessage: null
    })
  })

  it('moves to Waiting once the peer opens, notifying subscribers', () => {
    const connection = hostGame()
    const peer = MockPeer.instances[0]
    const listener = vi.fn()
    connection.subscribe(listener)

    peer.emit('open', 'host-id')

    expect(connection.getSnapshot()).toEqual({
      status: ConnectionStatus.Waiting,
      localPeerId: 'host-id',
      errorMessage: null
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('moves to Connected once an incoming connection opens', () => {
    const connection = hostGame()
    const peer = MockPeer.instances[0]
    peer.emit('open', 'host-id')

    const conn = new MockDataConnection('joiner-id')
    peer.emit('connection', conn)
    conn.emit('open')

    expect(connection.getSnapshot().status).toBe(ConnectionStatus.Connected)
  })

  it('goes to Error when the peer itself errors', () => {
    const connection = hostGame()
    const peer = MockPeer.instances[0]

    peer.emit('error', new Error('signaling unreachable'))

    expect(connection.getSnapshot()).toEqual({
      status: ConnectionStatus.Error,
      localPeerId: null,
      errorMessage: 'signaling unreachable'
    })
  })
})

describe('joinGame', () => {
  it('connects to the given remote id once the peer opens', () => {
    const connection = joinGame('remote-id')
    const peer = MockPeer.instances[0]

    peer.emit('open', 'joiner-id')

    expect(peer.connect).toHaveBeenCalledWith('remote-id')
    expect(connection.getSnapshot().status).toBe(ConnectionStatus.Connecting)
  })

  it('moves to Connected once the connection opens', () => {
    const connection = joinGame('remote-id')
    const peer = MockPeer.instances[0]
    peer.emit('open', 'joiner-id')
    const conn = peer.connect.mock.results[0].value as InstanceType<
      typeof MockDataConnection
    >

    conn.emit('open')

    expect(connection.getSnapshot().status).toBe(ConnectionStatus.Connected)
  })
})

describe('connection lifecycle', () => {
  function connectedPair() {
    const connection = hostGame()
    const peer = MockPeer.instances[0]
    peer.emit('open', 'host-id')
    const conn = new MockDataConnection('joiner-id')
    peer.emit('connection', conn)
    conn.emit('open')

    return { connection, peer, conn }
  }

  it('dispatches incoming move messages to onMove listeners', () => {
    const { conn, connection } = connectedPair()
    const moveListener = vi.fn()
    connection.onMove(moveListener)

    conn.emit('data', { type: 'move', move: { from: 'e2', to: 'e4' } })

    expect(moveListener).toHaveBeenCalledWith({ from: 'e2', to: 'e4' })
  })

  it('stops notifying an unsubscribed move listener', () => {
    const { conn, connection } = connectedPair()
    const moveListener = vi.fn()
    const unsubscribe = connection.onMove(moveListener)
    unsubscribe()

    conn.emit('data', { type: 'move', move: { from: 'e2', to: 'e4' } })

    expect(moveListener).not.toHaveBeenCalled()
  })

  it('dispatches incoming reset messages to onReset listeners', () => {
    const { conn, connection } = connectedPair()
    const resetListener = vi.fn()
    connection.onReset(resetListener)

    conn.emit('data', { type: 'reset' })

    expect(resetListener).toHaveBeenCalledTimes(1)
  })

  it('dispatches incoming resign messages to onResign listeners', () => {
    const { conn, connection } = connectedPair()
    const resignListener = vi.fn()
    connection.onResign(resignListener)

    conn.emit('data', { type: 'resign' })

    expect(resignListener).toHaveBeenCalledTimes(1)
  })

  it('stops notifying an unsubscribed resign listener', () => {
    const { conn, connection } = connectedPair()
    const resignListener = vi.fn()
    const unsubscribe = connection.onResign(resignListener)
    unsubscribe()

    conn.emit('data', { type: 'resign' })

    expect(resignListener).not.toHaveBeenCalled()
  })

  it('moves to Disconnected when the connection closes', () => {
    const { conn, connection } = connectedPair()

    conn.emit('close')

    expect(connection.getSnapshot().status).toBe(ConnectionStatus.Disconnected)
  })

  it('moves to Error when the connection errors', () => {
    const { conn, connection } = connectedPair()

    conn.emit('error', new Error('peer unreachable'))

    expect(connection.getSnapshot()).toMatchObject({
      status: ConnectionStatus.Error,
      errorMessage: 'peer unreachable'
    })
  })

  it('sends moves, resets, and resignations through the underlying connection', () => {
    const { conn, connection } = connectedPair()

    connection.sendMove({ from: 'e2', to: 'e4' })
    connection.sendReset()
    connection.sendResign()

    expect(conn.send).toHaveBeenNthCalledWith(1, {
      type: 'move',
      move: { from: 'e2', to: 'e4' }
    })
    expect(conn.send).toHaveBeenNthCalledWith(2, { type: 'reset' })
    expect(conn.send).toHaveBeenNthCalledWith(3, { type: 'resign' })
  })

  it('closes the connection and destroys the peer', () => {
    const { conn, connection, peer } = connectedPair()

    connection.close()

    expect(conn.close).toHaveBeenCalled()
    expect(peer.destroy).toHaveBeenCalled()
  })

  it('unsubscribed status listeners stop receiving updates', () => {
    const connection = hostGame()
    const peer = MockPeer.instances[0]
    const listener = vi.fn()
    const unsubscribe = connection.subscribe(listener)
    unsubscribe()

    peer.emit('open', 'host-id')

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('sending before a connection exists', () => {
  it('does not throw when sending or closing with no bound connection', () => {
    const connection = hostGame()

    expect(() => connection.sendMove({ from: 'e2', to: 'e4' })).not.toThrow()
    expect(() => connection.sendReset()).not.toThrow()
    expect(() => connection.sendResign()).not.toThrow()
    expect(() => connection.close()).not.toThrow()
  })
})
