/**
 * Searches Steam store by name, returns matching games with basic details.
 */
const STEAM_STORE = 'https://store.steampowered.com'

export default async function handler(req, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=300',
  }

  const url = new URL(req.url)
  const query = url.searchParams.get('q')

  if (!query) {
    return new Response(JSON.stringify({ error: 'q required' }), { status: 400, headers })
  }

  try {
    // Steam store search API
    const searchUrl = `${STEAM_STORE}/search/results/?term=${encodeURIComponent(query)}&json=1&cc=us&l=en`
    const res = await fetch(searchUrl, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }
    })
    const data = await res.json()

    // Parse results from Steam search HTML (Steam returns HTML even for ?json=1 for certain params)
    // Use the suggestion API instead which is proper JSON
    const suggestUrl = `${STEAM_STORE}/search/suggest?term=${encodeURIComponent(query)}&f=games&cc=US&l=english&excluded_content_descriptors[]=3&excluded_content_descriptors[]=4`
    const suggestRes = await fetch(suggestUrl, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9' }
    })
    const suggestData = await suggestRes.json()

    const games = (suggestData || []).slice(0, 10).map(item => ({
      appid: parseInt(item.appid || item.id),
      name: item.name,
      header_image: item.logo || `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid || item.id}/header.jpg`,
      price: item.price?.final ?? null,
      price_formatted: item.price?.final_formatted ?? null,
    }))

    return new Response(JSON.stringify({ games }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}
