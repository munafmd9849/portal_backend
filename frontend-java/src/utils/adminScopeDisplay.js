export const SCOPE_WILDCARD = '*';

export function parseAdminScopeField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => v && v !== SCOPE_WILDCARD);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v) => v && v !== SCOPE_WILDCARD) : [];
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  return [];
}

export function isAdminFullAccess(admin) {
  if (!admin) return false;
  if (admin.fullAccess === true) return true;
  if (admin.fullAccess === false) return false;

  const schools = parseAdminScopeField(admin.allowedSchools);
  const centers = parseAdminScopeField(admin.allowedCenters);
  const batches = parseAdminScopeField(admin.allowedBatches);
  const schoolIds = parseAdminScopeField(admin.allowedSchoolIds);
  const centerIds = parseAdminScopeField(admin.allowedCenterIds);
  const batchIds = parseAdminScopeField(admin.allowedBatchIds);

  const rawSchools = Array.isArray(admin.allowedSchools)
    ? admin.allowedSchools
    : (() => {
        try {
          return JSON.parse(admin.allowedSchools || '[]');
        } catch {
          return [];
        }
      })();
  const rawCenters = Array.isArray(admin.allowedCenters)
    ? admin.allowedCenters
    : (() => {
        try {
          return JSON.parse(admin.allowedCenters || '[]');
        } catch {
          return [];
        }
      })();
  const rawBatches = Array.isArray(admin.allowedBatches)
    ? admin.allowedBatches
    : (() => {
        try {
          return JSON.parse(admin.allowedBatches || '[]');
        } catch {
          return [];
        }
      })();

  const explicitWildcard =
    rawSchools.includes(SCOPE_WILDCARD) &&
    rawCenters.includes(SCOPE_WILDCARD) &&
    rawBatches.includes(SCOPE_WILDCARD);

  return explicitWildcard;
}

function matchByName(items, names, getLabel, getAlt) {
  if (!names.length) return [];
  return items
    .filter((item) =>
      names.some((name) => {
        const needle = String(name).trim().toLowerCase();
        const label = String(getLabel(item) || '').trim().toLowerCase();
        const alt = getAlt ? String(getAlt(item) || '').trim().toLowerCase() : '';
        return label === needle || (alt && alt === needle);
      })
    )
    .map((item) => item.id);
}

export function adminRecordToForm(admin, academicData = {}) {
  const { schools = [], centers = [], batches = [] } = academicData;
  const fullAccess = isAdminFullAccess(admin);

  let allowedSchoolIds = parseAdminScopeField(admin?.allowedSchoolIds);
  let allowedCenterIds = parseAdminScopeField(admin?.allowedCenterIds);
  let allowedBatchIds = parseAdminScopeField(admin?.allowedBatchIds);

  if (!fullAccess) {
    if (!allowedSchoolIds.length) {
      allowedSchoolIds = matchByName(
        schools,
        parseAdminScopeField(admin?.allowedSchools),
        (s) => s.name,
        (s) => s.code
      );
    }
    if (!allowedCenterIds.length) {
      allowedCenterIds = matchByName(
        centers,
        parseAdminScopeField(admin?.allowedCenters),
        (c) => c.name
      );
    }
    if (!allowedBatchIds.length) {
      allowedBatchIds = matchByName(
        batches,
        parseAdminScopeField(admin?.allowedBatches),
        (b) => b.year?.trim() || b.label,
        (b) => b.label
      );
    }
  }

  return {
    fullAccess,
    allowedSchoolIds: fullAccess ? [] : allowedSchoolIds,
    allowedCenterIds: fullAccess ? [] : allowedCenterIds,
    allowedBatchIds: fullAccess ? [] : allowedBatchIds,
  };
}

