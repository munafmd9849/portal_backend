/**
 * Fetch a resume PDF/DOC URL and extract plain text for ATS analysis.
 */

export async function extractResumeTextFromUrl(resumeUrl) {
  if (!resumeUrl || typeof resumeUrl !== 'string' || !resumeUrl.trim()) {
    throw new Error('Resume URL is required');
  }

  const pdfParse = (await import('pdf-parse')).default;

  let buffer;
  try {
    const response = await fetch(resumeUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch resume: ${response.status} ${response.statusText}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (err) {
    throw new Error(`Failed to fetch resume: ${err.message}`);
  }

  try {
    const pdfData = await pdfParse(buffer);
    const text = (pdfData.text || '').trim();
    if (!text) {
      throw new Error('No text could be extracted. The file may be scanned/image-only.');
    }
    return text;
  } catch (err) {
    throw new Error(`Failed to parse resume: ${err.message}`);
  }
}

export function resolvePrimaryResume(student) {
  const files = student.resumeFiles || [];
  const defaultFile = files.find((f) => f.isDefault) || files[0];
  if (defaultFile) {
    return {
      type: 'file',
      resumeId: defaultFile.id,
      fileName: defaultFile.fileName || defaultFile.title || 'Resume',
      fileUrl: defaultFile.fileUrl,
      atsScore: defaultFile.atsScore ?? null,
      atsScoredAt: defaultFile.atsScoredAt ?? null,
      atsAnalysisJson: defaultFile.atsAnalysisJson ?? null,
    };
  }
  if (student.resumeUrl) {
    return {
      type: 'legacy',
      resumeId: null,
      fileName: student.resumeFileName || 'Resume',
      fileUrl: student.resumeUrl,
      atsScore: student.primaryResumeAtsScore ?? null,
      atsScoredAt: student.primaryResumeAtsScoredAt ?? null,
      atsAnalysisJson: student.primaryResumeAtsAnalysis ?? null,
    };
  }
  return null;
}
