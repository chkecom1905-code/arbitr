export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sneakers' } = req.query;
  try {
    const url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}&_sop=10&_ipg=20&LH_Sold=0&LH_Complete=0`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
      }
    });
    const html = await resp.text();
    const items = [];
    // Split by listing item
    const blocks = html.split('srp-item-container');
    for (let i = 1; i < blocks.length && items.length < 12; i++) {
      const b = blocks[i];
      // Title
      const titleM = b.match(/class="[^"]*s-item__title[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/);
      if (!titleM || titleM[1].includes('Shop on eBay')) continue;
      const name = titleM[1].replace(/NEW LISTING/i,'').trim();
      // Price EUR
      const priceM = b.match(/class="[^"]*s-item__price[^"]*"[^>]*>([^<]*EUR[^<]*)</);
      if (!priceM) continue;
      const priceStr = priceM[1].replace(/[^\d,]/g,'').replace(',','.');
      const price = parseFloat(priceStr);
      if (!price || price < 5) continue;
      // URL
      const urlM = b.match(/href="(https:\/\/www\.ebay\.fr\/itm\/[^"?&]+)/);
      if (!urlM) continue;
      // Condition
      const condM = b.match(/class="[^"]*SECONDARY_INFO[^"]*"[^>]*>([^<]+)</);
      items.push({
        name, price,
        url: urlM[1],
        plat: 'eBay',
        cond: condM ? condM[1].trim() : 'Occasion',
        seller: '',
      });
    }
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
