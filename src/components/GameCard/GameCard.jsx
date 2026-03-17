import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './GameCard.css'

function ScoreBadge({ score }) {
  const pct = Math.round(score)
  const cls = pct >= 75 ? 'badge-high' : pct >= 50 ? 'badge-mid' : 'badge-low'
  return <span className={`score-badge ${cls}`}>{pct}% match</span>
}

function PriceTag({ price, isFree, discount }) {
  if (isFree) return <span className="price-tag price-free">Free</span>
  if (!price && price !== 0) return null
  const dollars = (price / 100).toFixed(2)
  return (
    <span className="price-tag">
      {discount > 0 && <span className="price-discount">-{discount}%</span>}
      ${dollars}
    </span>
  )
}

export default function GameCard({ game }) {
  const navigate = useNavigate()
  const { user, isGameSaved, toggleSavedGame } = useAuth()
  const [saving, setSaving] = useState(false)
  const saved = isGameSaved(game.appid)

  async function handleSave(e) {
    e.stopPropagation()
    if (!user) {
      navigate('/profile')
      return
    }
    setSaving(true)
    await toggleSavedGame(game.appid)
    setSaving(false)
  }

  return (
    <div className="game-card card" onClick={() => navigate(`/game/${game.appid}`)}>
      <div className="game-card-image-wrap">
        <img
          src={game.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
          alt={game.name}
          className="game-card-image"
          loading="lazy"
          onError={e => { e.target.src = '/placeholder-game.jpg' }}
        />
        <div className="game-card-overlay">
          <ScoreBadge score={game.score ?? 50} />
        </div>
        <button
          className={`save-btn ${saved ? 'save-btn-saved' : ''}`}
          onClick={handleSave}
          disabled={saving}
          title={saved ? 'Remove from saved' : 'Save game'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>

      <div className="game-card-body">
        <h3 className="game-card-title">{game.name}</h3>
        <div className="game-card-tags">
          {(game.tags || game.genres || []).slice(0, 3).map(tag => (
            <span key={tag} className="game-tag">{tag}</span>
          ))}
        </div>
        <div className="game-card-footer">
          <PriceTag
            price={game.price}
            isFree={game.is_free}
            discount={game.discount_percent}
          />
        </div>
      </div>
    </div>
  )
}
