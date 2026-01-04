import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AuthPage from './AuthPage'
import CodingPage from './CodingPage'
import './App.css'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return <AuthPage />
  }

  return (
    <div className="App">
      <header style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc' }}>
        <h2>LudoCode</h2>
        <div>
          <span style={{ marginRight: '10px' }}>{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
        </div>
      </header>
      <CodingPage session={session} />
    </div>
  )
}

export default App
