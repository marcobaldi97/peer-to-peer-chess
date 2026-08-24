import ChessGame from 'features/chess'
import { Agentation } from 'agentation'

function App() {
  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <Agentation
          endpoint="http://localhost:4747"
          onSessionCreated={(sessionId) =>
            console.log(`Session #${sessionId} created`)
          }
        />
      )}
      <div className="flex min-h-screen flex-col bg-bg font-body text-text">
        <ChessGame />
      </div>
    </>
  )
}

export default App
