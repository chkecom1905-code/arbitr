export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers' } = req.query;
  try {
    const url = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(q)}&sort=time&owner_type=private`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
      }
    });
    const html = await resp.text();
    const items = [];
    // Extract __NEXT_DATA__
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s);
    if (match) {
      const data = JSON.parse(match[1]);
      const ads = data?.props?.pageProps?.initialData?.data?.ads
                || data?.props?.pageProps?.searchData?.ads
                || data?.props?.pageProps?.ads
                || [];
      for (const ad of ads.slice(0,15)) {
        const price = ad.price?.[0] || ad.attributes?.find(a=>a.key==='price')?.value_label?.replace(/[^\d]/g,'');
        if (!price || parseInt(price) < 5) continue;
        items.push({
          name:   ad.subject || ad.title || 'Article',
          price:  parseInt(price),
          url:    ad.url ? `https://www.leboncoin.fr${ad.url}` : `https://www.leboncoin.fr/ad/${ad.list_id}`,
          plat:   'Leboncoin',
          cond:   'Occasion',
          seller: ad.owner?.name || '',
        });
      }
    }
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
