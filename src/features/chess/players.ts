export enum PlayerKind {
  LocalHuman = 'local-human',
  RemoteHuman = 'remote-human',
  Computer = 'computer'
}

export type Player = {
  id: string
  name: string
  kind: PlayerKind
}
