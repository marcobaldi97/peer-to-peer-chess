export enum PlayerKind {
  LocalHuman = 'local-human',
  RemoteHuman = 'remote-human', // TODO — not implemented
  Computer = 'computer' // TODO — not implemented
}
// use-game.ts only special-cases PlayerKind.LocalHuman for now; adding a new
// kind later means adding a new branch there, not redesigning this type.

export type Player = {
  id: string
  name: string
  kind: PlayerKind
}
