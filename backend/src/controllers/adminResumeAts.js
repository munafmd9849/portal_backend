import {
  listStudentResumeAts,
  scorePrimaryResumeForStudent,
  batchScorePrimaryResumes,
} from '../services/adminResumeAtsService.js';

export async function listResumeAts(req, res) {
  try {
    const data = await listStudentResumeAts(req.query, req.user);
    if (data.blocked) return res.status(403).json({ error: 'Access denied for your admin scope' });
    res.json(data);
  } catch (err) {
    console.error('listResumeAts:', err);
    res.status(500).json({ error: err.message || 'Failed to load ATS scores' });
  }
}

export async function scoreOne(req, res) {
  try {
    const { studentId } = req.params;
    const data = await scorePrimaryResumeForStudent(studentId, req.user);
    if (data.blocked) return res.status(403).json({ error: 'Access denied' });
    if (data.error) return res.status(400).json({ error: data.error });
    res.json(data);
  } catch (err) {
    console.error('scoreOne ATS:', err);
    res.status(500).json({ error: err.message || 'Failed to score resume' });
  }
}

export async function scoreBatch(req, res) {
  try {
    const data = await batchScorePrimaryResumes(req.body || {}, req.user);
    if (data.blocked) return res.status(403).json({ error: 'Access denied' });
    res.json(data);
  } catch (err) {
    console.error('scoreBatch ATS:', err);
    res.status(500).json({ error: err.message || 'Failed to batch score resumes' });
  }
}
