/**
 * Fetches full details + scrapes user tags for a single Steam app.
 */
const STEAM_STORE = 'https://store.steampowered.com'

async function scrapeTags(appid) {
  try {
    const res = await fetch(`${STEAM_STORE}/app/${appid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GameRecommender/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'birthtime=0; lastagecheckage=1-0-1990',
      },
    })
    const html = await res.text()

    // Extract tags from the glance tags section
    const tagRegex = /class="app_tag"[^>]*>\s*([^<]+)\s*</g
    const tags = []
    let match
    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1].trim()
      if (tag && tag !== '+') tags.push(tag)
    }
    return tags.slice(0, 20)
  } catch {
    return []
  }
}

export default async function handler(req, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=86400',
  }

  const url = new URL(req.url)
  const appid = url.searchParams.get('appid')

  if (!appid) {
    return new Response(JSON.stringify({ error: 'appid required' }), { status: 400, headers })
  }

  try {
    const [apiRes, scrapedTags] = await Promise.all([
      fetch(`${STEAM_STORE}/api/appdetails/?appids=${appid}&cc=us&l=en`)
        .then(r => r.json()),
      scrapeTags(appid),
    ])

    const details = apiRes[appid]?.data
    if (!details) {
      return new Response(JSON.stringify({ error: 'Game not found' }), { status: 404, headers })
    }

    const apiTags = (details.genres || []).map(g => g.description)
    const categories = (details.categories || []).map(c => c.description)
    const allTags = [...new Set([...scrapedTags, ...apiTags, ...categories])]

    const game = {
      appid: parseInt(appid),
      name: details.name,
      detailed_description: details.detailed_description,
      short_description: details.short_description,
      header_image: details.header_image,
      screenshots: (details.screenshots || []).slice(0, 4).map(s => s.path_full),
      movies: (details.movies || []).slice(0, 1).map(m => ({
        name: m.name,
        thumbnail: m.thumbnail,
        mp4: m.mp4?.max,
        webm: m.webm?.max,
      })),
      price: details.is_free ? 0 : (details.price_overview?.final ?? 0),
      price_formatted: details.is_free ? 'Free' : (details.price_overview?.final_formatted ?? 'N/A'),
      is_free: details.is_free,
      discount_percent: details.price_overview?.discount_percent ?? 0,
      tags: allTags,
      genres: apiTags,
      developers: details.developers || [],
      publishers: details.publishers || [],
      release_date: details.release_date?.date,
      metacritic_score: details.metacritic?.score ?? null,
      metacritic_url: details.metacritic?.url ?? null,
      recommendations: details.recommendations?.total ?? null,
      achievements: details.achievements?.total ?? null,
      platforms: details.platforms,
      required_age: details.required_age,
      website: details.website,
      steam_url: `https://store.steampowered.com/app/${appid}`,
      dlc: (details.dlc || []).slice(0, 5),
      background_image: details.background,
    }

    return new Response(JSON.stringify({ game }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}
