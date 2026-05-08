export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers' } = req.query;
  try {
    // eBay RSS gives real /itm/ URLs — no auth needed
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}&_sop=10&_ipg=25&_rss=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FeedFetcher-Google; +http://www.google.com/feedfetcher.html)' }
    });
    const xml = await resp.text();
    const items = [];
    // RSS 2.0: each <item> block
    const blocks = xml.split(/<item[\s>]/i).slice(1);
    for (const b of blocks) {
      // title
      const t = (b.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)||[])[1];
      if (!t || /shop on ebay/i.test(t)) continue;
      const name = t.replace(/<[^>]+>/g,'').trim();

      // link — two formats in eBay RSS
      let itemUrl = '';
      const l1 = b.match(/<link>(https?:\/\/www\.ebay\.[^<]+)<\/link>/i);
      const l2 = b.match(/<guid[^>]*>(https?:\/\/www\.ebay\.[^<]+)<\/guid>/i);
      const l3 = b.match(/href="(https:\/\/www\.ebay\.fr\/itm\/[^"]+)"/i);
      if (l1) itemUrl = l1[1]; else if (l2) itemUrl = l2[1]; else if (l3) itemUrl = l3[1];
      if (!itemUrl || !itemUrl.includes('/itm/')) continue;
      // strip tracking params, keep clean URL
      itemUrl = itemUrl.split('?')[0].split('&')[0];

      // price
      const pm = b.match(/(\d[\d\s]*[,.]?\d*)\s*EUR/i) || b.match(/EUR\s*([\d,. ]+)/i);
      const price = pm ? parseFloat(pm[1].replace(/\s/g,'').replace(',','.')) : 0;

      // condition
      const cm = (b.match(/Occasion|Neuf|Used|New/i)||[])[0]||'Occasion';

      items.push({ name, price, url: itemUrl, plat: 'eBay', cond: cm, seller: '' });
    }
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
