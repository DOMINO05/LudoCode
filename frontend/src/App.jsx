import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AuthPage from './AuthPage'
import CodingPage from './CodingPage'
import Dashboard from './Dashboard'
import ProfilePage from './ProfilePage'
import Layout from './Layout'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div>Loading app...</div>

  return (
    <Routes>
      <Route path="/" element={!session ? <AuthPage /> : <Navigate to="/dashboard" />} />
      
      {session && (
        <Route element={<Layout session={session} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/solve" element={<CodingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} />} />
    </Routes>
  )
}

export default App
