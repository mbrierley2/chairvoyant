import { useState, useEffect } from 'react'
import SeatingChartApp from './SeatingChart.jsx'
import LandingPage from './LandingPage.jsx'

export default function App() {
  const [page, setPage] = useState(window.location.hash === '#/app' ? 'app' : 'landing')

  useEffect(() => {
    const handleHash = () => {
      setPage(window.location.hash === '#/app' ? 'app' : 'landing')
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  if (page === 'app') return <SeatingChartApp />
  return <LandingPage />
}