export function formatScopeDimensionDisplay(
  rawIds,
  rawNames,
  catalog,
  allLabel,
  resolveName,
  fullAccess = false
) {
  const dimensionWildcard = (rawNames || []).includes(SCOPE_WILDCARD);
  const ids = (rawIds || []).filter((id) => id && id !== SCOPE_WILDCARD);
  const names = (rawNames || []).filter((n) => n && n !== SCOPE_WILDCARD);

  if (fullAccess || dimensionWildcard || (ids.length === 0 && names.length === 0)) {
    return `All ${allLabel}`;
  }

  if (ids.length > 0) {
    const labels = ids
      .map((id) => resolveName(catalog.find((item) => item.id === id)))
      .filter(Boolean);
    if (labels.length > 0) return labels.join(', ');
  }

  if (names.length > 0) return names.join(', ');

  return `All ${allLabel}`;
}

export function getAdminDisplayName(user) {
  return user?.displayName?.trim() || user?.admin?.name?.trim() || 'Admin';
}

export function getAdminWelcomePrefix(userId) {
  if (!userId) return 'Welcome';
  const key = `admin_dashboard_welcome_${userId}`;
  try {
    if (localStorage.getItem(key)) return 'Welcome back';
    localStorage.setItem(key, String(Date.now()));
    return 'Welcome';
  } catch {
    return 'Welcome back';
  }
}

export function resolveAdminScopeLabels(admin, academicData = {}) {
  if (isAdminFullAccess(admin)) {
    return { schools: [], centers: [], batches: [], fullAccess: true };
  }

  const { schools = [], centers = [], batches = [] } = academicData;

  const nameSchools = parseAdminScopeField(admin?.allowedSchools);
  const nameCenters = parseAdminScopeField(admin?.allowedCenters);
  const nameBatches = parseAdminScopeField(admin?.allowedBatches);

  const schoolIds = parseAdminScopeField(admin?.allowedSchoolIds);
  const centerIds = parseAdminScopeField(admin?.allowedCenterIds);
  const batchIds = parseAdminScopeField(admin?.allowedBatchIds);

  const resolvedSchools = nameSchools.length
    ? nameSchools
    : schoolIds
        .map(
          (id) =>
            schools.find((s) => s.id === id)?.name ||
            schools.find((s) => (s.code || s.name) === id)?.name
        )
        .filter(Boolean);

  const resolvedCenters = nameCenters.length
    ? nameCenters
    : centerIds.map((id) => centers.find((c) => c.id === id)?.name).filter(Boolean);

  const resolvedBatches = nameBatches.length
    ? nameBatches
    : batchIds
        .map((id) => {
          const batch = batches.find(
            (b) => b.id === id || b.year === id || b.label === id
          );
          return batch?.year?.trim() || batch?.label;
        })
        .filter(Boolean);

  return {
    schools: resolvedSchools,
    centers: resolvedCenters,
    batches: resolvedBatches,
    fullAccess: false,
  };
}

export function formatAdminScopeSubtitle(admin, academicData = {}) {
  if (isAdminFullAccess(admin)) {
    return 'Full access across all schools, centres, and batches.';
  }

  const { schools, centers, batches } = resolveAdminScopeLabels(admin, academicData);

  const parts = [];
  if (schools.length) {
    parts.push(`School${schools.length > 1 ? 's' : ''}: ${schools.join(', ')}`);
  }
  if (centers.length) {
    parts.push(`Centre${centers.length > 1 ? 's' : ''}: ${centers.join(', ')}`);
  }
  if (batches.length) {
    parts.push(`Batch${batches.length > 1 ? 'es' : ''}: ${batches.join(', ')}`);
  }

  if (!parts.length) {
    return 'Your scope has not been configured yet. Contact your Super Admin.';
  }

  return `Assigned by Super Admin — ${parts.join(' · ')}`;
}

export function getDashboardWelcomeSubtitle(user, role, academicData = {}) {
  const userRole = (role || user?.role || '').toUpperCase();

  if (userRole === 'SUPER_ADMIN') {
    return 'You have global access across all schools, centres, and batches.';
  }

  if (userRole === 'ADMIN' && user?.admin) {
    return formatAdminScopeSubtitle(user.admin, academicData);
  }

  if (userRole === 'RECRUITER') {
    const company = user?.recruiter?.companyName || user?.recruiter?.company?.name;
    return company ? `Recruiter at ${company}` : 'Manage your job postings and applicants.';
  }

  return '';
}
