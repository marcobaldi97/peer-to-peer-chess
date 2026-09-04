import Peer, { type DataConnection } from 'peerjs'
import type { Square } from 'chess.js'
import { PromotionPiece } from './game'

export enum ConnectionStatus {
  Connecting = 'connecting',
  Waiting = 'waiting',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error'
}

export type ConnectionSnapshot = {
  status: ConnectionStatus
  localPeerId: string | null
  errorMessage: string | null
}

export type RemoteMove = {
  from: Square
  to: Square
  promotion?: PromotionPiece
}

type RemoteMessage =
  | { type: 'move'; move: RemoteMove }
  | { type: 'reset' }
  | { type: 'resign' }

type Listener = () => void
type MoveListener = (move: RemoteMove) => void
type ResetListener = () => void
type ResignListener = () => void

export class PeerConnection {
  private conn: DataConnection | null = null
  private listeners = new Set<Listener>()
  private moveListeners = new Set<MoveListener>()
  private resetListeners = new Set<ResetListener>()
  private resignListeners = new Set<ResignListener>()
  private snapshot: ConnectionSnapshot = {
    status: ConnectionStatus.Connecting,
    localPeerId: null,
    errorMessage: null
  }

  private constructor(private peer: Peer) {
    this.peer.on('error', (error) =>
      this.setSnapshot({
        status: ConnectionStatus.Error,
        errorMessage: error.message
      })
    )
  }

  static host(): PeerConnection {
    const connection = new PeerConnection(new Peer())

    connection.peer.on('open', (id) =>
      connection.setSnapshot({
        status: ConnectionStatus.Waiting,
        localPeerId: id
      })
    )
    connection.peer.on('connection', (conn) => connection.bindConnection(conn))

    return connection
  }

  static join(remotePeerId: string): PeerConnection {
    const connection = new PeerConnection(new Peer())

    connection.peer.on('open', () =>
      connection.bindConnection(connection.peer.connect(remotePeerId))
    )

    return connection
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)

    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): ConnectionSnapshot => this.snapshot

  onMove = (listener: MoveListener): (() => void) => {
    this.moveListeners.add(listener)

    return () => this.moveListeners.delete(listener)
  }

  onReset = (listener: ResetListener): (() => void) => {
    this.resetListeners.add(listener)

    return () => this.resetListeners.delete(listener)
  }

  onResign = (listener: ResignListener): (() => void) => {
    this.resignListeners.add(listener)

    return () => this.resignListeners.delete(listener)
  }

  sendMove(move: RemoteMove): void {
    this.conn?.send({ type: 'move', move } satisfies RemoteMessage)
  }

  sendReset(): void {
    this.conn?.send({ type: 'reset' } satisfies RemoteMessage)
  }

  sendResign(): void {
    this.conn?.send({ type: 'resign' } satisfies RemoteMessage)
  }

  close(): void {
    this.conn?.close()
    this.peer.destroy()
  }

  private bindConnection(conn: DataConnection): void {
    this.conn = conn

    conn.on('open', () =>
      this.setSnapshot({ status: ConnectionStatus.Connected })
    )
    conn.on('data', (data) => this.handleMessage(data as RemoteMessage))
    conn.on('close', () =>
      this.setSnapshot({ status: ConnectionStatus.Disconnected })
    )
    conn.on('error', (error) =>
      this.setSnapshot({
        status: ConnectionStatus.Error,
        errorMessage: error.message
      })
    )
  }

  private handleMessage(message: RemoteMessage): void {
    if (message.type === 'move') {
      this.moveListeners.forEach((listener) => listener(message.move))
    } else if (message.type === 'reset') {
      this.resetListeners.forEach((listener) => listener())
    } else {
      this.resignListeners.forEach((listener) => listener())
    }
  }

  private setSnapshot(partial: Partial<ConnectionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial }
    this.listeners.forEach((listener) => listener())
  }
}

export function hostGame(): PeerConnection {
  return PeerConnection.host()
}

export function joinGame(remotePeerId: string): PeerConnection {
  return PeerConnection.join(remotePeerId)
}
