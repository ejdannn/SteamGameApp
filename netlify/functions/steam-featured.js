/**
 * Fetches a pool of Steam games from multiple category endpoints.
 * Returns an array of game objects with tags, price, and metadata.
 */
const STEAM_STORE = 'https://store.steampowered.com'
const STEAM_API = 'https://api.steampowered.com'

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

// Fetch top sellers list (returns appids)
async function getTopSellers() {
  try {
    const data = await fetchJson(
      `${STEAM_STORE}/api/featuredcategories/?cc=us&l=en`
    )
    const ids = []
    const lists = ['top_sellers', 'new_releases', 'specials', 'coming_soon']
    for (const key of lists) {
      if (data[key]?.items) {
        for (const item of data[key].items) {
          if (item.id && !ids.includes(item.id)) ids.push(item.id)
        }
      }
    }
    return ids.slice(0, 60)
  } catch {
    return []
  }
}

// Fetch the global top 100 by player count
async function getPopularAppIds() {
  try {
    const data = await fetchJson(
      `${STEAM_API}/ISteamChartsService/GetMostPlayedGames/v1/?format=json`
    )
    return (data.response?.ranks || [])
      .slice(0, 60)
      .map(r => r.appid)
  } catch {
    return []
  }
}

// Fetch details for a batch of appids (max ~5 at once to avoid timeouts)
async function fetchBatchDetails(appids) {
  const results = []
  for (const appid of appids) {
    try {
      const data = await fetchJson(
        `${STEAM_STORE}/api/appdetails/?appids=${appid}&cc=us&l=en`
      )
      const details = data[appid]?.data
      if (!details || details.type !== 'game') continue

      const price = details.is_free
        ? 0
        : (details.price_overview?.final ?? 0)

      const tags = (details.genres || []).map(g => g.description)
      const categories = (details.categories || []).map(c => c.description)

      results.push({
        appid,
        name: details.name,
        short_description: details.short_description,
        header_image: details.header_image,
        price, // in cents
        is_free: details.is_free,
        tags: [...tags, ...categories],
        genres: (details.genres || []).map(g => g.description),
        release_date: details.release_date?.date,
        metacritic_score: details.metacritic?.score ?? null,
        platforms: details.platforms,
        required_age: details.required_age,
        website: details.website,
        steam_url: `https://store.steampowered.com/app/${appid}`,
      })
    } catch {
      // skip failed games
    }

    // Small delay to be polite to Steam's servers
    await new Promise(r => setTimeout(r, 150))
  }
  return results
}

export default async function handler(req, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  }

  try {
    const [featuredIds, popularIds] = await Promise.all([
      getTopSellers(),
      getPopularAppIds(),
    ])

    // Merge and deduplicate
    const allIds = [...new Set([...featuredIds, ...popularIds])].slice(0, 80)

    // Fetch details in smaller batches to avoid timeout
    const BATCH = 10
    const games = []
    for (let i = 0; i < Math.min(allIds.length, 40); i += BATCH) {
      const batch = allIds.slice(i, i + BATCH)
      const details = await fetchBatchDetails(batch)
      games.push(...details)
    }

    return new Response(JSON.stringify({ games }), { status: 200, headers })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    )
  }
}
