export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sac' } = req.query;
  try {
    const url = `https://fr.vestiairecollective.com/search/?q=${encodeURIComponent(q)}&order=price_asc`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Site': 'none',
      }
    });
    const html = await r.text();
    const items = [];

    // Strategy 1: __NEXT_DATA__
    const ndm = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (ndm) {
      try {
        const nd = JSON.parse(ndm[1]);
        const prods = nd?.props?.pageProps?.searchResults?.products
                   || nd?.props?.pageProps?.initialProducts
                   || nd?.props?.pageProps?.products || [];
        for (const p of prods.slice(0,20)) {
          const price = p.price?.cents ? p.price.cents/100 : parseFloat(p.price?.amount || p.price || 0);
          if (!price || price < 10) continue;
          const link = p.link || p.url || p.slug;
          if (!link) continue;
          items.push({
            name:   p.name || p.description || p.brand || 'Article',
            price,
            url:    link.startsWith('http') ? link : `https://fr.vestiairecollective.com${link}`,
            plat:   'Vestiaire',
            cond:   p.condition_label || p.condition || 'Très bon état',
            seller: p.seller?.username || p.seller?.login || '',
          });
        }
      } catch(e2) {}
    }

    // Strategy 2: product URLs from href
    if (items.length === 0) {
      const hrefs = [...html.matchAll(/href="(\/[^"]+\.shtml)"/g)];
      const seen = new Set();
      for (const m of hrefs.slice(0,20)) {
        if (seen.has(m[1])) continue; seen.add(m[1]);
        items.push({ name:'Article Vestiaire', price:0, url:`https://fr.vestiairecollective.com${m[1]}`, plat:'Vestiaire', cond:'Très bon état', seller:'' });
      }
    }

    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items:[], error: e.message });
  }
}
