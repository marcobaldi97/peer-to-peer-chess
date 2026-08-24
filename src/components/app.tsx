import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage, JoinPage } from 'features/chess/pages'
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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/join/:peerId" element={<JoinPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}

export default App
