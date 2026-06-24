import {
  getControlTowerFilters,
  getControlTowerJobOpportunities,
  getControlTowerStudents,
  getControlTowerCareerServices,
  getControlTowerAll,
} from '../services/controlTowerService.js';

function attachUser(req) {
  return req.user || null;
}

export async function getFilters(req, res) {
  try {
    res.json(await getControlTowerFilters());
  } catch (error) {
    console.error('controlTower filters:', error);
    res.status(500).json({ error: 'Failed to load filters' });
  }
}

export async function getJobOpportunities(req, res) {
  try {
    res.json(await getControlTowerJobOpportunities(req.query, attachUser(req)));
  } catch (error) {
    console.error('controlTower job-opportunities:', error);
    res.status(500).json({ error: 'Failed to load job opportunities' });
  }
}

export async function getStudents(req, res) {
  try {
    res.json(await getControlTowerStudents(req.query, attachUser(req)));
  } catch (error) {
    console.error('controlTower students:', error);
    res.status(500).json({ error: 'Failed to load students analytics' });
  }
}

export async function getCareerServices(req, res) {
  try {
    res.json(await getControlTowerCareerServices(req.query, attachUser(req)));
  } catch (error) {
    console.error('controlTower career-services:', error);
    res.status(500).json({ error: 'Failed to load career services analytics' });
  }
}

export async function getAll(req, res) {
  try {
    res.json(await getControlTowerAll(req.query, attachUser(req)));
  } catch (error) {
    console.error('controlTower all:', error);
    res.status(500).json({ error: 'Failed to load control tower data' });
  }
}
