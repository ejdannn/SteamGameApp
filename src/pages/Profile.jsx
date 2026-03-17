import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { useAuth } from '../context/AuthContext'
import AuthModal from '../components/Auth/AuthModal'
import { DEFAULT_PREFS } from '../lib/recommender'
import './Profile.css'

const PREF_LABELS = {
  actionVsStrategy: { label: 'Action vs Strategy', left: 'Strategy', right: 'Action' },
  rpgDepth: { label: 'RPG Depth', left: 'Not interested', right: 'Love RPGs' },
  horror: { label: 'Horror', left: 'Avoid it', right: 'Love it' },
  simulation: { label: 'Simulation', left: 'Not interested', right: 'Love it' },
  soloVsMulti: { label: 'Solo vs Multiplayer', left: 'Solo', right: 'Multiplayer' },
  shortVsLong: { label: 'Game Length', left: 'Short', right: 'Long' },
  difficulty: { label: 'Difficulty', left: 'Casual', right: 'Hardcore' },
  priceSensitivity: { label: 'Budget', left: 'Free only', right: 'Any price' },
}

function getGameMetaCache() {
  try { return JSON.parse(localStorage.getItem('game_meta_cache') || '{}') } catch { return {} }
}

function SavedGamesList({ appids, onNavigate }) {
  const metaCache = getGameMetaCache()
  return (
    <div className="saved-games-list">
      {appids.map(appid => {
        const meta = metaCache[appid]
        return (
          <div
            key={appid}
            className="saved-game-row"
            onClick={() => onNavigate(`/game/${appid}`)}
          >
            <img
              src={meta?.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`}
              alt={meta?.name || `Game ${appid}`}
              className="saved-game-thumb"
            />
            <span className="saved-game-name">{meta?.name || `App #${appid}`}</span>
            <span className="saved-game-arrow">View</span>
          </div>
        )
      })}
    </div>
  )
}

function MiniSlider({ prefKey, value, onChange }) {
  const info = PREF_LABELS[prefKey]
  return (
    <div className="mini-slider">
      <div className="mini-slider-header">
        <span className="mini-slider-label">{info.label}</span>
        <span className="mini-slider-value">{value}/10</span>
      </div>
      <div className="mini-slider-row">
        <span className="mini-endpoint">{info.left}</span>
        <SliderPrimitive.Root
          className="slider-root"
          min={0} max={10} step={1}
          value={[value]}
          onValueChange={([v]) => onChange(prefKey, v)}
        >
          <SliderPrimitive.Track className="slider-track">
            <SliderPrimitive.Range className="slider-range" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="slider-thumb" aria-label={info.label} />
        </SliderPrimitive.Root>
        <span className="mini-endpoint">{info.right}</span>
      </div>
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfile } = useAuth()
  const [showAuth, setShowAuth] = useState(!user)
  const [editingPrefs, setEditingPrefs] = useState(false)
  const [prefs, setPrefs] = useState(
    profile?.preferences || (() => {
      try { return JSON.parse(localStorage.getItem('guest_prefs')) || DEFAULT_PREFS } catch { return DEFAULT_PREFS }
    })()
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handlePrefChange(key, value) {
    setPrefs(p => ({ ...p, [key]: value }))
  }

  async function savePrefs() {
    setSaving(true)
    if (user) {
      await updateProfile({ preferences: prefs })
    } else {
      localStorage.setItem('guest_prefs', JSON.stringify(prefs))
    }
    setSaving(false)
    setSaved(true)
    setEditingPrefs(false)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  if (!user && showAuth) {
    return (
      <div className="profile-page">
        <div className="profile-guest">
          <h1>Your Profile</h1>
          <p>Sign in to save your preferences and game list across devices.</p>
          <div className="profile-guest-actions">
            <button className="btn btn-primary" onClick={() => setShowAuth(true)}>
              Sign In / Create Account
            </button>
            <button className="btn btn-ghost" onClick={() => setShowAuth(false)}>
              Continue as Guest
            </button>
          </div>
        </div>
        {showAuth && (
          <AuthModal
            onClose={() => setShowAuth(false)}
            onSuccess={() => setShowAuth(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div>
            <h1>Profile</h1>
            {user ? (
              <p className="profile-email">{profile?.username || user.email}</p>
            ) : (
              <p className="profile-email">Guest mode — preferences saved locally</p>
            )}
          </div>
          <div className="profile-header-actions">
            {user ? (
              <button className="btn btn-ghost" onClick={handleSignOut}>Sign Out</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowAuth(true)}>Sign In</button>
            )}
          </div>
        </div>

        <div className="profile-section card">
          <div className="section-header">
            <h2>Game Preferences</h2>
            {!editingPrefs && (
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPrefs(true)}>
                Edit
              </button>
            )}
          </div>

          <div className="prefs-grid">
            {Object.keys(PREF_LABELS).map(key => (
              <MiniSlider
                key={key}
                prefKey={key}
                value={prefs[key] ?? 5}
                onChange={editingPrefs ? handlePrefChange : () => {}}
              />
            ))}
          </div>

          {editingPrefs && (
            <div className="section-actions">
              <button className="btn btn-ghost" onClick={() => setEditingPrefs(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={savePrefs} disabled={saving}>
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
              </button>
            </div>
          )}
        </div>

        {user && (profile?.saved_games?.length > 0) && (
          <div className="profile-section card">
            <h2>Saved Games ({profile.saved_games.length})</h2>
            <SavedGamesList appids={profile.saved_games} onNavigate={navigate} />
          </div>
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}
    </div>
  )
}
