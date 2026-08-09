/**
 * Student single-device session management.
 * Incrementing sessionVersion invalidates prior access tokens; refresh tokens are cleared on login.
 */

import prisma from '../config/database.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isSqlite() {
  return (process.env.DATABASE_URL || '').toLowerCase().startsWith('file:');
}

export async function getUserSessionVersion(userId) {
  try {
    if (isSqlite()) {
      const rows = await prisma.$queryRaw`
        SELECT sessionVersion FROM users WHERE id = ${userId} LIMIT 1
      `;
      return Number(rows?.[0]?.sessionVersion ?? 0);
    }
    const rows = await prisma.$queryRaw`
      SELECT "sessionVersion" FROM users WHERE id = ${userId} LIMIT 1
    `;
    return Number(rows?.[0]?.sessionVersion ?? 0);
  } catch {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sessionVersion: true },
      });
      return Number(user?.sessionVersion ?? 0);
    } catch {
      return 0;
    }
  }
}

export async function establishStudentSession(userId) {
  // Portable update — works on SQLite and PostgreSQL (avoid Postgres-only NOW())
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: Number(current?.sessionVersion ?? 0) + 1,
      lastLoginAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: true,
      recruiter: true,
      admin: true,
    },
  });

  if (!user) {
    throw new Error('User not found after session establish');
  }

  user.sessionVersion = Number(user.sessionVersion ?? 0);

  await prisma.refreshToken.deleteMany({ where: { userId } });
  return user;
}

export async function persistRefreshToken(userId, refreshToken) {
  return prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
}
