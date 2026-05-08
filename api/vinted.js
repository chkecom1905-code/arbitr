// Vinted API — fetches real current listings
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers', price_to = '' } = req.query;

  // Step 1: get session token
  let sessionCookie = '';
  try {
    const init = await fetch('https://www.vinted.fr/', {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      }
    });
    const setCookie = init.headers.get('set-cookie') || '';
    sessionCookie = setCookie.split(/,(?=[^ ])/).map(c=>c.split(';')[0].trim()).join('; ');
  } catch(e){}

  // Step 2: call catalog API
  try {
    const qs = new URLSearchParams({ search_text:q, order:'price_low_to_high', per_page:'20' });
    if (price_to) qs.set('price_to', price_to);
    const r = await fetch(`https://www.vinted.fr/api/v2/catalog/items?${qs}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Referer': 'https://www.vinted.fr/',
        'X-Requested-With': 'XMLHttpRequest',
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      }
    });
    if (!r.ok) throw new Error(`${r.status}`);
    const data = await r.json();
    const items = (data.items||[]).map(i => ({
      name:   i.title,
      price:  parseFloat(i.price_numeric || i.price || 0),
      url:    `https://www.vinted.fr/items/${i.id}-${(i.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,50)}`,
      plat:   'Vinted',
      cond:   i.status===6?'Neuf avec étiquette':i.status===5?'Très bon état':i.status===4?'Bon état':'Satisfaisant',
      seller: i.user?.login||'',
    })).filter(i => i.price>0 && i.name && i.url.includes('/items/'));
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items:[], error: e.message });
  }
}
