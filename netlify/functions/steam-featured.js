/**
 * Fetches a large pool of Steam games using batch appdetails requests.
 * Targets 150+ games by combining hardcoded popular IDs + dynamic sources.
 */
const STEAM_STORE = 'https://store.steampowered.com'
const STEAM_API = 'https://api.steampowered.com'

// Curated list of popular/notable Steam games — always included in the pool
const POPULAR_APPIDS = [
  // Shooters / Action
  730, 440, 578080, 1172470, 359550, 976730, 1551360, 550, 107410,
  // Multiplayer / Battle Royale
  570, 252490, 892970, 1085660, 945360, 230410, 1172620,
  // Open World / RPG
  1091500, 292030, 1174180, 377160, 489830, 72850, 22370, 1593500,
  1245620, 814380, 1086940, 632470, 238960, 306130,
  // Indie / Platformer
  413150, 367520, 1195760, 105600, 391540, 1097150, 252950, 1113560,
  // Horror / Thriller
  2050650, 418370, 504230, 552590, 2246340,
  // Strategy / Sim
  1158310, 294100, 255710, 431240, 8930, 72200, 261550,
  // Classic / Valve
  220, 400, 620, 4000, 70,
  // Recent popular
  1623730, 990080, 582010, 601150, 1938090, 2358720,
  // More variety
  1151640, 646570, 774171, 1203220, 1182480, 1222670, 2379780,
  // Simulation / Casual
  413150, 1284210, 1059550, 1446780, 1062120, 1817070,
]

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en-US,en;q=0.9' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Fetch up to 20 appids in a single API call
async function fetchBatchDetails(appids) {
  try {
    const joined = appids.join(',')
    const data = await fetchJson(
      `${STEAM_STORE}/api/appdetails/?appids=${joined}&cc=us&l=en`
    )
    const results = []
    for (const appid of appids) {
      try {
        const details = data[String(appid)]?.data
        if (!details || details.type !== 'game') continue

        const tags = (details.genres || []).map(g => g.description)
        const categories = (details.categories || []).map(c => c.description)

        results.push({
          appid,
          name: details.name,
          short_description: details.short_description,
          header_image: details.header_image,
          price: details.is_free ? 0 : (details.price_overview?.final ?? 0),
          is_free: details.is_free,
          discount_percent: details.price_overview?.discount_percent ?? 0,
          tags: [...new Set([...tags, ...categories])],
          genres: tags,
          release_date: details.release_date?.date,
          metacritic_score: details.metacritic?.score ?? null,
          platforms: details.platforms,
          steam_url: `https://store.steampowered.com/app/${appid}`,
        })
      } catch { /* skip individual failures */ }
    }
    return results
  } catch {
    return []
  }
}

// Get trending/featured IDs dynamically from Steam
async function getDynamicIds() {
  const ids = []
  try {
    const data = await fetchJson(`${STEAM_STORE}/api/featuredcategories/?cc=us&l=en`)
    const lists = ['top_sellers', 'new_releases', 'specials', 'featured_win']
    for (const key of lists) {
      if (data[key]?.items) {
        for (const item of data[key].items) {
          if (item.id) ids.push(item.id)
        }
      }
    }
  } catch { /* continue with what we have */ }

  try {
    const data = await fetchJson(
      `${STEAM_API}/ISteamChartsService/GetMostPlayedGames/v1/?format=json`
    )
    for (const r of (data.response?.ranks || []).slice(0, 50)) {
      if (r.appid) ids.push(r.appid)
    }
  } catch { /* continue */ }

  return ids
}

export default async function handler(req, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  }

  try {
    const dynamicIds = await getDynamicIds()

    // Merge hardcoded + dynamic, deduplicate
    const allIds = [...new Set([...POPULAR_APPIDS, ...dynamicIds])]

    // Split into batches of 20 appids each
    const BATCH_SIZE = 20
    const batches = []
    for (let i = 0; i < Math.min(allIds.length, 160); i += BATCH_SIZE) {
      batches.push(allIds.slice(i, i + BATCH_SIZE))
    }

    // Fetch all batches in parallel
    const batchResults = await Promise.allSettled(
      batches.map(batch => fetchBatchDetails(batch))
    )

    const games = []
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        games.push(...result.value)
      }
    }

    // Deduplicate by appid
    const seen = new Set()
    const uniqueGames = games.filter(g => {
      if (seen.has(g.appid)) return false
      seen.add(g.appid)
      return true
    })

    return new Response(JSON.stringify({ games: uniqueGames }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}
