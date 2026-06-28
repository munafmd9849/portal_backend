import { listJoinedPlacements, updateJoinedPlacementCompensation } from '../services/placementsService.js';

export async function getPlacements(req, res) {
  try {
    const data = await listJoinedPlacements(req.query, req.user);
    res.json(data);
  } catch (error) {
    console.error('getPlacements error:', error);
    res.status(500).json({ error: 'Failed to load placements' });
  }
}

export async function patchPlacementCompensation(req, res) {
  try {
    const { applicationId } = req.params;
    const updated = await updateJoinedPlacementCompensation(applicationId, req.body, req.user);
    res.json(updated);
  } catch (error) {
    console.error('patchPlacementCompensation error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to update placement' });
  }
}
