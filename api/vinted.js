export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers', price_to = '' } = req.query;
  try {
    const params = new URLSearchParams({ search_text: q, order: 'newest_first', per_page: '20' });
    if (price_to) params.set('price_to', price_to);
    const resp = await fetch(`https://www.vinted.fr/api/v2/catalog/items?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Cookie': '',
        'Referer': 'https://www.vinted.fr/catalog',
        'Origin': 'https://www.vinted.fr',
      }
    });
    if (!resp.ok) throw new Error(`${resp.status}`);
    const data = await resp.json();
    const items = (data.items || []).map(i => ({
      name:   i.title,
      price:  parseFloat(i.price_numeric || i.total_item_price?.amount || i.price || 0),
      url:    `https://www.vinted.fr/items/${i.id}-${(i.title||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)}`,
      plat:   'Vinted',
      cond:   i.status===6?'Neuf avec étiquette':i.status===5?'Très bon état':i.status===4?'Bon état':'Satisfaisant',
      seller: i.user?.login || '',
      image:  i.photos?.[0]?.url || '',
    })).filter(i => i.price > 0 && i.name);
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
