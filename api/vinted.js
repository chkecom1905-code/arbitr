// ARBITR — Vinted Real-Time Scraper
// Vinted mobile API — returns actual live listings

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = 'sneakers', order = 'newest_first', per_page = 20, price_to = '' } = req.query;

  try {
    const params = new URLSearchParams({
      search_text: q,
      order,
      per_page,
      ...(price_to ? { price_to } : {}),
    });

    const url = `https://www.vinted.fr/api/v2/catalog/items?${params}`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Referer': 'https://www.vinted.fr/',
        'Origin': 'https://www.vinted.fr',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!resp.ok) {
      return res.status(resp.status).json({ error: `Vinted API error: ${resp.status}` });
    }

    const data = await resp.json();
    const items = (data.items || []).map(item => ({
      id:     item.id,
      name:   item.title,
      price:  parseFloat(item.price_numeric || item.price || 0),
      url:    `https://www.vinted.fr/items/${item.id}-${(item.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40)}`,
      image:  item.photos?.[0]?.url || '',
      seller: item.user?.login || '',
      size:   item.size_title || '',
      cond:   item.status === 6 ? 'Neuf avec étiquette' : item.status === 5 ? 'Très bon état' : item.status === 4 ? 'Bon état' : 'Satisfaisant',
      plat:   'Vinted',
      active: true,
    }));

    return res.status(200).json({ items, total: data.pagination?.total_count || items.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
