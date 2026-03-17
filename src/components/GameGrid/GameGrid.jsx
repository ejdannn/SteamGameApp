import GameCard from '../GameCard/GameCard'
import './GameGrid.css'

export default function GameGrid({ games, loading, error }) {
  if (loading) {
    return (
      <div className="game-grid-status">
        <div className="loading-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="game-card-skeleton card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="game-grid-status">
        <div className="grid-error">
          <span>⚠️</span>
          <p>Failed to load games: {error}</p>
          <p className="grid-error-hint">Make sure you&apos;re running with <code>netlify dev</code>.</p>
        </div>
      </div>
    )
  }

  if (!games || games.length === 0) {
    return (
      <div className="game-grid-status">
        <p className="grid-empty">No recommendations found. Try adjusting your preferences.</p>
      </div>
    )
  }

  return (
    <div className="game-grid">
      {games.map(game => (
        <GameCard key={game.appid} game={game} />
      ))}
    </div>
  )
}
