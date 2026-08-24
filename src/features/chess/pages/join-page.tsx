import { useNavigate, useParams } from 'react-router-dom'
import ChessGame from '..'

export default function JoinPage() {
  const { peerId } = useParams<'peerId'>()
  const navigate = useNavigate()

  return (
    <ChessGame
      invitePeerId={peerId}
      onInviteSettled={(connected) => {
        if (!connected) navigate('/', { replace: true })
      }}
    />
  )
}
