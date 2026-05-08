export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { q = 'sac' } = req.query;
  try {
    // Vestiaire GraphQL search
    const resp = await fetch('https://search.vestiairecollective.com/v1/product/search', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR',
        'Referer': `https://fr.vestiairecollective.com/search/?q=${encodeURIComponent(q)}`,
      }
    });
    // Fallback: scrape search HTML
    const searchUrl = `https://fr.vestiairecollective.com/search/?q=${encodeURIComponent(q)}&order=created_at_desc`;
    const htmlResp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      }
    });
    const html = await htmlResp.text();
    const items = [];
    // Extract product data from Next.js data
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.+?)<\/script>/s);
    if (match) {
      const data = JSON.parse(match[1]);
      const products = data?.props?.pageProps?.searchResults?.items
                    || data?.props?.pageProps?.products
                    || data?.props?.pageProps?.initialData?.products
                    || [];
      for (const p of products.slice(0,12)) {
        const price = parseFloat(p.price?.cents ? p.price.cents/100 : p.price?.amount || p.displayedPrice || 0);
        if (!price || price < 10) continue;
        const slug = p.slug || p.id;
        items.push({
          name:   p.name || p.description || p.brand_name,
          price,
          url:    p.link ? `https://fr.vestiairecollective.com${p.link}` : `https://fr.vestiairecollective.com/produit-${slug}.shtml`,
          plat:   'Vestiaire',
          cond:   p.condition_label || p.condition || 'Très bon état',
          seller: p.seller?.username || '',
        });
      }
    }
    res.status(200).json({ items, total: items.length });
  } catch(e) {
    res.status(500).json({ items: [], error: e.message });
  }
}
