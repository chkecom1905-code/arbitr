// eBay RSS Feed v3 — handles all eBay RSS link formats
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers' } = req.query;
  try {
    // _sop=15 = lowest price first, guaranteed real current listings
    const rssUrl = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}&_sop=15&_ipg=25&_rss=1`;
    const r = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/xml, application/xml, application/rss+xml, */*',
      }
    });
    const xml = await r.text();
    const items = [];

    // Split on <item> tags
    const parts = xml.split(/<item>/i);
    for (let i = 1; i < parts.length && items.length < 15; i++) {
      const block = parts[i];
      // --- Title ---
      const titleM = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      if (!titleM) continue;
      const name = titleM[1].replace(/<[^>]+>/g,'').trim();
      if (!name || /shop on ebay/i.test(name)) continue;

      // --- URL: try multiple formats ---
      let url = '';
      // Format 1: <link>URL</link>
      const m1 = block.match(/<link[^>]*>\s*(https?:\/\/www\.ebay[^<\s]+)\s*<\/link>/i);
      // Format 2: <link/> then URL as text (atom style)
      const m2 = block.match(/<link[^>]*\/>\s*\n?\s*(https?:\/\/www\.ebay[^<\s]+)/i);
      // Format 3: <guid>
      const m3 = block.match(/<guid[^>]*>\s*(https?:\/\/www\.ebay[^<\s]+)\s*<\/guid>/i);
      // Format 4: href attribute
      const m4 = block.match(/href="(https?:\/\/www\.ebay\.fr\/itm\/[^"]+)"/i);

      if (m1) url = m1[1]; else if (m2) url = m2[1];
      else if (m3) url = m3[1]; else if (m4) url = m4[1];

      if (!url) continue;
      // Must be a direct item page
      if (!url.includes('/itm/') && !url.includes('/i.html')) {
        // try to find any itm link in block
        const itm = block.match(/(https?:\/\/www\.ebay\.fr\/itm\/\d+)/i);
        if (itm) url = itm[1]; else continue;
      }
      // Clean URL — remove tracking params
      url = url.split('?')[0].split('&')[0];
      if (!url.includes('/itm/') ) continue;

      // --- Price ---
      const pm = block.match(/(\d[\d\s]*[.,]\d{2})\s*EUR/i)
               || block.match(/EUR\s*([\d.,]+)/i)
               || block.match(/<g:price[^>]*>([\d.,]+)/i);
      const price = pm ? parseFloat(pm[1].replace(/\s/g,'').replace(',','.')) : 0;

      // --- Condition ---
      const cm = block.match(/(Neuf|Occasion|Used|New|Très bon)/i);

      items.push({ name, price, url, plat:'eBay', cond: cm?cm[1]:'Occasion', seller:'' });
    }
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items:[], error: e.message });
  }
}
