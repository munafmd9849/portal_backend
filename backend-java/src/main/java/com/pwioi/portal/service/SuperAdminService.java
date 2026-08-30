package com.pwioi.portal.service;

import com.pwioi.portal.entity.Admin;
import com.pwioi.portal.entity.Application;
import com.pwioi.portal.entity.AuditLog;
import com.pwioi.portal.entity.Batch;
import com.pwioi.portal.entity.Center;
import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.School;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.entity.User;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.AdminRepository;
import com.pwioi.portal.repository.ApplicationRepository;
import com.pwioi.portal.repository.AuditLogRepository;
import com.pwioi.portal.repository.BatchRepository;
import com.pwioi.portal.repository.CenterRepository;
import com.pwioi.portal.repository.JobRepository;
import com.pwioi.portal.repository.JobTargetRepository;
import com.pwioi.portal.repository.RecruiterRepository;
import com.pwioi.portal.repository.SchoolRepository;
import com.pwioi.portal.repository.StudentQueryRepository;
import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.repository.UserRepository;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.util.Jsons;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SuperAdminService {
    private static final String WILDCARD = "*";

    private final UserRepository users;
    private final AdminRepository admins;
    private final SchoolRepository schools;
    private final CenterRepository centers;
    private final BatchRepository batches;
    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final JobTargetRepository jobTargets;
    private final AuditLogRepository auditLogs;
    private final StudentRepository students;
    private final RecruiterRepository recruiters;
    private final StudentQueryRepository queries;
    private final PasswordEncoder encoder;
    private final Jsons jsons;
    private final NotificationService notifications;

    public SuperAdminService(
            UserRepository users, AdminRepository admins, SchoolRepository schools, CenterRepository centers,
            BatchRepository batches, JobRepository jobs, ApplicationRepository applications,
            JobTargetRepository jobTargets, AuditLogRepository auditLogs, StudentRepository students,
            RecruiterRepository recruiters, StudentQueryRepository queries, PasswordEncoder encoder,
            Jsons jsons, NotificationService notifications) {
        this.users = users;
        this.admins = admins;
        this.schools = schools;
        this.centers = centers;
        this.batches = batches;
        this.jobs = jobs;
        this.applications = applications;
        this.jobTargets = jobTargets;
        this.auditLogs = auditLogs;
        this.students = students;
        this.recruiters = recruiters;
        this.queries = queries;
        this.encoder = encoder;
        this.jsons = jsons;
        this.notifications = notifications;
    }

    public Map<String, Object> listAdmins() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (User u : users.findByRoleOrderByCreatedAtDesc(Roles.ADMIN)) {
            list.add(toAdminRecord(u, admins.findByUserId(u.getId()).orElse(null)));
        }
        return Map.of("admins", list);
    }

    @Transactional
    public Map<String, Object> createAdmin(Map<String, Object> body) {
        String email = str(body.get("email")).toLowerCase(Locale.ROOT);
        String password = str(body.get("password"));
        if (email.isBlank()) {
            throw ApiException.badRequest("Email is required");
        }
        if (password.length() < 6) {
            throw ApiException.badRequest("Password must be at least 6 characters");
        }
        if (users.existsByEmail(email)) {
            throw ApiException.badRequest("A user with this email already exists");
        }

        String displayName = str(body.get("displayName"));
        if (displayName.isBlank()) {
            displayName = str(body.get("name"));
        }
        if (displayName.isBlank()) {
            displayName = email;
        }

        String adminRole = str(body.get("role"));
        if (adminRole.isBlank()) {
            adminRole = Roles.ADMIN;
        }

        boolean fullAccess = Boolean.TRUE.equals(body.get("fullAccess"));
        List<String> schoolIds = asStringList(body.get("allowedSchoolIds"));
        List<String> centerIds = asStringList(body.get("allowedCenterIds"));
        List<String> batchIds = asStringList(body.get("allowedBatchIds"));
        validateRestrictedScope(fullAccess, schoolIds, centerIds, batchIds);
        Map<String, String> scope = resolveScope(fullAccess, schoolIds, centerIds, batchIds);

        List<String> permissions = asStringList(body.get("permissions"));
        if (permissions.isEmpty()) {
            permissions = List.of(WILDCARD);
        }

        Instant now = Instant.now();
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(encoder.encode(password));
        user.setRole(Roles.ADMIN);
        user.setStatus("ACTIVE");
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(now);
        user.setRecruiterVerified(false);
        user.setGoogleCalendarConnected(false);
        user.setDisplayName(displayName);
        user.setSessionVersion(0);
        user = users.save(user);

        Admin admin = new Admin();
        admin.setUserId(user.getId());
        admin.setName(displayName);
        admin.setRole(adminRole);
        admin.setPermissions(jsons.toJson(permissions));
        applyScope(admin, scope);
        admin = admins.save(admin);

        Map<String, Object> created = new LinkedHashMap<>();
        created.put("id", user.getId());
        created.put("email", user.getEmail());
        created.put("displayName", user.getDisplayName());
        created.put("status", user.getStatus());
        created.put("adminId", admin.getId());
        return Map.of("admin", created);
    }

    @Transactional
    public Map<String, Object> updateAdmin(String userId, Map<String, Object> body) {
        User user = requireAdminUser(userId);
        Admin admin = admins.findByUserId(userId).orElseGet(() -> {
            Admin created = new Admin();
            created.setUserId(userId);
            created.setName(user.getDisplayName() != null ? user.getDisplayName() : user.getEmail());
            created.setRole(Roles.ADMIN);
            created.setPermissions(jsons.toJson(List.of(WILDCARD)));
            return created;
        });

        if (body.containsKey("displayName")) {
            String name = str(body.get("displayName"));
            if (!name.isBlank()) {
                user.setDisplayName(name);
                admin.setName(name);
            }
        }
        if (body.containsKey("status")) {
            String status = str(body.get("status"));
            if (!status.isBlank()) {
                user.setStatus(status);
            }
        }
        if (body.containsKey("role")) {
            String role = str(body.get("role"));
            if (!role.isBlank()) {
                admin.setRole(role);
            }
        }
        if (body.containsKey("permissions")) {
            admin.setPermissions(jsons.toJson(asStringList(body.get("permissions"))));
        }

        boolean scopeTouched = body.containsKey("fullAccess")
                || body.containsKey("allowedSchoolIds")
                || body.containsKey("allowedCenterIds")
                || body.containsKey("allowedBatchIds");
        if (scopeTouched) {
            boolean fullAccess = body.containsKey("fullAccess")
                    ? Boolean.TRUE.equals(body.get("fullAccess"))
                    : isFullAccess(admin);
            List<String> schoolIds = asStringList(body.get("allowedSchoolIds"));
            List<String> centerIds = asStringList(body.get("allowedCenterIds"));
            List<String> batchIds = asStringList(body.get("allowedBatchIds"));
            validateRestrictedScope(fullAccess, schoolIds, centerIds, batchIds);
            applyScope(admin, resolveScope(fullAccess, schoolIds, centerIds, batchIds));
        } else {
            if (body.containsKey("allowedSchools")) {
                admin.setAllowedSchools(jsons.toJson(asStringList(body.get("allowedSchools"))));
            }
            if (body.containsKey("allowedCenters")) {
                admin.setAllowedCenters(jsons.toJson(asStringList(body.get("allowedCenters"))));
            }
            if (body.containsKey("allowedBatches")) {
                admin.setAllowedBatches(jsons.toJson(asStringList(body.get("allowedBatches"))));
            }
        }

        users.save(user);
        admins.save(admin);
        return Map.of("message", "Admin updated successfully");
    }

    @Transactional
    public Map<String, Object> disableAdmin(String userId, String actorId) {
        User target = requireAdminUser(userId);
        target.setStatus("BLOCKED");
        users.save(target);
        try {
            notifications.create(target.getId(), "Admin account disabled",
                    "Your admin account has been disabled by a Super Admin.",
                    Map.of("type", "admin_disabled", "disabledBy", actorId == null ? "" : actorId));
        } catch (Exception ignored) {
            // notification is best-effort
        }
        return Map.of("message", "Admin disabled successfully");
    }

    @Transactional
    public Map<String, Object> enableAdmin(String userId) {
        User target = requireAdminUser(userId);
        target.setStatus("ACTIVE");
        users.save(target);
        return Map.of("message", "Admin enabled successfully");
    }

    public Map<String, Object> performance(String userId) {
        User admin = users.findById(userId).orElseThrow(() -> ApiException.notFound("Admin"));
        Admin profile = admins.findByUserId(userId).orElse(null);
        List<Job> created = jobs.findByCreatedByOrderByCreatedAtDesc(userId);
        List<String> jobIds = created.stream().map(Job::getId).toList();
        long apps = jobIds.isEmpty() ? 0 : applications.countByJobIdIn(jobIds);
        long reach = jobIds.isEmpty() ? 0 : jobTargets.countByJobIdIn(jobIds);

        List<Map<String, Object>> recentJobs = created.stream().limit(5).map(job -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", job.getId());
            row.put("jobTitle", job.getJobTitle());
            row.put("companyName", job.getCompanyName());
            row.put("createdAt", job.getCreatedAt());
            row.put("status", job.getStatus());
            return row;
        }).toList();

        List<Map<String, Object>> activity = auditLogs.findTop10ByActorIdOrderByTimestampDesc(userId).stream()
                .map(this::toActivity)
                .toList();

        Map<String, Object> adminOut = new LinkedHashMap<>();
        adminOut.put("id", admin.getId());
        adminOut.put("email", admin.getEmail());
        adminOut.put("displayName", admin.getDisplayName());
        adminOut.put("role", profile == null ? null : profile.getRole());
        adminOut.put("status", admin.getStatus());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalJobsCreated", created.size());
        stats.put("totalJobsUpdated", jobs.countByUpdatedBy(userId));
        stats.put("totalReach", reach);
        stats.put("totalApplications", apps);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("admin", adminOut);
        out.put("stats", stats);
        out.put("recentJobs", recentJobs);
        out.put("recentActivity", activity);
        return out;
    }

    public Map<String, Object> stats() {
        return statsSummary();
    }

    public Map<String, Object> statsSummary() {
        List<Student> allStudents = students.findAll();
        Map<String, String> userStatus = new LinkedHashMap<>();
        for (User u : users.findAll()) {
            userStatus.put(u.getId(), u.getStatus());
        }

        Map<String, long[]> byCenter = new LinkedHashMap<>();
        Map<String, long[]> bySchool = new LinkedHashMap<>();
        Map<String, long[]> byBatch = new LinkedHashMap<>();
        for (Student s : allStudents) {
            String center = blankToUnknown(s.getCenter());
            String school = blankToUnknown(s.getSchool());
            String batch = blankToUnknown(s.getBatch());
            bump(byCenter, center, "ACTIVE".equals(userStatus.get(s.getUserId())));
            bump(bySchool, school, "ACTIVE".equals(userStatus.get(s.getUserId())));
            bump(byBatch, batch, false);
        }

        List<Map<String, Object>> adminRows = new ArrayList<>();
        for (User a : users.findByRoleOrderByCreatedAtDesc(Roles.ADMIN)) {
            List<Job> created = jobs.findByCreatedByOrderByCreatedAtDesc(a.getId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", a.getId());
            row.put("email", a.getEmail());
            row.put("displayName", a.getDisplayName());
            row.put("status", a.getStatus());
            row.put("lastLoginAt", a.getLastLoginAt());
            row.put("createdAt", a.getCreatedAt());
            row.put("jobsCount", created.size());
            row.put("lastJobAt", created.isEmpty() ? null : created.get(0).getCreatedAt());
            adminRows.add(row);
        }

        long placed = applications.findAll().stream().filter(this::isPlaced).count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalStudents", allStudents.size());
        summary.put("totalJobs", jobs.count());
        summary.put("totalApplications", applications.count());
        summary.put("placedStudents", placed);
        summary.put("recruiterCount", recruiters.count());
        summary.put("queryCount", queries.count());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("summary", summary);
        out.put("admins", adminRows);
        out.put("byCenter", dimList(byCenter, "center"));
        out.put("bySchool", dimList(bySchool, "school"));
        out.put("byBatch", dimList(byBatch, "batch"));
        return out;
    }

    private User requireAdminUser(String userId) {
        User target = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        if (!Roles.ADMIN.equals(target.getRole())) {
            throw ApiException.badRequest("Only admin users can be updated");
        }
        return target;
    }

    private Map<String, Object> toAdminRecord(User u, Admin a) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", u.getId());
        row.put("email", u.getEmail());
        row.put("displayName", u.getDisplayName());
        row.put("status", u.getStatus());
        row.put("lastLoginAt", u.getLastLoginAt());
        row.put("createdAt", u.getCreatedAt());
        row.put("adminId", a == null ? null : a.getId());
        row.put("adminRole", a == null ? null : a.getRole());
        row.put("permissions", parseList(a == null ? null : a.getPermissions()));
        row.put("allowedSchools", parseList(a == null ? null : a.getAllowedSchools()));
        row.put("allowedCenters", parseList(a == null ? null : a.getAllowedCenters()));
        row.put("allowedBatches", parseList(a == null ? null : a.getAllowedBatches()));
        row.put("allowedSchoolIds", parseList(a == null ? null : a.getAllowedSchoolIds()));
        row.put("allowedCenterIds", parseList(a == null ? null : a.getAllowedCenterIds()));
        row.put("allowedBatchIds", parseList(a == null ? null : a.getAllowedBatchIds()));
        row.put("fullAccess", isFullAccess(a));
        return row;
    }

    private Map<String, Object> toActivity(AuditLog log) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", log.getId());
        row.put("action", log.getActionType());
        row.put("target", log.getTargetType());
        row.put("details", log.getDetails());
        row.put("timestamp", log.getTimestamp());
        return row;
    }

    private void validateRestrictedScope(boolean fullAccess, List<String> schoolIds, List<String> centerIds, List<String> batchIds) {
        if (fullAccess) {
            return;
        }
        if (asIdList(schoolIds).isEmpty() || asIdList(centerIds).isEmpty() || asIdList(batchIds).isEmpty()) {
            throw ApiException.badRequest("Restricted access requires at least one school, campus, and batch — or enable full access");
        }
    }

    private Map<String, String> resolveScope(boolean fullAccess, List<String> schoolIds, List<String> centerIds, List<String> batchIds) {
        Map<String, String> out = new LinkedHashMap<>();
        if (fullAccess) {
            out.put("allowedSchoolIds", "[]");
            out.put("allowedCenterIds", "[]");
            out.put("allowedBatchIds", "[]");
            out.put("allowedSchools", jsons.toJson(List.of(WILDCARD)));
            out.put("allowedCenters", jsons.toJson(List.of(WILDCARD)));
            out.put("allowedBatches", jsons.toJson(List.of(WILDCARD)));
            return out;
        }

        List<String> sid = asIdList(schoolIds);
        List<String> cid = asIdList(centerIds);
        List<String> bid = asIdList(batchIds);

        Set<String> schoolValues = new LinkedHashSet<>();
        for (School s : schools.findAllById(sid)) {
            if (notBlank(s.getName())) schoolValues.add(s.getName());
            if (notBlank(s.getCode())) schoolValues.add(s.getCode());
        }
        Set<String> centerValues = new LinkedHashSet<>();
        for (Center c : centers.findAllById(cid)) {
            if (notBlank(c.getName())) centerValues.add(c.getName());
        }
        Set<String> batchValues = new LinkedHashSet<>();
        for (Batch b : batches.findAllById(bid)) {
            if (notBlank(b.getYear())) batchValues.add(b.getYear().trim());
            if (notBlank(b.getLabel())) batchValues.add(b.getLabel().trim());
        }

        out.put("allowedSchoolIds", jsons.toJson(sid));
        out.put("allowedCenterIds", jsons.toJson(cid));
        out.put("allowedBatchIds", jsons.toJson(bid));
        out.put("allowedSchools", jsons.toJson(new ArrayList<>(schoolValues)));
        out.put("allowedCenters", jsons.toJson(new ArrayList<>(centerValues)));
        out.put("allowedBatches", jsons.toJson(new ArrayList<>(batchValues)));
        return out;
    }

    private void applyScope(Admin admin, Map<String, String> scope) {
        admin.setAllowedSchoolIds(scope.get("allowedSchoolIds"));
        admin.setAllowedCenterIds(scope.get("allowedCenterIds"));
        admin.setAllowedBatchIds(scope.get("allowedBatchIds"));
        admin.setAllowedSchools(scope.get("allowedSchools"));
        admin.setAllowedCenters(scope.get("allowedCenters"));
        admin.setAllowedBatches(scope.get("allowedBatches"));
    }

    private boolean isFullAccess(Admin admin) {
        if (admin == null) {
            return false;
        }
        List<String> schoolNames = parseList(admin.getAllowedSchools());
        List<String> centerNames = parseList(admin.getAllowedCenters());
        List<String> batchNames = parseList(admin.getAllowedBatches());
        return schoolNames.contains(WILDCARD) && centerNames.contains(WILDCARD) && batchNames.contains(WILDCARD);
    }

    private List<String> parseList(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        List<Object> parsed = jsons.fromJsonList(raw);
        List<String> out = new ArrayList<>();
        for (Object o : parsed) {
            if (o != null && !String.valueOf(o).isBlank()) {
                out.add(String.valueOf(o));
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<String> asStringList(Object value) {
        if (value == null) {
            return List.of();
        }
        if (value instanceof Collection<?> c) {
            List<String> out = new ArrayList<>();
            for (Object o : c) {
                if (o != null && !String.valueOf(o).isBlank()) {
                    out.add(String.valueOf(o));
                }
            }
            return out;
        }
        if (value instanceof String s) {
            return parseList(s);
        }
        return List.of();
    }

    private static List<String> asIdList(List<String> values) {
        List<String> out = new ArrayList<>();
        for (String v : values) {
            if (v != null && !v.isBlank() && !WILDCARD.equals(v)) {
                out.add(v);
            }
        }
        return out;
    }

    private static void bump(Map<String, long[]> map, String key, boolean active) {
        long[] v = map.computeIfAbsent(key, k -> new long[2]);
        v[0] += 1;
        if (active) {
            v[1] += 1;
        }
    }

    private static List<Map<String, Object>> dimList(Map<String, long[]> map, String keyName) {
        return map.entrySet().stream()
                .sorted(Comparator.comparing(e -> e.getKey().toLowerCase(Locale.ROOT)))
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put(keyName, e.getKey());
                    row.put("total", e.getValue()[0]);
                    row.put("active", e.getValue()[1]);
                    return row;
                })
                .toList();
    }

    private boolean isPlaced(Application a) {
        String status = a.getStatus() == null ? "" : a.getStatus().toUpperCase(Locale.ROOT);
        String interview = a.getInterviewStatus() == null ? "" : a.getInterviewStatus().toUpperCase(Locale.ROOT);
        return status.equals("SELECTED") || status.equals("OFFERED") || status.equals("ACCEPTED")
                || interview.equals("SELECTED");
    }

    private static String blankToUnknown(String value) {
        return notBlank(value) ? value : "Unknown";
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }
}
