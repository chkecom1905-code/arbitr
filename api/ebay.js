// ARBITR — eBay France Real-Time Scraper
// Extracts live listings from eBay FR search results

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = 'sneakers', min_price = '', max_price = '' } = req.query;

  try {
    let url = `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}&_sop=10&_ipg=20&LH_ItemCondition=3&rt=nc`;
    if (min_price) url += `&_udlo=${min_price}`;
    if (max_price) url += `&_udhi=${max_price}`;

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.ebay.fr/',
      },
    });

    const html = await resp.text();
    const items = [];

    // Extract items from eBay's HTML using regex on their structured data
    const listingRegex = /data-viewport="([^"]+)"[^>]*>[\s\S]*?s-item__title[^>]*>([\s\S]*?)<\/[^>]+>[\s\S]*?s-item__price[^>]*>([\s\S]*?)<\/[^>]+>[\s\S]*?href="(https:\/\/www\.ebay\.fr\/itm\/[^"?]+)/g;

    // Alternative: parse the SERP items
    const itemBlocks = html.split('s-item__wrapper');
    for (let i = 1; i < itemBlocks.length && items.length < 15; i++) {
      const block = itemBlocks[i];

      // Extract title
      const titleMatch = block.match(/s-item__title[^>]*>([^<]+)</);
      if (!titleMatch || titleMatch[1].includes('Shop on eBay')) continue;
      const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();

      // Extract price
      const priceMatch = block.match(/s-item__price[^>]*>([\s\S]*?)EUR/);
      if (!priceMatch) continue;
      const priceStr = priceMatch[1].replace(/[^0-9,\.]/g, '').replace(',', '.');
      const price = parseFloat(priceStr);
      if (!price || price < 5) continue;

      // Extract URL
      const urlMatch = block.match(/href="(https:\/\/www\.ebay\.fr\/itm\/[^"?]+)/);
      if (!urlMatch) continue;

      // Extract condition
      const condMatch = block.match(/s-item__condition[^>]*>([^<]+)</);
      const cond = condMatch ? condMatch[1].trim() : 'Occasion';

      items.push({
        name:   title,
        price,
        url:    urlMatch[1],
        plat:   'eBay',
        cond,
        seller: '',
        active: true,
      });
    }

    return res.status(200).json({ items, total: items.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
