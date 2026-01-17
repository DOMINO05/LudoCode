import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import AuthPage from './AuthPage'
import CodingPage from './CodingPage'
import Dashboard from './Dashboard'
import ProfilePage from './ProfilePage'
import CoursesPage from './CoursesPage'
import ShopPage from './ShopPage'
import Layout from './Layout'
import QuizManagerPage from './QuizManagerPage'
import QuizEditorPage from './QuizEditorPage'
import QuestionCreatorPage from './QuestionCreatorPage'
import QuizPlayerPage from './QuizPlayerPage'
import QuizResultsPage from './QuizResultsPage'
import CommunityPage from './CommunityPage'

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
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/quizzes" element={<QuizManagerPage />} />
          <Route path="/quizzes/edit/:id" element={<QuizEditorPage />} />
          <Route path="/quizzes/:quizId/new-question" element={<QuestionCreatorPage />} />
          <Route path="/quizzes/:quizId/edit-question/:questionId" element={<QuestionCreatorPage />} />
          <Route path="/quizzes/results/:id" element={<QuizResultsPage />} />
          <Route path="/quiz/:code" element={<QuizPlayerPage />} />
          <Route path="/community" element={<CommunityPage />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} />} />
    </Routes>
  )
}

export default App
