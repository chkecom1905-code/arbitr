export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers', price_to = '' } = req.query;

  // Get session cookie first
  let cookies = '';
  try {
    const init = await fetch('https://www.vinted.fr/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      redirect: 'follow'
    });
    const raw = init.headers.get('set-cookie') || '';
    // extract all cookie name=value pairs
    cookies = raw.split(/,(?=[^ ])/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(e) {}

  try {
    const params = new URLSearchParams({ search_text: q, order: 'newest_first', per_page: '20' });
    if (price_to) params.set('price_to', price_to);
    const r = await fetch(`https://www.vinted.fr/api/v2/catalog/items?${params}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://www.vinted.fr/',
        ...(cookies ? { Cookie: cookies } : {}),
      }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const items = (data.items || []).map(i => {
      const slug = (i.title||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60);
      return {
        name:   i.title,
        price:  parseFloat(i.price_numeric || i.price || 0),
        url:    `https://www.vinted.fr/items/${i.id}-${slug}`,
        plat:   'Vinted',
        cond:   i.status===6?'Neuf avec étiquette':i.status===5?'Très bon état':i.status===4?'Bon état':'Satisfaisant',
        seller: i.user?.login || '',
      };
    }).filter(i => i.price > 0 && i.name && i.id);
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
