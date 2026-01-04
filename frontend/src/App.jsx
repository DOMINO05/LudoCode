import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AuthPage from './AuthPage'
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
      <h1>Welcome to LudoCode!</h1>
      <p>Logged in as {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
    </div>
  )
}

export default App
