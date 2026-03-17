import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient' // Make sure this path is correct!
import SeatingChart from './SeatingChart.jsx'
import LandingPage from './LandingPage.jsx'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check if a user is already logged in when the page loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Listen for login/logout events (like when Google redirect finishes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 3. Show a quick loading state so the landing page doesn't "flicker"
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading Chairvoyant...</div>
  }

  // 4. THE MAGIC SWITCH
  // If we have a session (logged in), show the App. Otherwise, show Landing.
  return (
    <>
      {session ? <SeatingChart /> : <LandingPage />}
    </>
  )
}