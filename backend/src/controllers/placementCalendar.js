/**
 * Placement calendar API — centralized drive timeline for admins.
 */

import { getAdminScopeFilter } from '../utils/adminScope.js';
import { getPlacementCalendarEvents } from '../services/placementCalendarService.js';

export async function getCalendarEvents(req, res) {
  try {
    const { from, to, status, limit } = req.query;
    const adminScope = getAdminScopeFilter(req.user?.admin, req.user?.role);

    const events = await getPlacementCalendarEvents({
      from,
      to,
      status,
      limit: limit ? parseInt(limit, 10) : 200,
      adminScope,
      userId: req.userId,
      userRole: req.user?.role,
    });

    res.json({ events, total: events.length });
  } catch (error) {
    console.error('getCalendarEvents error:', error);
    res.status(500).json({ error: 'Failed to load placement calendar', details: error.message });
  }
}
