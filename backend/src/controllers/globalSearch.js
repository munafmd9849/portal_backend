import { globalSearch, autocomplete, ENTITY_TYPES } from '../services/globalSearchService.js';
import {
  filterSearchTypesForRole,
  buildScopedStudentWhere,
  buildJobListWhere,
  buildRecruiterListWhere,
} from '../utils/adminResourceScope.js';

export async function search(req, res) {
  try {
    const role = req.user?.role;
    const types = req.query.types
      ? String(req.query.types)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined;

    const allowedTypes = filterSearchTypesForRole(role, types);
    if (allowedTypes === null) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your role cannot search student or resume records',
      });
    }

    const page = Number(req.query.page);
    const limit = Number(req.query.limit) || 20;
    const offset = req.query.offset != null
      ? Number(req.query.offset)
      : Number.isFinite(page) && page > 0
        ? (page - 1) * limit
        : 0;

    const studentWhere =
      role === 'ADMIN'
        ? buildScopedStudentWhere(req.user.admin, role)
        : undefined;
    const jobWhere =
      role === 'ADMIN'
        ? buildJobListWhere(req.user.admin, role, req.user.id)
        : undefined;
    const recruiterWhere =
      role === 'ADMIN'
        ? buildRecruiterListWhere(req.user.admin, role, req.user.id)
        : undefined;

    const result = await globalSearch({
      q: req.query.q || req.query.search || '',
      types: allowedTypes,
      limit,
      offset,
      sort: req.query.sort || 'relevance',
      studentWhere,
      jobWhere,
      recruiterWhere,
    });
    res.json(result);
  } catch (error) {
    console.error('global search', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

export async function suggest(req, res) {
  try {
    const role = req.user?.role;
    const studentWhere =
      role === 'ADMIN'
        ? buildScopedStudentWhere(req.user.admin, role)
        : undefined;
    const jobWhere =
      role === 'ADMIN'
        ? buildJobListWhere(req.user.admin, role, req.user.id)
        : undefined;
    const recruiterWhere =
      role === 'ADMIN'
        ? buildRecruiterListWhere(req.user.admin, role, req.user.id)
        : undefined;

    const result = await autocomplete(req.query.q || req.query.search || '', {
      limit: req.query.limit,
      studentWhere,
      jobWhere,
      recruiterWhere,
      userRole: role,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Autocomplete failed' });
  }
}

export async function searchMeta(_req, res) {
  res.json({ entityTypes: ENTITY_TYPES });
}
