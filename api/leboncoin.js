// ARBITR — Leboncoin Real-Time Scraper
// Uses Leboncoin's internal search API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = 'sneakers', max_price = '' } = req.query;

  try {
    const body = {
      limit: 20,
      limit_alu: 3,
      filters: {
        category: { id: '10' }, // Mode
        keywords: { text: q, type: 'all' },
        location: {},
        owner: { type: 'private' },
        ...(max_price ? { price: { max: parseInt(max_price) } } : {}),
      },
      sort_by: 'time',
      sort_order: 'desc',
    };

    const resp = await fetch('https://api.leboncoin.fr/api/adfinder/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LBC;Android;7.1.2;a5f9d4a8;3270',
        'Accept': 'application/json',
        'api_key': 'ba0c2423-6c29-41e4-8e2c-5e5a4c4e4e4e',
        'Origin': 'https://www.leboncoin.fr',
        'Referer': 'https://www.leboncoin.fr/',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      // Fallback: scrape search page
      return await scrapeLeboncoin(q, max_price, res);
    }

    const data = await resp.json();
    const items = (data.ads || []).map(ad => ({
      name:   ad.subject,
      price:  ad.price?.[0] || 0,
      url:    `https://www.leboncoin.fr/ad/${ad.list_id}/${ad.slug || ''}`,
      plat:   'Leboncoin',
      cond:   'Occasion',
      seller: ad.owner?.name || '',
      active: true,
    })).filter(i => i.price > 0);

    return res.status(200).json({ items, total: items.length });
  } catch (err) {
    return await scrapeLeboncoin(q, max_price, res);
  }
}

async function scrapeLeboncoin(q, max_price, res) {
  try {
    let url = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(q)}&sort=time`;
    if (max_price) url += `&price=max-${max_price}`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
    });

    const html = await resp.text();
    const items = [];

    // Extract __NEXT_DATA__ JSON embedded in the page
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (nextDataMatch) {
      const nextData = JSON.parse(nextDataMatch[1]);
      const ads = nextData?.props?.pageProps?.ads || nextData?.props?.pageProps?.initialData?.data?.ads || [];
      ads.slice(0, 15).forEach(ad => {
        if (!ad.price?.[0] || ad.price[0] < 5) return;
        items.push({
          name:   ad.subject || ad.title,
          price:  ad.price[0],
          url:    `https://www.leboncoin.fr/ad/${ad.list_id}`,
          plat:   'Leboncoin',
          cond:   'Occasion',
          seller: ad.owner?.name || '',
          active: true,
        });
      });
    }

    return res.status(200).json({ items, total: items.length });
  } catch(e) {
    return res.status(500).json({ error: e.message, items: [] });
  }
}
