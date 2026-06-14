/**
 * Student single-device session management.
 * Incrementing sessionVersion invalidates prior access tokens; refresh tokens are cleared on login.
 */

import prisma from '../config/database.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function establishStudentSession(userId) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: { increment: 1 },
      lastLoginAt: new Date(),
    },
    include: {
      student: true,
      recruiter: true,
      admin: true,
    },
  });

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
