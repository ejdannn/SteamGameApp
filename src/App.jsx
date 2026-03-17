import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Onboarding from './components/Onboarding/Onboarding'
import Home from './pages/Home'
import GameDetail from './pages/GameDetail'
import Profile from './pages/Profile'
import AuthModal from './components/Auth/AuthModal'
import './App.css'

function Navbar() {
  const { user, profile } = useAuth()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          SteamRec
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" end className="nav-link">Discover</NavLink>
          <NavLink to="/profile" className="nav-link">
            {user ? (profile?.username || 'Profile') : 'Profile'}
          </NavLink>
          {!user && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAuth(true)}>
              Sign In
            </button>
          )}
        </div>
      </div>
      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />
      )}
    </nav>
  )
}

function AppContent() {
  const { user, profile, loading, updateProfile } = useAuth()
  const [onboardingDone, setOnboardingDone] = useState(false)

  // Show onboarding if:
  // - not loading auth
  // - either not logged in (check localStorage) OR logged in but no preferences set
  const hasLocalPrefs = (() => {
    try { return !!localStorage.getItem('guest_prefs') } catch { return false }
  })()

  const needsOnboarding = !loading && !onboardingDone && (
    user ? !profile?.preferences : !hasLocalPrefs
  )

  async function handleOnboardingComplete(prefs) {
    if (user) {
      await updateProfile({ preferences: prefs })
    } else {
      localStorage.setItem('guest_prefs', JSON.stringify(prefs))
    }
    setOnboardingDone(true)
  }

  function handleOnboardingSkip() {
    localStorage.setItem('guest_prefs', JSON.stringify(
      JSON.parse(localStorage.getItem('guest_prefs') || 'null') || {}
    ))
    setOnboardingDone(true)
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <Onboarding
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    )
  }

  return (
    <>
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:appid" element={<GameDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}
