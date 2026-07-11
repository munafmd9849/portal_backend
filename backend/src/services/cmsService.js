/**
 * Landing Page CMS service — sections, publish, version history.
 */

import prisma from '../config/database.js';

function parseJson(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function serializeSection(row) {
  if (!row) return null;
  return {
    ...row,
    meta: parseJson(row.meta, {}),
  };
}

export async function listSections({ pageSlug = 'landing', status, includeArchived = false } = {}) {
  const where = { pageSlug };
  if (status) where.status = status;
  else if (!includeArchived) where.status = { not: 'ARCHIVED' };

  const rows = await prisma.cmsSection.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  return rows.map(serializeSection);
}

export async function getPublishedLanding(pageSlug = 'landing') {
  const sections = await prisma.cmsSection.findMany({
    where: { pageSlug, status: 'PUBLISHED' },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });
  const latestVersion = await prisma.cmsVersion.findFirst({
    where: { pageSlug },
    orderBy: { version: 'desc' },
    select: { version: true, createdAt: true, label: true },
  });
  return {
    pageSlug,
    version: latestVersion?.version ?? null,
    publishedAt: latestVersion?.createdAt ?? null,
    sections: sections.map(serializeSection),
  };
}

export async function upsertSection(data, userId) {
  const payload = {
    pageSlug: data.pageSlug || 'landing',
    sectionKey: String(data.sectionKey || '').toUpperCase(),
    title: data.title ?? null,
    subtitle: data.subtitle ?? null,
    body: data.body ?? null,
    mediaUrl: data.mediaUrl ?? null,
    mediaPublicId: data.mediaPublicId ?? null,
    mediaType: data.mediaType ?? null,
    ctaLabel: data.ctaLabel ?? null,
    ctaUrl: data.ctaUrl ?? null,
    meta: typeof data.meta === 'string' ? data.meta : JSON.stringify(data.meta || {}),
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 0,
    status: data.status || 'DRAFT',
    updatedById: userId || null,
  };

  if (!payload.sectionKey) {
    const err = new Error('sectionKey is required');
    err.status = 400;
    throw err;
  }

  if (data.id) {
    return serializeSection(
      await prisma.cmsSection.update({
        where: { id: data.id },
        data: payload,
      })
    );
  }

  return serializeSection(
    await prisma.cmsSection.create({
      data: {
        ...payload,
        createdById: userId || null,
        publishedAt: payload.status === 'PUBLISHED' ? new Date() : null,
      },
    })
  );
}

export async function reorderSections(orderedIds = []) {
  const updates = orderedIds.map((id, index) =>
    prisma.cmsSection.update({
      where: { id },
      data: { sortOrder: index },
    })
  );
  await prisma.$transaction(updates);
  return listSections({ includeArchived: true });
}

export async function setSectionStatus(id, status, userId) {
  const allowed = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
  if (!allowed.includes(status)) {
    const err = new Error('Invalid status');
    err.status = 400;
    throw err;
  }
  return serializeSection(
    await prisma.cmsSection.update({
      where: { id },
      data: {
        status,
        updatedById: userId || null,
        publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
      },
    })
  );
}

export async function deleteSection(id) {
  await prisma.cmsSection.delete({ where: { id } });
  return { success: true };
}

export async function publishPage(pageSlug = 'landing', { label, userId } = {}) {
  const sections = await prisma.cmsSection.findMany({
    where: { pageSlug, status: { in: ['DRAFT', 'PUBLISHED'] } },
    orderBy: [{ sortOrder: 'asc' }],
  });

  // Promote all non-archived drafts to published for this page
  await prisma.cmsSection.updateMany({
    where: { pageSlug, status: 'DRAFT' },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });

  const published = await prisma.cmsSection.findMany({
    where: { pageSlug, status: 'PUBLISHED' },
    orderBy: [{ sortOrder: 'asc' }],
  });

  const last = await prisma.cmsVersion.findFirst({
    where: { pageSlug },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (last?.version || 0) + 1;

  const version = await prisma.cmsVersion.create({
    data: {
      pageSlug,
      version: nextVersion,
      label: label || `Publish v${nextVersion}`,
      snapshot: JSON.stringify(published.map(serializeSection)),
      createdById: userId || null,
    },
  });

  return {
    version: version.version,
    publishedCount: published.length,
    sections: published.map(serializeSection),
    previousDraftCount: sections.length,
  };
}

export async function listVersions(pageSlug = 'landing') {
  return prisma.cmsVersion.findMany({
    where: { pageSlug },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      pageSlug: true,
      version: true,
      label: true,
      createdById: true,
      createdAt: true,
    },
  });
}

export async function restoreVersion(pageSlug, versionNumber, userId) {
  const version = await prisma.cmsVersion.findUnique({
    where: { pageSlug_version: { pageSlug, version: Number(versionNumber) } },
  });
  if (!version) {
    const err = new Error('Version not found');
    err.status = 404;
    throw err;
  }
  const snapshot = parseJson(version.snapshot, []);
  // Archive current published, recreate from snapshot as drafts then publish
  await prisma.cmsSection.updateMany({
    where: { pageSlug, status: { not: 'ARCHIVED' } },
    data: { status: 'ARCHIVED' },
  });

  for (const [index, section] of snapshot.entries()) {
    await prisma.cmsSection.create({
      data: {
        pageSlug,
        sectionKey: section.sectionKey,
        title: section.title ?? null,
        subtitle: section.subtitle ?? null,
        body: section.body ?? null,
        mediaUrl: section.mediaUrl ?? null,
        mediaPublicId: section.mediaPublicId ?? null,
        mediaType: section.mediaType ?? null,
        ctaLabel: section.ctaLabel ?? null,
        ctaUrl: section.ctaUrl ?? null,
        meta: typeof section.meta === 'string' ? section.meta : JSON.stringify(section.meta || {}),
        sortOrder: index,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        createdById: userId || null,
        updatedById: userId || null,
      },
    });
  }

  return publishPage(pageSlug, { label: `Restored v${versionNumber}`, userId });
}
