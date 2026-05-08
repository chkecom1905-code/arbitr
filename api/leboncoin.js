export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers' } = req.query;
  try {
    const url = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(q)}&sort=price&order=asc&owner_type=private`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Site': 'none',
      }
    });
    const html = await r.text();
    const items = [];

    // Strategy 1: extract __NEXT_DATA__
    const ndm = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (ndm) {
      try {
        const nd = JSON.parse(ndm[1]);
        const ads = nd?.props?.pageProps?.initialData?.data?.ads
                 || nd?.props?.pageProps?.ads
                 || nd?.props?.pageProps?.searchData?.ads || [];
        for (const ad of ads.slice(0,20)) {
          const price = ad.price?.[0];
          if (!price || price < 5) continue;
          items.push({
            name:   ad.subject || 'Annonce',
            price,
            url:    `https://www.leboncoin.fr/ad/${ad.list_id}`,
            plat:   'Leboncoin',
            cond:   'Occasion',
            seller: ad.owner?.name || '',
          });
        }
      } catch(e2) {}
    }

    // Strategy 2: regex on embedded JSON
    if (items.length === 0) {
      const matches = [...html.matchAll(/"list_id":(\d+).*?"subject":"([^"]+)".*?"price":\[(\d+)\]/g)];
      for (const m of matches.slice(0,15)) {
        items.push({ name:m[2], price:parseInt(m[3]), url:`https://www.leboncoin.fr/ad/${m[1]}`, plat:'Leboncoin', cond:'Occasion', seller:'' });
      }
    }

    // Strategy 3: href patterns
    if (items.length === 0) {
      const hrefs = [...html.matchAll(/href="(\/ad\/\d+[^"]+)"/g)];
      const seen = new Set();
      for (const m of hrefs.slice(0,20)) {
        const path = m[1].split('?')[0];
        if (seen.has(path)) continue;
        seen.add(path);
        items.push({ name:'Annonce Leboncoin', price:0, url:`https://www.leboncoin.fr${path}`, plat:'Leboncoin', cond:'Occasion', seller:'' });
      }
    }

    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items:[], error: e.message });
  }
}
