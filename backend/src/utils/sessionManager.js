/**
 * Student single-device session management.
 * Incrementing sessionVersion invalidates prior access tokens; refresh tokens are cleared on login.
 *
 * Uses raw SQL for sessionVersion so login still works if the generated Prisma client
 * is temporarily out of sync with schema.prisma (e.g. prisma generate locked by a running server).
 */

import prisma from '../config/database.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUserSessionVersion(userId) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT "sessionVersion" FROM users WHERE id = ${userId} LIMIT 1
    `;
    return Number(rows?.[0]?.sessionVersion ?? 0);
  } catch {
    return 0;
  }
}

export async function establishStudentSession(userId) {
  // Bump session version + last login in one statement (column must exist on users)
  await prisma.$executeRaw`
    UPDATE users
    SET
      "sessionVersion" = COALESCE("sessionVersion", 0) + 1,
      "lastLoginAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${userId}
  `;

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

  // Attach version for JWT even if Prisma client types omit the field
  user.sessionVersion = await getUserSessionVersion(userId);

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
