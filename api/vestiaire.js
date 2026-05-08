// ARBITR — Vestiaire Collective Real-Time Scraper
// Uses Vestiaire's catalog search API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = 'sac', max_price = '' } = req.query;

  try {
    const params = new URLSearchParams({
      q,
      limit: '20',
      country: 'FR',
      language: 'fr',
      sortBy: 'CREATION_DATE',
      sortOrder: 'DESC',
    });
    if (max_price) params.set('maxPrice', max_price);

    const resp = await fetch(`https://search.vestiairecollective.com/v1/product/search?${params}`, {
      headers: {
        'User-Agent': 'VestiaireMobile/9.1.1 (iPhone; iOS 17.0)',
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR',
        'Referer': 'https://fr.vestiairecollective.com/',
        'x-vc-locale': 'fr_FR',
        'x-vc-country': 'FR',
        'x-vc-currency': 'EUR',
      },
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const items = (data.items || data.products || []).map(p => ({
      name:   p.name || p.title || p.description,
      price:  parseFloat(p.priceFormatted?.value || p.price?.cents / 100 || p.price || 0),
      url:    p.link ? `https://fr.vestiairecollective.com${p.link}` : `https://fr.vestiairecollective.com/produit-${p.id}.shtml`,
      plat:   'Vestiaire',
      cond:   p.conditionLabel || p.condition || 'Très bon état',
      seller: p.seller?.username || '',
      active: true,
    })).filter(i => i.name && i.price > 0);

    return res.status(200).json({ items, total: items.length });
  } catch (err) {
    return res.status(500).json({ error: err.message, items: [] });
  }
}
