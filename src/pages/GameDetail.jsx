import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './GameDetail.css'

export default function GameDetail() {
  const { appid } = useParams()
  const navigate = useNavigate()
  const { user, isGameSaved, toggleSavedGame } = useAuth()
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/.netlify/functions/steam-details?appid=${appid}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setGame(data.game)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [appid])

  async function handleSave() {
    if (!user) { navigate('/profile'); return }
    setSaving(true)
    await toggleSavedGame(parseInt(appid))
    setSaving(false)
  }

  if (loading) return (
    <div className="detail-loading">
      <div className="detail-skeleton" />
    </div>
  )

  if (error) return (
    <div className="detail-error">
      <p>⚠️ {error}</p>
      <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
    </div>
  )

  if (!game) return null

  const saved = isGameSaved(parseInt(appid))
  const priceDisplay = game.is_free ? 'Free to Play'
    : game.price > 0 ? `$${(game.price / 100).toFixed(2)}`
    : 'N/A'

  return (
    <div className="game-detail">
      {game.background_image && (
        <div
          className="detail-hero-bg"
          style={{ backgroundImage: `url(${game.background_image})` }}
        />
      )}

      <div className="detail-container">
        <button className="btn btn-ghost detail-back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="detail-main">
          <div className="detail-left">
            <img
              src={game.header_image}
              alt={game.name}
              className="detail-header-img"
            />

            {game.screenshots?.length > 0 && (
              <div className="detail-screenshots">
                {game.screenshots.slice(0, 3).map((url, i) => (
                  <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="detail-screenshot" />
                ))}
              </div>
            )}
          </div>

          <div className="detail-right">
            <h1 className="detail-title">{game.name}</h1>

            <p
              className="detail-desc"
              dangerouslySetInnerHTML={{ __html: game.short_description }}
            />

            <div className="detail-meta">
              {game.developers?.length > 0 && (
                <div className="meta-row">
                  <span className="meta-label">Developer</span>
                  <span>{game.developers.join(', ')}</span>
                </div>
              )}
              {game.release_date && (
                <div className="meta-row">
                  <span className="meta-label">Release Date</span>
                  <span>{game.release_date}</span>
                </div>
              )}
              {game.metacritic_score && (
                <div className="meta-row">
                  <span className="meta-label">Metacritic</span>
                  <span className={`metacritic-score ${game.metacritic_score >= 75 ? 'mc-green' : game.metacritic_score >= 50 ? 'mc-yellow' : 'mc-red'}`}>
                    {game.metacritic_score}
                  </span>
                </div>
              )}
              {game.recommendations && (
                <div className="meta-row">
                  <span className="meta-label">Recommendations</span>
                  <span>{game.recommendations.toLocaleString()}</span>
                </div>
              )}
            </div>

            {game.tags?.length > 0 && (
              <div className="detail-tags">
                {game.tags.slice(0, 12).map(tag => (
                  <span key={tag} className="game-tag">{tag}</span>
                ))}
              </div>
            )}

            <div className="detail-actions">
              <div className="detail-price">
                {game.discount_percent > 0 && (
                  <span className="price-discount">-{game.discount_percent}%</span>
                )}
                <span className={game.is_free ? 'price-free' : ''}>{priceDisplay}</span>
              </div>

              <a
                href={game.steam_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                View on Steam ↗
              </a>

              <button
                className={`btn ${saved ? 'btn-danger' : 'btn-ghost'}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saved ? '♥ Saved' : '♡ Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
