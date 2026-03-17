import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { recommend, DEFAULT_PREFS } from '../lib/recommender'
import GameGrid from '../components/GameGrid/GameGrid'
import './Home.css'

const CACHE_KEY = 'steam_game_pool_v2'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours — keeps data fresh daily

const GENRE_FILTERS = [
  'All', 'Action', 'RPG', 'Strategy', 'Horror', 'Simulation',
  'Multiplayer', 'Free to Play', 'Indie', 'Sports',
]

const SORT_OPTIONS = [
  { value: 'match', label: 'Best Match' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'A - Z' },
  { value: 'metacritic', label: 'Metacritic Score' },
]

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
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, games } = JSON.parse(raw)
    if (Date.now() - ts < CACHE_TTL) return games
  } catch {}
  return null
}

function setCachedPool(games) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), games }))
  } catch {}
}

function getHiddenGames() {
  try { return new Set(JSON.parse(localStorage.getItem('hidden_games') || '[]')) } catch { return new Set() }
}

function addHiddenGame(appid) {
  try {
    const hidden = getHiddenGames()
    hidden.add(appid)
    localStorage.setItem('hidden_games', JSON.stringify([...hidden]))
  } catch {}
}

function applySort(games, sort) {
  const sorted = [...games]
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => (a.price ?? 999999) - (b.price ?? 999999))
    case 'price_desc':
      return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    case 'name_asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'metacritic':
      return sorted.sort((a, b) => (b.metacritic_score ?? 0) - (a.metacritic_score ?? 0))
    default:
      return sorted // 'match' — already sorted by score
  }
}

export default function Home() {
  const { profile } = useAuth()
  const [gamePool, setGamePool] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [activeGenre, setActiveGenre] = useState('All')
  const [sort, setSort] = useState('match')
  const [hiddenGames, setHiddenGames] = useState(getHiddenGames)
  const [showHidden, setShowHidden] = useState(false)

  const prefs = getPrefs(profile)

  const loadGames = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      let pool = forceRefresh ? null : getCachedPool()
      if (!pool) {
        const res = await fetch('/.netlify/functions/steam-featured')
        if (!res.ok) throw new Error(`Steam API error: ${res.status}`)
        const data = await res.json()
        pool = data.games || []
        if (pool.length > 0) setCachedPool(pool)
      }
      setGamePool(pool)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGames() }, [loadGames])

  // Re-score when prefs change but pool is already loaded
  const scoredGames = useMemo(() => recommend(gamePool, prefs, 200), [gamePool, profile])

  const displayGames = useMemo(() => {
    if (searchResults !== null) return searchResults

    let games = scoredGames

    // Filter hidden
    if (!showHidden) {
      games = games.filter(g => !hiddenGames.has(g.appid))
    }

    // Filter by genre
    if (activeGenre !== 'All') {
      games = games.filter(g =>
        (g.tags || g.genres || []).some(t =>
          t.toLowerCase().includes(activeGenre.toLowerCase())
        )
      )
    }

    // Sort
    return applySort(games, sort)
  }, [scoredGames, searchResults, activeGenre, sort, hiddenGames, showHidden])

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

  function handleHide(appid) {
    addHiddenGame(appid)
    setHiddenGames(getHiddenGames())
  }

  function clearHidden() {
    localStorage.removeItem('hidden_games')
    setHiddenGames(new Set())
  }

  const isSearchMode = searchResults !== null
  const hiddenCount = hiddenGames.size

  return (
    <div className="home">
      <div className="home-header">
        <div>
          <h1 className="home-title">
            {isSearchMode ? `Results for "${search}"` : 'Your Recommendations'}
          </h1>
          <p className="home-subtitle">
            {isSearchMode
              ? `${displayGames.length} games found`
              : `${displayGames.length} personalized picks`}
          </p>
        </div>

        <div className="home-controls">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              className="search-input"
              placeholder="Search Steam games..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={searching}>
              {searching ? '...' : 'Search'}
            </button>
            {isSearchMode && (
              <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setSearchResults(null) }}>
                Clear
              </button>
            )}
          </form>

          <div className="home-meta-controls">
            <select
              className="sort-select"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => loadGames(true)}
              title="Refresh game data"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!isSearchMode && (
        <div className="filter-row">
          <div className="genre-chips">
            {GENRE_FILTERS.map(genre => (
              <button
                key={genre}
                className={`genre-chip ${activeGenre === genre ? 'genre-chip-active' : ''}`}
                onClick={() => setActiveGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>

          <div className="filter-row-right">
            {hiddenCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowHidden(v => !v)}
              >
                {showHidden ? 'Hide dismissed' : `Show ${hiddenCount} dismissed`}
              </button>
            )}
            {showHidden && hiddenCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearHidden}>
                Clear dismissed
              </button>
            )}
            <a href="/profile" className="prefs-link">Edit preferences</a>
          </div>
        </div>
      )}

      <GameGrid
        games={displayGames}
        loading={loading || searching}
        error={error}
        onHide={handleHide}
      />
    </div>
  )
}
