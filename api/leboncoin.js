export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers' } = req.query;
  try {
    const searchUrl = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(q)}&sort=time&owner_type=private`;
    const r = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Dest': 'document',
      }
    });
    const html = await r.text();
    const items = [];

    // Try __NEXT_DATA__ first
    const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextMatch) {
      try {
        const nd = JSON.parse(nextMatch[1]);
        const ads = nd?.props?.pageProps?.initialData?.data?.ads
                 || nd?.props?.pageProps?.ads
                 || nd?.props?.pageProps?.searchData?.ads
                 || [];
        for (const ad of ads.slice(0, 20)) {
          const priceVal = ad.price?.[0]
            || parseInt((ad.attributes||[]).find(a=>a.key==='price')?.value||'0');
          if (!priceVal || priceVal < 5) continue;
          const id = ad.list_id;
          if (!id) continue;
          items.push({
            name:   ad.subject || ad.title || 'Annonce',
            price:  priceVal,
            url:    `https://www.leboncoin.fr/ad/${id}`,
            plat:   'Leboncoin',
            cond:   'Occasion',
            seller: ad.owner?.name || '',
          });
        }
      } catch(e2) {}
    }

    // Fallback: regex on HTML
    if (items.length === 0) {
      const idMatches = html.matchAll(/"list_id":(\d+),"first_publication_date[^"]*","subject":"([^"]+)","body":"[^"]*","price":\[(\d+)\]/g);
      for (const m of idMatches) {
        if (items.length >= 15) break;
        items.push({
          name:  m[2],
          price: parseInt(m[3]),
          url:   `https://www.leboncoin.fr/ad/${m[1]}`,
          plat:  'Leboncoin',
          cond:  'Occasion',
          seller: '',
        });
      }
    }
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
