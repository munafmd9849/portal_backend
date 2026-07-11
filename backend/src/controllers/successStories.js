import * as stories from '../services/successStoryService.js';
import { logAction } from '../utils/auditLogger.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

export async function listPublicStories(req, res) {
  try {
    const data = await stories.getPublishedStories({
      type: req.query.type,
      featured: req.query.featured,
      search: req.query.search || req.query.q,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stories' });
  }
}

export async function listStoriesAdmin(req, res) {
  try {
    const data = await stories.listStories({
      status: req.query.status,
      type: req.query.type,
      featured: req.query.featured,
      search: req.query.search || req.query.q,
      includeArchived: req.query.includeArchived === 'true',
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list stories' });
  }
}

export async function getStory(req, res) {
  try {
    const story = await stories.getStoryById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Not found' });
    res.json({ story });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load story' });
  }
}

export async function createStory(req, res) {
  try {
    const story = await stories.createStory(req.body || {}, req.userId);
    await logAction(req, {
      actionType: 'SUCCESS_STORY_CREATE',
      targetType: 'SuccessStory',
      targetId: story.id,
      details: JSON.stringify({ title: story.title, type: story.type }),
    });
    res.status(201).json({ story });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to create story' });
  }
}

export async function updateStory(req, res) {
  try {
    const story = await stories.updateStory(req.params.id, req.body || {}, req.userId);
    await logAction(req, {
      actionType: 'SUCCESS_STORY_UPDATE',
      targetType: 'SuccessStory',
      targetId: story.id,
    });
    res.json({ story });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to update story' });
  }
}

export async function deleteStory(req, res) {
  try {
    const result = await stories.deleteStory(req.params.id, {
      hard: req.query.hard === 'true',
    });
    await logAction(req, {
      actionType: 'SUCCESS_STORY_DELETE',
      targetType: 'SuccessStory',
      targetId: req.params.id,
      details: JSON.stringify(result),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete story' });
  }
}

export async function uploadStoryMedia(req, res) {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: 'No file uploaded' });
    const isVideo = req.file.mimetype.startsWith('video/');
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'cms/success-stories',
      resource_type: isVideo ? 'video' : 'image',
    });
    res.json({
      url: result.secure_url || result.url,
      publicId: result.public_id,
      mediaType: isVideo ? 'VIDEO' : 'IMAGE',
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
