import { globalSearch, autocomplete, ENTITY_TYPES } from '../services/globalSearchService.js';

export async function search(req, res) {
  try {
    const types = req.query.types
      ? String(req.query.types)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;
    const page = Number(req.query.page);
    const limit = Number(req.query.limit) || 20;
    const offset = req.query.offset != null
      ? Number(req.query.offset)
      : Number.isFinite(page) && page > 0
        ? (page - 1) * limit
        : 0;
    const result = await globalSearch({
      q: req.query.q || req.query.search || '',
      types,
      limit,
      offset,
      sort: req.query.sort || 'relevance',
    });
    res.json(result);
  } catch (error) {
    console.error('global search', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

export async function suggest(req, res) {
  try {
    const result = await autocomplete(req.query.q || req.query.search || '', {
      limit: req.query.limit,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Autocomplete failed' });
  }
}

export async function searchMeta(_req, res) {
  res.json({ entityTypes: ENTITY_TYPES });
}
