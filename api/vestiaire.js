export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sac' } = req.query;
  try {
    const searchUrl = `https://fr.vestiairecollective.com/search/?q=${encodeURIComponent(q)}&order=created_at_desc`;
    const r = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Mode': 'navigate',
      }
    });
    const html = await r.text();
    const items = [];

    // Try __NEXT_DATA__
    const nd = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nd) {
      try {
        const data = JSON.parse(nd[1]);
        const prods = data?.props?.pageProps?.searchResults?.products
                   || data?.props?.pageProps?.initialProducts
                   || data?.props?.pageProps?.products
                   || [];
        for (const p of prods.slice(0, 20)) {
          const price = p.price?.cents ? p.price.cents/100 : parseFloat(p.price?.amount||p.price||0);
          if (!price || price < 10) continue;
          const link = p.link || p.url || `/produit-${p.id||p.slug}.shtml`;
          items.push({
            name:   p.name || p.description || p.brand,
            price,
            url:    link.startsWith('http') ? link : `https://fr.vestiairecollective.com${link}`,
            plat:   'Vestiaire',
            cond:   p.condition_label || p.condition || 'Très bon état',
            seller: p.seller?.username || p.seller?.login || '',
          });
        }
      } catch(e2) {}
    }

    // Regex fallback — Vestiaire embeds product data as JSON in script tags
    if (items.length === 0) {
      const scripts = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g);
      for (const sc of scripts) {
        if (!sc[1].includes('"productId"') && !sc[1].includes('"id"')) continue;
        const priceM = sc[1].matchAll(/"price":\{"amount":([\d.]+)[^}]*\}.*?"url":"([^"]+)"/g);
        for (const m of priceM) {
          if (items.length >= 15) break;
          items.push({ name:'Article Vestiaire', price:parseFloat(m[1]),
            url: m[2].startsWith('http') ? m[2] : `https://fr.vestiairecollective.com${m[2]}`,
            plat:'Vestiaire', cond:'Très bon état', seller:'' });
        }
        if (items.length > 0) break;
      }
    }
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
