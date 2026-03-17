import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { recommend, DEFAULT_PREFS } from '../lib/recommender'
import GameGrid from '../components/GameGrid/GameGrid'
import './Home.css'

const CACHE_KEY = 'steam_game_pool'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function getPrefs(profile) {
  if (profile?.preferences) return profile.preferences
  try {
    const local = localStorage.getItem('guest_prefs')
    if (local) return JSON.parse(local)
  } catch {}
  return DEFAULT_PREFS
}

function getCachedPool() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, games } = JSON.parse(raw)
    if (Date.now() - ts < CACHE_TTL) return games
  } catch {}
  return null
}

function setCachedPool(games) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), games }))
  } catch {}
}

export default function Home() {
  const { profile } = useAuth()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const prefs = getPrefs(profile)

  const loadGames = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let pool = getCachedPool()
      if (!pool) {
        const res = await fetch('/.netlify/functions/steam-featured')
        if (!res.ok) throw new Error(`Steam API error: ${res.status}`)
        const data = await res.json()
        pool = data.games || []
        if (pool.length > 0) setCachedPool(pool)
      }
      const recommended = recommend(pool, prefs)
      setGames(recommended)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile]) // re-run when profile (prefs) changes

  useEffect(() => { loadGames() }, [loadGames])

  async function handleSearch(e) {
    e.preventDefault()
    if (!search.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const res = await fetch(`/.netlify/functions/steam-search?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      setSearchResults(data.games || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function clearSearch() {
    setSearch('')
    setSearchResults(null)
  }

  const displayGames = searchResults !== null ? searchResults : games
  const isSearchMode = searchResults !== null

  return (
    <div className="home">
      <div className="home-header">
        <div>
          <h1 className="home-title">
            {isSearchMode ? `Results for "${search}"` : '🎮 Your Recommendations'}
          </h1>
          <p className="home-subtitle">
            {isSearchMode
              ? `${displayGames.length} games found`
              : `Personalized picks based on your preferences`}
          </p>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="search"
            className="search-input"
            placeholder="Search Steam games..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={searching}>
            {searching ? '...' : '🔍'}
          </button>
          {isSearchMode && (
            <button type="button" className="btn btn-ghost" onClick={clearSearch}>
              ✕ Clear
            </button>
          )}
        </form>
      </div>

      {!isSearchMode && !loading && (
        <div className="prefs-banner">
          <span>Preferences active</span>
          <a href="/profile">Edit preferences →</a>
        </div>
      )}

      <GameGrid
        games={displayGames}
        loading={loading || searching}
        error={error}
      />
    </div>
  )
}
