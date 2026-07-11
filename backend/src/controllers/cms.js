import * as cms from '../services/cmsService.js';
import { logAction } from '../utils/auditLogger.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

export async function getPublicLanding(req, res) {
  try {
    const pageSlug = req.query.page || 'landing';
    const data = await cms.getPublishedLanding(pageSlug);
    res.json(data);
  } catch (error) {
    console.error('getPublicLanding', error);
    res.status(500).json({ error: 'Failed to load landing content' });
  }
}

export async function listCmsSections(req, res) {
  try {
    const sections = await cms.listSections({
      pageSlug: req.query.page || 'landing',
      status: req.query.status,
      includeArchived: req.query.includeArchived === 'true',
    });
    res.json({ sections });
  } catch (error) {
    console.error('listCmsSections', error);
    res.status(500).json({ error: 'Failed to list CMS sections' });
  }
}

export async function upsertCmsSection(req, res) {
  try {
    const section = await cms.upsertSection(req.body || {}, req.userId);
    await logAction(req, {
      actionType: req.body?.id ? 'CMS_SECTION_UPDATE' : 'CMS_SECTION_CREATE',
      targetType: 'CmsSection',
      targetId: section.id,
      details: JSON.stringify({ sectionKey: section.sectionKey, status: section.status }),
    });
    res.json({ section });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to save section' });
  }
}

export async function reorderCmsSections(req, res) {
  try {
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
    const sections = await cms.reorderSections(orderedIds);
    await logAction(req, {
      actionType: 'CMS_SECTION_REORDER',
      targetType: 'CmsSection',
      details: JSON.stringify({ count: orderedIds.length }),
    });
    res.json({ sections });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder sections' });
  }
}

export async function setCmsSectionStatus(req, res) {
  try {
    const section = await cms.setSectionStatus(req.params.id, req.body?.status, req.userId);
    res.json({ section });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to update status' });
  }
}

export async function deleteCmsSection(req, res) {
  try {
    await cms.deleteSection(req.params.id);
    await logAction(req, {
      actionType: 'CMS_SECTION_DELETE',
      targetType: 'CmsSection',
      targetId: req.params.id,
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
}

export async function publishCmsPage(req, res) {
  try {
    const result = await cms.publishPage(req.body?.pageSlug || 'landing', {
      label: req.body?.label,
      userId: req.userId,
    });
    await logAction(req, {
      actionType: 'CMS_PUBLISH',
      targetType: 'CmsPage',
      details: JSON.stringify({ version: result.version, count: result.publishedCount }),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish page' });
  }
}

export async function listCmsVersions(req, res) {
  try {
    const versions = await cms.listVersions(req.query.page || 'landing');
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list versions' });
  }
}

export async function restoreCmsVersion(req, res) {
  try {
    const result = await cms.restoreVersion(
      req.body?.pageSlug || 'landing',
      req.params.version,
      req.userId
    );
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to restore version' });
  }
}

export async function uploadCmsMedia(req, res) {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'No file uploaded' });
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported media type' });
    }
    const isVideo = req.file.mimetype.startsWith('video/');
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cms/landing',
      resource_type: isVideo ? 'video' : 'image',
    });
    res.json({
      url: result.secure_url || result.url,
      publicId: result.public_id,
      mediaType: isVideo ? 'VIDEO' : 'IMAGE',
    });
  } catch (error) {
    console.error('uploadCmsMedia', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
