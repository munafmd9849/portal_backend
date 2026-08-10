/**
 * Seed credentials — reads from env (Docker Compose) with dev fallbacks.
 */
function env(name, fallback = '') {
  const value = process.env[name];
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  return trimmed || fallback;
}

export const CREDENTIALS = {
  student: {
    email: env('STUDENT_EMAIL', 'munafmd7407@gmail.com'),
    password: env('STUDENT_PASSWORD', 'qwert123'),
    displayName: env('STUDENT_DISPLAY_NAME', 'Test Student'),
    fullName: env('STUDENT_FULL_NAME', 'Test Student'),
  },
  admin: {
    email: env('ADMIN_EMAIL', 'munafmd9849@gmail.com'),
    password: env('ADMIN_PASSWORD', 'qwert123'),
    displayName: env('ADMIN_DISPLAY_NAME', 'Platform Admin'),
    name: env('ADMIN_NAME', 'Platform Admin'),
  },
  superAdmin: {
    email: env('SUPER_ADMIN_EMAIL', 'admin@pwioi.in'),
    password: env('SUPER_ADMIN_PASSWORD', 'admin123'),
    displayName: env('SUPER_ADMIN_DISPLAY_NAME', 'Platform Super Admin'),
    name: env('SUPER_ADMIN_NAME', 'Platform Super Admin'),
  },
};

export const ACADEMIC = {
  school: {
    name: env('SEED_SCHOOL_NAME', 'School of Technology'),
    code: env('SEED_SCHOOL_CODE', 'SOT'),
  },
  center: {
    name: env('SEED_CENTER_NAME', 'BANGALORE'),
    location: env('SEED_CENTER_LOCATION', 'Bangalore'),
  },
  batch: {
    year: env('SEED_BATCH_YEAR', '24-28'),
    label: env('SEED_BATCH_LABEL', '2024–2028'),
  },
};
