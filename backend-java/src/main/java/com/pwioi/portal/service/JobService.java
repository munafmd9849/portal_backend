package com.pwioi.portal.service;

import com.pwioi.portal.entity.Company;
import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.JobTarget;
import com.pwioi.portal.entity.JobTracking;
import com.pwioi.portal.entity.Recruiter;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.entity.User;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.CompanyRepository;
import com.pwioi.portal.repository.JobRepository;
import com.pwioi.portal.repository.JobTargetRepository;
import com.pwioi.portal.repository.JobTrackingRepository;
import com.pwioi.portal.repository.RecruiterRepository;
import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.repository.UserRepository;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.PortalPrincipal;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.util.JobEligibility;
import com.pwioi.portal.util.Jsons;
import com.pwioi.portal.websocket.PortalSocketService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {
    private final JobRepository jobs;
    private final JobTargetRepository targets;
    private final StudentRepository students;
    private final CompanyRepository companies;
    private final RecruiterRepository recruiters;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final Jsons jsons;
    private final PortalSocketService sockets;
    private final NotificationService notifications;
    private final EmailService email;
    private final JobTrackingRepository jobTracking;

    public JobService(JobRepository jobs, JobTargetRepository targets, StudentRepository students,
                      CompanyRepository companies, RecruiterRepository recruiters, UserRepository users,
                      PasswordEncoder encoder, Jsons jsons, PortalSocketService sockets,
                      NotificationService notifications, EmailService email, JobTrackingRepository jobTracking) {
        this.jobs = jobs;
        this.targets = targets;
        this.students = students;
        this.companies = companies;
        this.recruiters = recruiters;
        this.users = users;
        this.encoder = encoder;
        this.jsons = jsons;
        this.sockets = sockets;
        this.notifications = notifications;
        this.email = email;
        this.jobTracking = jobTracking;
    }

    public Map<String, Object> list(Map<String, String> query) {
        PortalPrincipal p = CurrentUser.require();
        String status = query.get("status");
        String recruiterId = query.get("recruiterId");
        String companyId = query.get("companyId");
        String createdBy = query.get("createdBy");
        String search = query.get("search");
        String isPostedRaw = query.get("isPosted");
        int page = parseInt(query.get("page"), 1);
        int limit = parseInt(query.get("limit"), 50);
        if (page < 1) page = 1;
        if (limit < 1) limit = 50;

        List<Job> filtered = jobs.findAll().stream()
                .filter(j -> matchList(j, p, status, recruiterId, companyId, createdBy, search, isPostedRaw))
                .sorted(Comparator.comparing(Job::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        int total = filtered.size();
        int from = Math.min((page - 1) * limit, total);
        int to = Math.min(from + limit, total);
        List<Job> pageItems = filtered.subList(from, to);

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("total", total);
        pagination.put("totalPages", limit == 0 ? 0 : (int) Math.ceil(total / (double) limit));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("success", true);
        out.put("jobs", pageItems);
        out.put("pagination", pagination);
        return out;
    }

    public List<Map<String, Object>> targeted() {
        CurrentUser.requireRole(Roles.STUDENT, Roles.ADMIN, Roles.SUPER_ADMIN);
        PortalPrincipal p = CurrentUser.require();
        Student student = p.getStudentId() != null
                ? students.findById(p.getStudentId()).orElse(null)
                : students.findByUserId(p.getId()).orElse(null);
        if (student == null || !JobEligibility.hasCompleteProfile(student)) {
            return List.of();
        }

        List<Job> posted = jobs.findByStatusAndIsPostedTrueOrderByPostedAtDesc("POSTED");
        if (posted.size() > 500) {
            posted = posted.subList(0, 500);
        }
        Set<String> cherryPicked = new HashSet<>();
        for (JobTarget t : targets.findByStudentId(student.getId())) {
            cherryPicked.add(t.getJobId());
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Job job : posted) {
            boolean explicit = cherryPicked.contains(job.getId());
            if (!matchesTargeting(student, job, explicit)) continue;
            // Eligibility (CGPA / YOP / backlogs) is shown as "Not eligible" on Explore Jobs
            // and enforced on apply. Hiding the row made the tab look empty.

            String mode = job.getVisibilityMode() == null ? "OPEN" : job.getVisibilityMode();
            Map<String, Object> m = new LinkedHashMap<>(jsons.toMap(job));
            if (job.getCompanyId() != null) {
                companies.findById(job.getCompanyId()).ifPresent(c -> m.put("company", jsons.toMap(c)));
            }
            m.put("isRecommended", ("PRIORITY".equalsIgnoreCase(mode)) && explicit);
            m.put("isInvited", ("INVITE_ONLY".equalsIgnoreCase(mode)) && explicit);
            String phase = drivePhase(job);
            m.put("drivePhase", phase);
            m.put("drivePhaseLabel", drivePhaseLabel(phase));
            out.add(m);
        }
        return out;
    }

    public Job get(String id) {
        return jobs.findById(id).orElseThrow(() -> ApiException.notFound("Job"));
    }

    @Transactional
    public Job create(Map<String, Object> body) {
        CurrentUser.requireRole(Roles.RECRUITER, Roles.ADMIN, Roles.SUPER_ADMIN);
        PortalPrincipal p = CurrentUser.require();
        if (extractRecruiterEmails(body).isEmpty()) {
            throw ApiException.badRequest("Please provide at least one recruiter or HR email");
        }
        Job j = new Job();
        apply(j, body);
        resolveCompanyAndRecruiter(j, body, p);
        j.setStatus("IN_REVIEW");
        j.setIsActive(false);
        j.setIsPosted(false);
        j.setCreatedBy(p.getId());
        j.setSubmittedAt(Instant.now());
        Job saved = jobs.save(j);
        notifyAdminsOfNewJob(saved, p);
        sockets.emitToRole("admins", "job:created", jsons.toMap(saved));
        return saved;
    }

    @Transactional
    public Job update(String id, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.RECRUITER, Roles.ADMIN, Roles.SUPER_ADMIN);
        Job j = get(id);
        apply(j, body);
        j.setUpdatedBy(CurrentUser.require().getId());
        return jobs.save(j);
    }

    @Transactional
    public Job recruiterNote(String id, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.RECRUITER);
        Job j = get(id);
        j.setRecruiterNote(String.valueOf(body.getOrDefault("recruiterNote", "")));
        return jobs.save(j);
    }

    @Transactional
    public Job post(String id, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.SUPER_ADMIN);
        Job j = get(id);
        if ("REJECTED".equalsIgnoreCase(j.getStatus())) {
            throw ApiException.badRequest("Rejected jobs cannot be posted. Please edit and resubmit the job for review.");
        }
        if (body.get("selectedSchools") != null) j.setTargetSchools(asJsonArray(body.get("selectedSchools")));
        if (body.get("selectedCenters") != null) j.setTargetCenters(asJsonArray(body.get("selectedCenters")));
        if (body.get("selectedBatches") != null) j.setTargetBatches(asJsonArray(body.get("selectedBatches")));
        if (body.get("selectedBranches") != null) j.setTargetBranches(asJsonArray(body.get("selectedBranches")));
        if (body.get("visibilityMode") != null) j.setVisibilityMode(str(body.get("visibilityMode")));
        j.setIsPosted(true);
        j.setIsActive(true);
        j.setPostedAt(Instant.now());
        j.setPostedBy(CurrentUser.require().getId());
        j.setStatus("POSTED");
        Job saved = jobs.save(j);
        sockets.emit("jobs:updates", "job:posted", jsons.toMap(saved));
        notifyJobPosted(saved);
        return saved;
    }

    @Transactional
    public Job approve(String id) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.SUPER_ADMIN);
        Job j = get(id);
        j.setApprovedAt(Instant.now());
        j.setApprovedBy(CurrentUser.require().getId());
        j.setStatus("APPROVED");
        return jobs.save(j);
    }

    @Transactional
    public Job reject(String id, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.SUPER_ADMIN);
        Job j = get(id);
        j.setRejectedAt(Instant.now());
        j.setRejectedBy(CurrentUser.require().getId());
        j.setRejectionReason(String.valueOf(body.getOrDefault("reason", "")));
        j.setStatus("REJECTED");
        j.setIsPosted(false);
        j.setIsActive(false);
        Job saved = jobs.save(j);
        notifyJobRejected(saved, saved.getRejectionReason());
        return saved;
    }

    @Transactional
    public void delete(String id) {
        CurrentUser.requireRole(Roles.RECRUITER, Roles.ADMIN, Roles.SUPER_ADMIN);
        jobs.deleteById(id);
    }

    private void apply(Job j, Map<String, Object> body) {
        String title = firstNonBlank(body.get("jobTitle"), body.get("title"));
        if (title != null) {
            j.setJobTitle(title);
        }
        if (j.getJobTitle() == null || j.getJobTitle().isBlank()) {
            throw ApiException.badRequest("Job title is required");
        }

        String description = firstNonBlank(body.get("description"), body.get("responsibilities"));
        j.setDescription(description == null ? "" : description);

        String requirements = firstNonBlank(body.get("requirements"));
        if (requirements == null && body.get("interviewRounds") instanceof Collection<?> rounds) {
            StringBuilder sb = new StringBuilder();
            for (Object r : rounds) {
                if (r instanceof Map<?, ?> m) {
                    Object t = m.get("title");
                    Object d = m.get("detail");
                    if (t != null || d != null) {
                        if (!sb.isEmpty()) sb.append('\n');
                        sb.append(t == null ? "Round" : t).append(": ").append(d == null ? "" : d);
                    }
                }
            }
            requirements = sb.toString();
        }
        j.setRequirements(requirements == null || requirements.isBlank() ? "[]" : requirements);

        Object skills = body.get("requiredSkills") != null ? body.get("requiredSkills") : body.get("skills");
        j.setRequiredSkills(asJsonArray(skills));

        String companyName = firstNonBlank(body.get("companyName"), body.get("company"));
        if (companyName != null) {
            j.setCompanyName(companyName);
        }
        if (body.get("companyId") != null) {
            j.setCompanyId(str(body.get("companyId")));
        }

        String location = firstNonBlank(body.get("location"), body.get("companyLocation"));
        if (location != null) {
            j.setLocation(location);
        }
        if (body.get("companyLocation") != null) {
            j.setCompanyLocation(str(body.get("companyLocation")));
        }

        String salary = firstNonBlank(body.get("salary"), body.get("stipend"));
        j.setSalary(salary == null ? "As per industry standards" : salary);
        String ctc = firstNonBlank(body.get("ctc"));
        j.setCtc(ctc == null ? "As per industry standards" : ctc);
        if (body.get("salaryRange") != null) {
            j.setSalaryRange(str(body.get("salaryRange")));
        }

        if (body.get("jobType") != null) j.setJobType(str(body.get("jobType")));
        if (body.get("workMode") != null) j.setWorkMode(str(body.get("workMode")));
        if (body.get("experienceLevel") != null) j.setExperienceLevel(str(body.get("experienceLevel")));
        if (body.get("reportingTime") != null) j.setReportingTime(str(body.get("reportingTime")));
        if (body.get("qualification") != null) j.setQualification(str(body.get("qualification")));
        if (body.get("specialization") != null) j.setSpecialization(str(body.get("specialization")));
        if (body.get("yop") != null) j.setYop(str(body.get("yop")));
        if (body.get("minCgpa") != null) j.setMinCgpa(str(body.get("minCgpa")));
        if (body.get("gapAllowed") != null) j.setGapAllowed(str(body.get("gapAllowed")));
        if (body.get("gapYears") != null) j.setGapYears(str(body.get("gapYears")));
        if (body.get("backlogs") != null) j.setBacklogs(str(body.get("backlogs")));

        Instant deadline = parseInstant(body.get("applicationDeadline"));
        if (deadline == null && j.getApplicationDeadline() == null) {
            throw ApiException.badRequest("Application deadline is required");
        }
        if (deadline != null) {
            j.setApplicationDeadline(deadline);
        }
        Instant driveDate = parseInstant(body.get("driveDate"));
        if (driveDate != null) {
            if (j.getApplicationDeadline() != null && !driveDate.isAfter(j.getApplicationDeadline())) {
                throw ApiException.badRequest("Drive date must be after the application deadline");
            }
            j.setDriveDate(driveDate);
        }

        j.setDriveVenues(asJsonArray(body.get("driveVenues")));
        j.setTargetSchools(asJsonArray(body.get("targetSchools")));
        j.setTargetCenters(asJsonArray(body.get("targetCenters")));
        j.setTargetBatches(asJsonArray(body.get("targetBatches")));
        j.setTargetBranches(asJsonArray(first(body.get("targetBranches"), "[]")));
        j.setTargetSchoolIds(asJsonArray(first(body.get("targetSchoolIds"), "[]")));
        j.setTargetCenterIds(asJsonArray(first(body.get("targetCenterIds"), "[]")));
        j.setTargetBatchIds(asJsonArray(first(body.get("targetBatchIds"), "[]")));
        j.setSpocs(asJsonArray(cleanSpocs(body.get("spocs"))));
        j.setCustomQuestions(asJsonArray(first(body.get("customQuestions"), "[]")));
        if (body.get("interviewRounds") != null) {
            j.setInterviewRounds(asJsonArray(body.get("interviewRounds")));
        }

        List<Map<String, String>> emails = extractRecruiterEmails(body);
        if (!emails.isEmpty()) {
            j.setRecruiterEmail(emails.get(0).get("email"));
            j.setRecruiterName(emails.get(0).get("name"));
            j.setRecruiterEmails(jsons.toJson(emails));
        }

        if (j.getCompanyTier() == null) j.setCompanyTier("REGULAR");
        if (j.getInterviewMode() == null) j.setInterviewMode("OFFLINE");
        if (j.getVisibilityMode() == null) j.setVisibilityMode("OPEN");
        if (j.getRequiresScreening() == null) j.setRequiresScreening(false);
        if (j.getRequiresTest() == null) j.setRequiresTest(false);
        if (j.getResultsLocked() == null) j.setResultsLocked(false);
        if (j.getRecommendationEnabled() == null) j.setRecommendationEnabled(false);
        if (j.getApplicationDeadlineMailSent() == null) j.setApplicationDeadlineMailSent(false);
        if (j.getDriveReminder7dSent() == null) j.setDriveReminder7dSent(false);
        if (j.getDriveReminder3dSent() == null) j.setDriveReminder3dSent(false);
        if (j.getDriveReminder24hSent() == null) j.setDriveReminder24hSent(false);
    }

    private void resolveCompanyAndRecruiter(Job j, Map<String, Object> body, PortalPrincipal p) {
        if (Roles.RECRUITER.equals(p.getRole())) {
            if (p.getRecruiterId() == null) {
                throw ApiException.forbidden("Recruiter profile not found");
            }
            j.setRecruiterId(p.getRecruiterId());
        } else if (body.get("recruiterId") != null) {
            String rid = str(body.get("recruiterId"));
            // Frontend often sends the logged-in admin user id here — only accept a real recruiter.
            if (recruiters.existsById(rid)) {
                j.setRecruiterId(rid);
            } else {
                recruiters.findByUserId(rid).ifPresent(r -> j.setRecruiterId(r.getId()));
            }
        }

        if (j.getRecruiterId() == null && j.getRecruiterEmail() != null) {
            users.findByEmail(j.getRecruiterEmail()).ifPresentOrElse(user -> {
                recruiters.findByUserId(user.getId()).ifPresentOrElse(r -> j.setRecruiterId(r.getId()), () -> {
                    Recruiter created = new Recruiter();
                    created.setUserId(user.getId());
                    created.setCompanyName(j.getCompanyName() == null ? "Unknown Company" : j.getCompanyName());
                    created.setLocation(j.getCompanyLocation());
                    j.setRecruiterId(recruiters.save(created).getId());
                });
            }, () -> {
                User user = new User();
                user.setEmail(j.getRecruiterEmail());
                user.setPasswordHash(encoder.encode("ChangeMe123!"));
                user.setRole(Roles.RECRUITER);
                user.setStatus("ACTIVE");
                user.setEmailVerified(true);
                user.setDisplayName(j.getRecruiterName() == null ? "New Recruiter" : j.getRecruiterName());
                user.setSessionVersion(0);
                user = users.save(user);
                Recruiter created = new Recruiter();
                created.setUserId(user.getId());
                created.setCompanyName(j.getCompanyName() == null ? "Unknown Company" : j.getCompanyName());
                created.setLocation(j.getCompanyLocation());
                j.setRecruiterId(recruiters.save(created).getId());
            });
        }

        String companyName = j.getCompanyName();
        if ((j.getCompanyId() == null || j.getCompanyId().isBlank()) && companyName != null && !companyName.isBlank()) {
            Company company = companies.findByNameIgnoreCase(companyName).orElseGet(() -> {
                Company c = new Company();
                c.setName(companyName);
                c.setWebsite(firstNonBlank(body.get("website")));
                c.setLocation(j.getCompanyLocation());
                return companies.save(c);
            });
            j.setCompanyId(company.getId());
            if (firstNonBlank(body.get("website")) != null && (company.getWebsite() == null || company.getWebsite().isBlank())) {
                company.setWebsite(str(body.get("website")));
                companies.save(company);
            }
        }

        if (j.getRecruiterId() != null && j.getCompanyId() != null) {
            recruiters.findById(j.getRecruiterId()).ifPresent(r -> {
                if (r.getCompanyId() == null) {
                    r.setCompanyId(j.getCompanyId());
                    recruiters.save(r);
                }
            });
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> extractRecruiterEmails(Map<String, Object> body) {
        List<Map<String, String>> out = new ArrayList<>();
        Object raw = body.get("recruiterEmails");
        if (raw instanceof Collection<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) {
                    String email = firstNonBlank(m.get("email"));
                    if (email != null && email.contains("@")) {
                        Map<String, String> row = new LinkedHashMap<>();
                        row.put("email", email.toLowerCase(Locale.ROOT));
                        row.put("name", firstNonBlank(m.get("name")));
                        out.add(row);
                    }
                } else if (item != null && String.valueOf(item).contains("@")) {
                    out.add(Map.of("email", String.valueOf(item).trim().toLowerCase(Locale.ROOT)));
                }
            }
        }
        String single = firstNonBlank(body.get("recruiterEmail"));
        if (out.isEmpty() && single != null && single.contains("@")) {
            Map<String, String> row = new LinkedHashMap<>();
            row.put("email", single.toLowerCase(Locale.ROOT));
            row.put("name", firstNonBlank(body.get("recruiterName")));
            out.add(row);
        }
        return out;
    }

    private List<Object> cleanSpocs(Object raw) {
        if (!(raw instanceof Collection<?> list)) {
            return List.of();
        }
        List<Object> out = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                if (firstNonBlank(m.get("fullName"), m.get("email"), m.get("phone")) != null) {
                    out.add(item);
                }
            }
        }
        return out;
    }

    private String asJsonArray(Object value) {
        if (value == null) {
            return "[]";
        }
        if (value instanceof String s) {
            String trimmed = s.trim();
            if (trimmed.isEmpty()) return "[]";
            if (trimmed.startsWith("[") || trimmed.startsWith("{")) return trimmed;
            return jsons.toJson(List.of(trimmed));
        }
        return jsons.toJson(value);
    }

    private Instant parseInstant(Object raw) {
        if (raw == null) return null;
        String s = raw.toString().trim();
        if (s.isBlank() || "null".equalsIgnoreCase(s)) return null;
        try {
            return Instant.parse(s);
        } catch (Exception ignored) {
        }
        try {
            return OffsetDateTime.parse(s).toInstant();
        } catch (Exception ignored) {
        }
        try {
            String date = s.length() >= 10 ? s.substring(0, 10) : s;
            return LocalDate.parse(date).atStartOfDay().toInstant(ZoneOffset.UTC);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String firstNonBlank(Object... values) {
        for (Object v : values) {
            if (v == null) continue;
            String s = v.toString().trim();
            if (!s.isEmpty() && !"null".equalsIgnoreCase(s) && !"undefined".equalsIgnoreCase(s)) {
                return s;
            }
        }
        return null;
    }

    private static Object first(Object value, Object fallback) {
        return value == null ? fallback : value;
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private boolean matchList(Job j, PortalPrincipal p, String status, String recruiterId,
                              String companyId, String createdBy, String search, String isPostedRaw) {
        if (Roles.STUDENT.equals(p.getRole())
                && !(Boolean.TRUE.equals(j.getIsPosted()) && Boolean.TRUE.equals(j.getIsActive()))) {
            return false;
        }
        if (Roles.RECRUITER.equals(p.getRole()) && p.getRecruiterId() != null
                && !p.getRecruiterId().equals(j.getRecruiterId())) {
            return false;
        }
        if (notBlank(status) && !status.equalsIgnoreCase(j.getStatus())) {
            return false;
        }
        if (notBlank(recruiterId) && !recruiterId.equals(j.getRecruiterId())) {
            return false;
        }
        if (notBlank(companyId) && !companyId.equals(j.getCompanyId())) {
            return false;
        }
        if (notBlank(createdBy) && !"ALL".equalsIgnoreCase(createdBy) && !createdBy.equals(j.getCreatedBy())) {
            return false;
        }
        if (notBlank(isPostedRaw)) {
            boolean wantPosted = "true".equalsIgnoreCase(isPostedRaw) || "1".equals(isPostedRaw);
            if (wantPosted != Boolean.TRUE.equals(j.getIsPosted())) {
                return false;
            }
        }
        if (notBlank(search)) {
            String needle = search.toLowerCase(Locale.ROOT);
            String title = j.getJobTitle() == null ? "" : j.getJobTitle().toLowerCase(Locale.ROOT);
            String company = j.getCompanyName() == null ? "" : j.getCompanyName().toLowerCase(Locale.ROOT);
            if (!title.contains(needle) && !company.contains(needle)) {
                return false;
            }
        }
        return true;
    }

    private void notifyAdminsOfNewJob(Job job, PortalPrincipal creator) {
        try {
            String company = job.getCompanyName() == null ? "Unknown Company" : job.getCompanyName();
            String title = "New Job Pending Approval: " + job.getJobTitle();
            String body = Roles.RECRUITER.equals(creator.getRole())
                    ? "A recruiter submitted a job posting for " + company + " that requires your approval."
                    : "A new job posting for " + company + " has been created and requires your approval.";
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("type", "jd_approval");
            data.put("jobId", job.getId());
            data.put("jobTitle", job.getJobTitle());
            data.put("companyName", company);
            for (User admin : users.findByRoleAndStatus(Roles.ADMIN, "ACTIVE")) {
                notifications.create(admin.getId(), title, body, data);
            }
            for (User admin : users.findByRoleAndStatus(Roles.SUPER_ADMIN, "ACTIVE")) {
                notifications.create(admin.getId(), title, body, data);
            }
        } catch (Exception ignored) {
            // notification is best-effort, matching Node
        }
    }

    private void notifyJobPosted(Job job) {
        try {
            String recruiterName = job.getRecruiterName();
            for (String addr : recruiterEmailsFor(job)) {
                email.sendJobPostedNotification(job, addr, recruiterName);
            }
            for (Student student : students.findAll()) {
                if (!studentMatchesJob(student, job)) continue;
                if (student.getEmail() == null || student.getEmail().isBlank()) continue;
                if (Boolean.TRUE.equals(student.getEmailNotificationsDisabled())) continue;
                if (jobTracking.findByStudentIdAndJobId(student.getId(), job.getId()).isEmpty()) {
                    JobTracking tracking = new JobTracking();
                    tracking.setStudentId(student.getId());
                    tracking.setJobId(job.getId());
                    tracking.setIsNew(true);
                    tracking.setViewed(false);
                    tracking.setApplied(false);
                    jobTracking.save(tracking);
                }
                if (student.getUserId() != null) {
                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("type", "new_job");
                    data.put("jobId", job.getId());
                    data.put("jobTitle", job.getJobTitle());
                    notifications.create(student.getUserId(),
                            "New job: " + job.getJobTitle(),
                            "A new opportunity at " + (job.getCompanyName() == null ? "a company" : job.getCompanyName()) + " is open.",
                            data);
                }
                email.sendNewJobNotification(student, job);
            }
        } catch (Exception e) {
            // posting still succeeds if email/distribution fails
        }
    }

    private void notifyJobRejected(Job job, String reason) {
        try {
            if (job.getRecruiterId() == null) return;
            recruiters.findById(job.getRecruiterId()).ifPresent(recruiter -> {
                if (recruiter.getUserId() == null) return;
                Map<String, Object> data = new LinkedHashMap<>();
                data.put("type", "job_rejected");
                data.put("jobId", job.getId());
                data.put("jobTitle", job.getJobTitle());
                data.put("rejectionReason", reason == null ? "No reason provided" : reason);
                notifications.create(recruiter.getUserId(), "Job Posting Rejected",
                        "Your job posting \"" + job.getJobTitle() + "\" has been rejected. Reason: "
                                + (reason == null ? "No reason provided" : reason),
                        data, true);
            });
        } catch (Exception ignored) {
            // best-effort
        }
    }

    private java.util.Set<String> recruiterEmailsFor(Job job) {
        java.util.Set<String> emails = new java.util.LinkedHashSet<>();
        if (notBlank(job.getRecruiterEmail())) {
            emails.add(job.getRecruiterEmail().toLowerCase(Locale.ROOT));
        }
        if (notBlank(job.getRecruiterEmails())) {
            for (Object item : jsons.fromJsonList(job.getRecruiterEmails())) {
                if (item instanceof Map<?, ?> m && m.get("email") != null) {
                    emails.add(String.valueOf(m.get("email")).toLowerCase(Locale.ROOT).trim());
                } else if (item != null && String.valueOf(item).contains("@")) {
                    emails.add(String.valueOf(item).toLowerCase(Locale.ROOT).trim());
                }
            }
        }
        if (job.getRecruiterId() != null) {
            recruiters.findById(job.getRecruiterId()).ifPresent(r -> {
                if (r.getUserId() != null) {
                    users.findById(r.getUserId()).ifPresent(u -> {
                        if (u.getEmail() != null) emails.add(u.getEmail().toLowerCase(Locale.ROOT));
                    });
                }
            });
        }
        emails.removeIf(s -> s == null || s.isBlank() || !s.contains("@"));
        return emails;
    }

    private boolean studentMatchesJob(Student student, Job job) {
        return matchesTarget(job.getTargetSchools(), student.getSchool(), student.getSchoolId())
                && matchesTarget(job.getTargetCenters(), student.getCenter(), student.getCenterId())
                && matchesTarget(job.getTargetBatches(), student.getBatch(), student.getBatchId());
    }

    private boolean matchesTargeting(Student student, Job job, boolean explicitlyTargeted) {
        List<String> targetSchools = stringList(job.getTargetSchools());
        List<String> targetCenters = stringList(job.getTargetCenters());
        List<String> targetBatches = stringList(job.getTargetBatches());
        if (targetSchools.isEmpty() && targetCenters.isEmpty() && targetBatches.isEmpty()) {
            return true;
        }
        if (containsAll(targetSchools) || containsAll(targetCenters) || containsAll(targetBatches)) {
            return true;
        }
        if (explicitlyTargeted) return true;
        String mode = job.getVisibilityMode() == null ? "" : job.getVisibilityMode();
        if ("INVITE_ONLY".equalsIgnoreCase(mode)) return false;

        List<String> schoolIds = stringList(job.getTargetSchoolIds());
        List<String> centerIds = stringList(job.getTargetCenterIds());
        List<String> batchIds = stringList(job.getTargetBatchIds());
        boolean hasIdTargeting = !schoolIds.isEmpty() || !centerIds.isEmpty() || !batchIds.isEmpty();
        if (hasIdTargeting) {
            boolean schoolMatch = schoolIds.isEmpty() || schoolIds.contains(student.getSchoolId());
            boolean centerMatch = centerIds.isEmpty() || centerIds.contains(student.getCenterId());
            boolean batchMatch = batchIds.isEmpty() || batchIds.contains(student.getBatchId());
            if (schoolMatch && centerMatch && batchMatch) return true;
        }
        return studentMatchesJob(student, job);
    }

    private List<String> stringList(String json) {
        List<String> out = new ArrayList<>();
        for (Object item : jsons.fromJsonList(json)) {
            if (item != null && !String.valueOf(item).isBlank()) {
                out.add(String.valueOf(item));
            }
        }
        return out;
    }

    private static boolean containsAll(List<String> values) {
        return values.stream().anyMatch(v -> "ALL".equalsIgnoreCase(v));
    }

    private static String drivePhase(Job job) {
        if (job.getResultsDeclaredAt() != null || Boolean.TRUE.equals(job.getResultsLocked())) {
            return "RESULTS_DECLARED";
        }
        Instant deadline = job.getApplicationDeadline();
        if (deadline != null && deadline.isBefore(Instant.now())) return "APPLICATIONS_CLOSED";
        if (Boolean.TRUE.equals(job.getIsPosted()) || "POSTED".equals(job.getStatus())) return "APPLICATIONS_OPEN";
        if ("IN_REVIEW".equals(job.getStatus())) return "IN_REVIEW";
        if ("REJECTED".equals(job.getStatus())) return "REJECTED";
        if ("ARCHIVED".equals(job.getStatus())) return "ARCHIVED";
        return "DRAFT";
    }

    private static String drivePhaseLabel(String phase) {
        return switch (phase) {
            case "DRAFT" -> "Draft";
            case "IN_REVIEW" -> "In review";
            case "APPLICATIONS_OPEN" -> "Applications open";
            case "APPLICATIONS_CLOSED" -> "Applications closed";
            case "SCREENING" -> "Screening in progress";
            case "INTERVIEWS_LIVE" -> "Interviews live";
            case "INTERVIEWS_COMPLETED" -> "Interviews completed";
            case "INTERVIEWS_INCOMPLETE" -> "Interviews incomplete";
            case "RESULTS_DECLARED" -> "Results declared";
            case "REJECTED" -> "Rejected";
            case "ARCHIVED" -> "Archived";
            default -> phase == null ? "Unknown" : phase;
        };
    }

    private boolean matchesTarget(String json, String name, String id) {
        List<String> targets = new ArrayList<>();
        for (Object item : jsons.fromJsonList(json)) {
            if (item != null && !String.valueOf(item).isBlank()) {
                targets.add(String.valueOf(item));
            }
        }
        if (targets.isEmpty() || targets.stream().anyMatch(t -> "ALL".equalsIgnoreCase(t))) {
            return true;
        }
        return targets.stream().anyMatch(t -> t.equalsIgnoreCase(name) || t.equals(id));
    }

    private static int parseInt(String raw, int fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
