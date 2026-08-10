/**
 * Success Story management service.
 */

import prisma from '../config/database.js';

const STORY_TYPES = new Set([
  'STUDENT_SUCCESS',
  'COMPANY_HIRING',
  'ALUMNI',
  'INTERNSHIP',
  'PLACEMENT_ACHIEVEMENT',
]);

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeEmail(value) {
  if (value == null) return null;
  const email = String(value).trim();
  return email || null;
}

function normalizeLinkedin(value) {
  if (value == null) return null;
  let url = String(value).trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }
  return url;
}

function validateContactFields(data) {
  const email = normalizeEmail(data.email);
  if (!email) {
    const err = new Error('Email is required');
    err.status = 400;
    throw err;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error('Enter a valid email address');
    err.status = 400;
    throw err;
  }

  const linkedin = normalizeLinkedin(data.linkedin);
  if (!linkedin) {
    const err = new Error('LinkedIn profile URL is required');
    err.status = 400;
    throw err;
  }

  const packageCtc = String(data.packageCtc ?? data.package ?? '').trim();
  if (!packageCtc) {
    const err = new Error('Package or stipend is required');
    err.status = 400;
    throw err;
  }
}

export function serializeStory(row) {
  if (!row) return null;
  return {
    ...row,
    images: parseJson(row.images, []),
    tags: parseJson(row.tags, []),
  };
}

function normalizeType(type) {
  const t = String(type || '').toUpperCase();
  return STORY_TYPES.has(t) ? t : null;
}

export async function listStories({
  status,
  type,
  featured,
  search,
  includeArchived = false,
  page = 1,
  limit = 20,
} = {}) {
  const where = {};
  if (status) where.status = status;
  else if (!includeArchived) where.status = { not: 'ARCHIVED' };
  if (type) {
    const t = normalizeType(type);
    if (t) where.type = t;
  }
  if (featured === true || featured === 'true') where.featured = true;
  if (search && String(search).trim()) {
    const q = String(search).trim();
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
      { company: { contains: q } },
      { studentName: { contains: q } },
      { jobRole: { contains: q } },
      { campus: { contains: q } },
      { batch: { contains: q } },
      { tags: { contains: q } },
    ];
  }

  const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const [total, rows] = await Promise.all([
    prisma.successStory.count({ where }),
    prisma.successStory.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
      skip,
      take,
    }),
  ]);

  return {
    total,
    page: Math.max(Number(page) || 1, 1),
    limit: take,
    items: rows.map(serializeStory),
  };
}

export async function getPublishedStories({ type, featured, search, limit = 12 } = {}) {
  return listStories({
    status: 'PUBLISHED',
    type,
    featured,
    search,
    page: 1,
    limit,
  });
}

export async function getStoryById(id) {
  const row = await prisma.successStory.findUnique({ where: { id } });
  return serializeStory(row);
}

export async function createStory(data, userId) {
  const type = normalizeType(data.type);
  if (!type) {
    const err = new Error('Invalid story type');
    err.status = 400;
    throw err;
  }
  if (!data.title?.trim()) {
    const err = new Error('Title is required');
    err.status = 400;
    throw err;
  }
  validateContactFields(data);

  const row = await prisma.successStory.create({
    data: {
      type,
      title: data.title.trim(),
      description: data.description ?? null,
      richContent: data.richContent ?? null,
      images: JSON.stringify(data.images || []),
      videoUrl: data.videoUrl ?? null,
      company: data.company ?? null,
      studentName: data.studentName ?? null,
      studentId: data.studentId ?? null,
      email: normalizeEmail(data.email),
      linkedin: normalizeLinkedin(data.linkedin),
      branch: data.branch ?? null,
      campus: data.campus ?? null,
      batch: data.batch ?? null,
      packageCtc: data.packageCtc ?? data.package ?? null,
      jobRole: data.jobRole ?? null,
      tags: JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
      status: data.status || 'DRAFT',
      featured: Boolean(data.featured),
      sortOrder: Number(data.sortOrder) || 0,
      createdById: userId || null,
      updatedById: userId || null,
      publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
    },
  });
  return serializeStory(row);
}

export async function updateStory(id, data, userId) {
  const existing = await prisma.successStory.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Story not found');
    err.status = 404;
    throw err;
  }

  const patch = {
    updatedById: userId || null,
  };
  if (data.type != null) {
    const type = normalizeType(data.type);
    if (!type) {
      const err = new Error('Invalid story type');
      err.status = 400;
      throw err;
    }
    patch.type = type;
  }
  if (data.title != null) patch.title = String(data.title).trim();
  if (data.description !== undefined) patch.description = data.description;
  if (data.richContent !== undefined) patch.richContent = data.richContent;
  if (data.images !== undefined) patch.images = JSON.stringify(data.images || []);
  if (data.videoUrl !== undefined) patch.videoUrl = data.videoUrl;
  if (data.company !== undefined) patch.company = data.company;
  if (data.studentName !== undefined) patch.studentName = data.studentName;
  if (data.studentId !== undefined) patch.studentId = data.studentId;
  if (data.email !== undefined) patch.email = normalizeEmail(data.email);
  if (data.linkedin !== undefined) patch.linkedin = normalizeLinkedin(data.linkedin);
  if (data.branch !== undefined) patch.branch = data.branch;
  if (data.campus !== undefined) patch.campus = data.campus;
  if (data.batch !== undefined) patch.batch = data.batch;
  if (data.packageCtc !== undefined || data.package !== undefined) {
    patch.packageCtc = data.packageCtc ?? data.package;
  }
  if (data.jobRole !== undefined) patch.jobRole = data.jobRole;
  if (data.tags !== undefined) patch.tags = JSON.stringify(Array.isArray(data.tags) ? data.tags : []);
  if (data.featured !== undefined) patch.featured = Boolean(data.featured);
  if (data.sortOrder !== undefined) patch.sortOrder = Number(data.sortOrder) || 0;
  if (data.status != null) {
    patch.status = data.status;
    if (data.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      patch.publishedAt = new Date();
    }
  }

  const merged = {
    ...existing,
    ...data,
    email: data.email !== undefined ? normalizeEmail(data.email) : existing.email,
    linkedin: data.linkedin !== undefined ? normalizeLinkedin(data.linkedin) : existing.linkedin,
    packageCtc:
      data.packageCtc !== undefined || data.package !== undefined
        ? data.packageCtc ?? data.package
        : existing.packageCtc,
  };
  if (data.title != null) merged.title = String(data.title).trim();
  validateContactFields(merged);

  return serializeStory(
    await prisma.successStory.update({ where: { id }, data: patch })
  );
}

export async function deleteStory(id, { hard = false } = {}) {
  if (hard) {
    await prisma.successStory.delete({ where: { id } });
    return { success: true, hard: true };
  }
  await prisma.successStory.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });
  return { success: true, hard: false };
}
