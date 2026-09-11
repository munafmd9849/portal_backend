package com.pwioi.portal.service;

import com.pwioi.portal.entity.Admin;
import com.pwioi.portal.entity.Application;
import com.pwioi.portal.entity.InterviewSession;
import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.Recruiter;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.entity.User;
import com.pwioi.portal.repository.AdminRepository;
import com.pwioi.portal.repository.ApplicationRepository;
import com.pwioi.portal.repository.BatchRepository;
import com.pwioi.portal.repository.CenterRepository;
import com.pwioi.portal.repository.CompanyRepository;
import com.pwioi.portal.repository.InterviewSessionRepository;
import com.pwioi.portal.repository.JobRepository;
import com.pwioi.portal.repository.RecruiterRepository;
import com.pwioi.portal.repository.SchoolRepository;
import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.repository.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class JobOpportunitiesService {
    private static final List<String> PLACED = List.of("SELECTED", "ACCEPTED", "OFFERED");
    private static final List<String> SHORTLIST = List.of("SHORTLISTED", "INTERVIEWED", "SELECTED", "ACCEPTED", "OFFERED");
    private static final List<String> INTERVIEW_SCHEDULED = List.of(
            "SCHEDULED", "INTERVIEWED", "SHORTLISTED", "INTERVIEW_ELIGIBLE", "SELECTED", "ACCEPTED", "OFFERED");
    private static final List<String> DEFAULT_SEGMENTS =
            List.of("General", "Data Analytics", "Digital Marketing", "Product Management");

    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final StudentRepository students;
    private final CompanyRepository companies;
    private final RecruiterRepository recruiters;
    private final UserRepository users;
    private final AdminRepository admins;
    private final InterviewSessionRepository sessions;
    private final SchoolRepository schools;
    private final CenterRepository centers;
    private final BatchRepository batches;

    public JobOpportunitiesService(
            JobRepository jobs,
            ApplicationRepository applications,
            StudentRepository students,
            CompanyRepository companies,
            RecruiterRepository recruiters,
            UserRepository users,
            AdminRepository admins,
            InterviewSessionRepository sessions,
            SchoolRepository schools,
            CenterRepository centers,
            BatchRepository batches) {
        this.jobs = jobs;
        this.applications = applications;
        this.students = students;
        this.companies = companies;
        this.recruiters = recruiters;
        this.users = users;
        this.admins = admins;
        this.sessions = sessions;
        this.schools = schools;
        this.centers = centers;
        this.batches = batches;
    }

    public Map<String, Object> overview(Map<String, String> query) {
        Snapshot snap = load(query);
        List<Job> jobList = snap.jobs();
        List<Application> apps = snap.apps();
        List<Student> studentList = snap.students();
        Map<String, User> usersById = snap.usersById();

        long totalCsPool = studentList.size();
        long activeCsPool = studentList.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(statusOf(usersById.get(s.getUserId()))))
                .count();
        long inactiveCsPool = totalCsPool - activeCsPool;
        long companiesOnboarded = jobList.stream()
                .map(j -> j.getCompanyId() != null ? j.getCompanyId() : j.getCompanyName())
                .filter(v -> v != null && !v.isBlank())
                .distinct()
                .count();
        if (companiesOnboarded == 0) {
            companiesOnboarded = companies.count();
        }

        long jdsAnnounced = jobList.stream().filter(this::isPosted).count();
        long openPositions = jobList.stream()
                .filter(j -> Boolean.TRUE.equals(j.getIsActive()) && isPosted(j))
                .count();
        long applicationsShared = apps.size();
        long transitions = apps.stream().filter(a -> SHORTLIST.contains(upper(a.getStatus()))).count();

        long jobsActive = jobList.stream()
                .filter(j -> Boolean.TRUE.equals(j.getIsPosted()) && Boolean.TRUE.equals(j.getIsActive()))
                .count();
        long jobsHold = jobList.stream().filter(j -> "HOLD".equals(deriveJobDriveStatus(j))).count();
        long jobsInProcess = jobList.stream().filter(j -> "IN_PROCESS".equals(deriveJobDriveStatus(j))).count();
        long jobsYetToStart = jobList.stream().filter(j -> "YET_TO_START".equals(deriveJobDriveStatus(j))).count();
        long jobsClosed = jobList.stream().filter(j -> "CLOSED".equals(deriveJobDriveStatus(j))).count();
        long jobsNotDeliverable = jobList.stream().filter(j -> "NOT_DELIVERABLE".equals(deriveJobDriveStatus(j))).count();
        long studentsNotApplied = studentList.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(statusOf(usersById.get(s.getUserId()))))
                .filter(s -> s.getStatsApplied() == null || s.getStatsApplied() == 0)
                .count();

        int closedDrives = 0;
        int closedSelection = 0;
        int closedRejection = 0;
        int noShow = 0;
        int screenReject = 0;
        int appShortlisted = 0;
        int appRejected = 0;
        int appPending = 0;
        for (Application app : apps) {
            Pipeline p = derivePipeline(app);
            if ("CLOSED".equals(p.status())) {
                closedDrives++;
                if ("CLOSED_WITH_SELECTION".equals(p.sub())) closedSelection++;
                else if ("CLOSED_WITH_REJECTION".equals(p.sub())) closedRejection++;
                else if ("NO_SHOW".equals(p.sub())) noShow++;
                else if ("SCREEN_REJECT".equals(p.sub())) screenReject++;
            }
            String st = upper(app.getStatus());
            if (SHORTLIST.contains(st)) appShortlisted++;
            else if ("REJECTED".equals(st)) appRejected++;
            else if ("APPLIED".equals(st)) appPending++;
        }

        Map<String, Object> row1 = new LinkedHashMap<>();
        row1.put("totalCsPool", totalCsPool);
        row1.put("activeCsPool", activeCsPool);
        row1.put("inactiveCsPool", inactiveCsPool);
        row1.put("companiesOnboarded", companiesOnboarded);
        row1.put("jdsAnnounced", jdsAnnounced);
        row1.put("openPositions", openPositions);
        row1.put("applicationsShared", applicationsShared);
        row1.put("transitions", transitions);

        Map<String, Object> row2 = new LinkedHashMap<>();
        row2.put("active", jobsActive);
        row2.put("hold", jobsHold);
        row2.put("inProcess", jobsInProcess);
        row2.put("yetToStart", jobsYetToStart);
        row2.put("closedDrives", closedDrives > 0 ? closedDrives : jobsClosed);
        row2.put("learnerNotApplied", studentsNotApplied);
        row2.put("notDeliverable", jobsNotDeliverable);

        Map<String, Object> closedSubs = new LinkedHashMap<>();
        closedSubs.put("CLOSED_WITH_SELECTION", closedSelection);
        closedSubs.put("CLOSED_WITH_REJECTION", closedRejection);
        closedSubs.put("NO_SHOW", noShow);
        closedSubs.put("SCREEN_REJECT", screenReject);

        Map<String, Object> appStages = Map.of(
                "shortlisted", appShortlisted, "rejected", appRejected, "pending", appPending);
        Map<String, Object> transitionsSubs = Map.of(
                "active", jobsActive, "hold", jobsHold, "inProcess", jobsInProcess, "yetToStart", jobsYetToStart);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("row1", row1);
        out.put("row2", row2);
        out.put("_meta", Map.of("closedSubs", closedSubs, "appStages", appStages, "transitionsSubs", transitionsSubs));
        return out;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> breakdown(String cardKey, Map<String, String> query) {
        Map<String, Object> overview = overview(query);
        Map<String, Object> row1 = (Map<String, Object>) overview.get("row1");
        Map<String, Object> row2 = (Map<String, Object>) overview.get("row2");
        Map<String, Object> meta = (Map<String, Object>) overview.get("_meta");
        Map<String, Object> closedSubs = (Map<String, Object>) meta.get("closedSubs");
        Map<String, Object> appStages = (Map<String, Object>) meta.get("appStages");
        Map<String, Object> transitionsSubs = (Map<String, Object>) meta.get("transitionsSubs");
        return switch (cardKey == null ? "" : cardKey) {
            case "closed_drives" -> Map.of(
                    "total", row2.get("closedDrives"),
                    "items", List.of(
                            item("Closed with Selection", closedSubs.get("CLOSED_WITH_SELECTION"), "green"),
                            item("Closed with Rejection", closedSubs.get("CLOSED_WITH_REJECTION"), "red"),
                            item("Closed with No Show", closedSubs.get("NO_SHOW"), "amber"),
                            item("Screen Reject", closedSubs.get("SCREEN_REJECT"), "gray")
                    ));
            case "applications_shared" -> Map.of(
                    "total", row1.get("applicationsShared"),
                    "items", List.of(
                            item("Shortlisted", appStages.get("shortlisted"), "green"),
                            item("Rejected", appStages.get("rejected"), "red"),
                            item("Pending", appStages.get("pending"), "amber")
                    ));
            case "transitions" -> Map.of(
                    "total", row1.get("transitions"),
                    "items", List.of(
                            item("Active", transitionsSubs.get("active"), "green"),
                            item("Hold", transitionsSubs.get("hold"), "amber"),
                            item("In Process", transitionsSubs.get("inProcess"), "blue"),
                            item("Yet to Start", transitionsSubs.get("yetToStart"), "gray")
                    ));
            case "total_cs_pool" -> Map.of(
                    "total", row1.get("totalCsPool"),
                    "items", List.of(
                            item("Active CS Pool", row1.get("activeCsPool"), "green"),
                            item("Inactive CS Pool", row1.get("inactiveCsPool"), "red")
                    ));
            default -> Map.of("total", 0, "items", List.of());
        };
    }

    public Map<String, Object> crManagers(Map<String, String> query) {
        Snapshot snap = load(query);
        Map<String, List<Application>> appsByJob = snap.apps().stream()
                .collect(Collectors.groupingBy(a -> a.getJobId() == null ? "" : a.getJobId()));
        Map<String, InterviewSession> sessionByJob = sessions.findAll().stream()
                .filter(s -> s.getJobId() != null)
                .collect(Collectors.toMap(InterviewSession::getJobId, s -> s, (a, b) -> a));
        Map<String, Admin> adminByUser = admins.findAll().stream()
                .filter(a -> a.getUserId() != null)
                .collect(Collectors.toMap(Admin::getUserId, a -> a, (a, b) -> a));
        Map<String, Recruiter> recruitersById = recruiters.findAll().stream()
                .collect(Collectors.toMap(Recruiter::getId, r -> r, (a, b) -> a));

        Map<String, ManagerAgg> managerMap = new LinkedHashMap<>();
        for (Job job : snap.jobs()) {
            String managerKey = job.getCreatedBy() != null
                    ? job.getCreatedBy()
                    : (job.getRecruiterId() != null ? "rec:" + job.getRecruiterId() : "unassigned");
            ManagerAgg row = managerMap.computeIfAbsent(managerKey, k -> new ManagerAgg(job.getCreatedBy(), job.getRecruiterId()));
            row.jdsPunched++;
            row.jobs.add(job.getId());
            if (job.getCompanyId() != null) row.companies.add(job.getCompanyId());
            else if (job.getCompanyName() != null) row.companies.add(job.getCompanyName());
            String drive = deriveJobDriveStatus(job);
            if ("HOLD".equals(drive)) row.hold++;
            if ("YET_TO_START".equals(drive)) row.yetToStart++;
            InterviewSession sess = sessionByJob.get(job.getId());
            List<Application> jobApps = appsByJob.getOrDefault(job.getId(), List.of());
            if (sess != null && jobApps.isEmpty()) row.scheduledKeys.add("job:" + job.getId());
            for (Application app : jobApps) {
                String st = upper(app.getStatus());
                String interviewSt = upper(app.getInterviewStatus());
                Pipeline p = derivePipeline(app);
                row.applicationsShared++;
                if (PLACED.contains(st) || PLACED.contains(interviewSt)) row.studentsPlaced++;
                if (SHORTLIST.contains(st)) row.transitions++;
                if (app.getInterviewDate() != null || INTERVIEW_SCHEDULED.contains(interviewSt) || INTERVIEW_SCHEDULED.contains(st)) {
                    row.scheduledKeys.add("app:" + app.getId());
                }
                if (sess != null) row.scheduledKeys.add("session:" + job.getId());
                if ("IN_PROCESS".equals(p.status())) row.inProcess++;
                if ("CLOSED".equals(p.status())) row.closedDrives++;
            }
        }

        List<Map<String, Object>> managers = new ArrayList<>();
        Set<String> existing = new HashSet<>();
        String search = query.get("search");
        for (ManagerAgg m : managerMap.values()) {
            String name = "Unknown";
            String adminStatus = null;
            if (m.userId != null && adminByUser.containsKey(m.userId)) {
                Admin a = adminByUser.get(m.userId);
                User u = snap.usersById().get(m.userId);
                name = firstNonBlank(u != null ? u.getDisplayName() : null, a.getName(), u != null ? u.getEmail() : null, "Unknown");
                adminStatus = u != null ? u.getStatus() : null;
            } else if (m.recruiterId != null && recruitersById.containsKey(m.recruiterId)) {
                Recruiter r = recruitersById.get(m.recruiterId);
                User u = r.getUserId() != null ? snap.usersById().get(r.getUserId()) : null;
                name = firstNonBlank(u != null ? u.getDisplayName() : null, r.getCompanyName(), u != null ? u.getEmail() : null, "Unknown");
                adminStatus = u != null ? u.getStatus() : null;
            }
            if (search != null && !search.isBlank() && !name.toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))) {
                continue;
            }
            String id = m.userId != null ? m.userId : (m.recruiterId != null ? m.recruiterId : "unassigned");
            existing.add(id);
            managers.add(managerCard(id, name, adminStatus, m));
        }

        for (User u : users.findByRole("ADMIN")) {
            if (existing.contains(u.getId())) continue;
            Admin a = adminByUser.get(u.getId());
            String name = firstNonBlank(u.getDisplayName(), a != null ? a.getName() : null, u.getEmail(), "Unknown");
            managers.add(managerCard(u.getId(), name, u.getStatus(), new ManagerAgg(u.getId(), null)));
        }

        managers.sort(Comparator
                .<Map<String, Object>>comparingInt(m -> ((Number) m.get("count")).intValue()).reversed()
                .thenComparing(m -> String.valueOf(m.get("name"))));
        int totalJds = managers.stream().mapToInt(m -> ((Number) m.get("count")).intValue()).sum();
        return Map.of("jdsPunched", totalJds, "managers", managers);
    }

    public Map<String, Object> momTable(Map<String, String> query) {
        Snapshot snap = load(query);
        Map<String, Job> jobsById = snap.jobs().stream().collect(Collectors.toMap(Job::getId, j -> j, (a, b) -> a));
        Map<String, Student> studentsById = snap.students().stream().collect(Collectors.toMap(Student::getId, s -> s, (a, b) -> a));
        Map<String, Recruiter> recruitersById = recruiters.findAll().stream()
                .collect(Collectors.toMap(Recruiter::getId, r -> r, (a, b) -> a));
        String search = query.get("search");
        Map<String, MomAgg> rowsMap = new LinkedHashMap<>();

        for (Application app : snap.apps()) {
            Job job = jobsById.get(app.getJobId());
            if (job == null || job.getRecruiterId() == null) continue;
            Recruiter rec = recruitersById.get(job.getRecruiterId());
            User recUser = rec != null && rec.getUserId() != null ? snap.usersById().get(rec.getUserId()) : null;
            String managerName = firstNonBlank(
                    recUser != null ? recUser.getDisplayName() : null,
                    rec != null ? rec.getCompanyName() : null,
                    job.getCompanyName(),
                    "Unknown");
            if (search != null && !search.isBlank()
                    && !managerName.toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))) {
                continue;
            }
            Student student = studentsById.get(app.getStudentId());
            String segment = firstNonBlank(app.getSegment(), deriveSegment(job, student), "General");
            String key = job.getRecruiterId() + "::" + segment;
            MomAgg row = rowsMap.computeIfAbsent(key, k -> new MomAgg(job.getRecruiterId(), managerName, segment));
            row.jobs.add(job.getId());
            if (job.getCompanyId() != null) row.companies.add(job.getCompanyId());
            else if (job.getCompanyName() != null) row.companies.add(job.getCompanyName());
            Pipeline p = derivePipeline(app);
            String drive = deriveJobDriveStatus(job);
            if ("CLOSED".equals(p.status())) row.closedDrives++;
            if (SHORTLIST.contains(upper(app.getStatus()))) row.transitions++;
            if ("IN_PROCESS".equals(p.status())) row.inProcess++;
            if ("HOLD".equals(drive)) row.hold++;
            if ("YET_TO_START".equals(drive)) row.yetToStart++;
            if ("NOT_DELIVERABLE".equals(drive)) row.notDeliverable++;
            row.goal = Math.max(row.goal, row.closedDrives + 5);
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (MomAgg r : rowsMap.values()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("crManagerId", r.crManagerId);
            row.put("crManager", r.crManager);
            row.put("segment", r.segment);
            row.put("goal", r.goal);
            row.put("closedDrives", r.closedDrives);
            row.put("achievedGoalPct", r.goal > 0 ? Math.round((r.closedDrives * 100.0) / r.goal) : 0);
            row.put("companies", r.companies.size());
            row.put("jobs", r.jobs.size());
            row.put("transitions", r.transitions);
            row.put("yetToStart", r.yetToStart);
            row.put("hold", r.hold);
            row.put("inProcess", r.inProcess);
            row.put("notApplied", r.notApplied);
            row.put("notDeliverable", r.notDeliverable);
            rows.add(row);
        }
        rows.sort(Comparator
                .comparing((Map<String, Object> r) -> String.valueOf(r.get("crManager")))
                .thenComparing(r -> String.valueOf(r.get("segment"))));
        return Map.of("rows", rows);
    }

    public Map<String, Object> filterOptions() {
        List<String> segments = jobs.findAll().stream()
                .map(Job::getSpecialization)
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        if (segments.isEmpty()) segments = new ArrayList<>(DEFAULT_SEGMENTS);

        List<Map<String, String>> quarters = List.of(
                Map.of("id", "Q1", "name", "Q1 (Jan–Mar)"),
                Map.of("id", "Q2", "name", "Q2 (Apr–Jun)"),
                Map.of("id", "Q3", "name", "Q3 (Jul–Sep)"),
                Map.of("id", "Q4", "name", "Q4 (Oct–Dec)")
        );
        List<Map<String, String>> months = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            months.add(Map.of(
                    "id", String.valueOf(i),
                    "name", LocalDate.of(2000, i, 1).getMonth().getDisplayName(java.time.format.TextStyle.FULL, Locale.US)));
        }
        Map<String, User> usersById = users.findAll().stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        List<Map<String, String>> crManagers = recruiters.findAll().stream()
                .map(r -> {
                    User u = r.getUserId() != null ? usersById.get(r.getUserId()) : null;
                    return Map.of(
                            "id", r.getId(),
                            "name", firstNonBlank(u != null ? u.getDisplayName() : null, r.getCompanyName(),
                                    u != null ? u.getEmail() : null, r.getId()));
                })
                .toList();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("segments", segments);
        out.put("quarters", quarters);
        out.put("months", months);
        out.put("crManagers", crManagers);
        return out;
    }

    public Map<String, Object> controlTowerFilters() {
        Map<String, Object> base = filterOptions();
        List<Map<String, String>> programs = schools.findAll().stream()
                .sorted(Comparator.comparing(s -> s.getName() == null ? "" : s.getName()))
                .map(s -> Map.of("id", firstNonBlank(s.getCode(), s.getName(), s.getId()), "name", firstNonBlank(s.getName(), s.getId())))
                .toList();
        if (programs.isEmpty()) {
            programs = List.of(
                    Map.of("id", "SOT", "name", "School of Technology"),
                    Map.of("id", "SOM", "name", "School of Management"));
        }
        List<Map<String, String>> cohorts = batches.findAll().stream()
                .map(b -> {
                    String name = firstNonBlank(b.getLabel(), b.getYear(), b.getId());
                    return Map.of("id", name, "name", name);
                })
                .toList();
        List<Map<String, String>> centerOpts = centers.findAll().stream()
                .map(c -> Map.of("id", firstNonBlank(c.getName(), c.getId()), "name", firstNonBlank(c.getName(), c.getId())))
                .toList();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("programs", programs);
        out.put("cohorts", cohorts);
        out.put("centers", centerOpts);
        out.put("quarters", base.get("quarters"));
        out.put("months", base.get("months"));
        out.put("crManagers", base.get("crManagers"));
        out.put("segments", base.get("segments"));
        return out;
    }

    public Map<String, Object> controlTowerAll(Map<String, String> query) {
        Map<String, Object> overview = overview(query);
        Map<String, Object> jobOpportunities = new LinkedHashMap<>();
        jobOpportunities.put("overview", Map.of("row1", overview.get("row1"), "row2", overview.get("row2")));
        jobOpportunities.put("crManagers", crManagers(query));
        jobOpportunities.put("momTable", momTable(query));
        return Map.of(
                "filters", controlTowerFilters(),
                "jobOpportunities", jobOpportunities,
                "students", studentAnalytics(),
                "careerServices", careerServicesAnalytics()
        );
    }

    public Map<String, Object> studentAnalytics() {
        List<Student> all = students.findAll();
        Map<String, User> usersById = users.findAll().stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        long total = all.size();
        long active = all.stream().filter(s -> "ACTIVE".equalsIgnoreCase(statusOf(usersById.get(s.getUserId())))).count();
        long male = all.stream().filter(s -> s.getGender() != null && s.getGender().toUpperCase(Locale.ROOT).startsWith("M")).count();
        long female = all.stream().filter(s -> s.getGender() != null && s.getGender().toUpperCase(Locale.ROOT).startsWith("F")).count();
        long resume = all.stream().filter(s -> s.getResumeUrl() != null && !s.getResumeUrl().isBlank()).count();
        long placed = applications.findAll().stream()
                .map(Application::getStudentId)
                .filter(id -> id != null)
                .distinct()
                .count();
        Map<String, Object> km = new LinkedHashMap<>();
        km.put("totalStudents", total);
        km.put("activeStudents", active);
        km.put("activeRate", total == 0 ? 0 : Math.round(active * 1000.0 / total) / 10.0);
        km.put("invitationsSent", total);
        km.put("invitationsAccepted", active);
        km.put("invitationAcceptanceRate", total == 0 ? 0 : Math.round(active * 1000.0 / total) / 10.0);
        km.put("invitationsNotAccepted", Math.max(0, total - active));
        km.put("maleStudents", male);
        km.put("femaleStudents", female);
        km.put("inactiveStudents", Math.max(0, total - active));
        Map<String, Object> pr = new LinkedHashMap<>();
        pr.put("avgProfileCompletion", 0);
        pr.put("brackets", List.of());
        pr.put("resumeUploaded", resume);
        pr.put("profilePicture", 0);
        pr.put("skillsSection", 0);
        pr.put("profilePictureMetric", 0);
        Map<String, Object> co = new LinkedHashMap<>();
        co.put("totalPlacement", placed);
        co.put("internshipPlaced", 0);
        return Map.of("keyMetrics", km, "profileReadiness", pr, "careerOutcomes", co, "academicOverview", List.of());
    }

    public Map<String, Object> careerServicesAnalytics() {
        long pool = students.count();
        Map<String, Object> km = new LinkedHashMap<>();
        km.put("programPool", pool);
        km.put("etEligible", 0);
        km.put("etAttempted", 0);
        km.put("etCleared", 0);
        km.put("etFailed", 0);
        km.put("etPassRate", 0);
        km.put("placementRate", 0);
        km.put("profileCompletionRate", 0);
        km.put("resumeVerificationRate", 0);
        km.put("mockCompletion", 0);
        km.put("mockAvgScore", 0);
        km.put("mockEligible", 0);
        km.put("tenure0to3", 0);
        km.put("tenure3to6", 0);
        km.put("tenure6plus", 0);
        return Map.of("keyMetrics", km, "funnel", List.of());
    }

    private Snapshot load(Map<String, String> query) {
        Map<String, User> usersById = users.findAll().stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        List<Student> studentList = students.findAll().stream().filter(s -> matchStudent(s, query)).toList();
        Set<String> studentIds = studentList.stream().map(Student::getId).collect(Collectors.toSet());
        List<Job> jobList = jobs.findAll().stream().filter(j -> matchJob(j, query)).toList();
        Set<String> jobIds = jobList.stream().map(Job::getId).collect(Collectors.toSet());
        List<Application> apps = applications.findAll().stream()
                .filter(a -> a.getStudentId() == null || studentIds.contains(a.getStudentId()))
                .filter(a -> a.getJobId() == null || jobIds.contains(a.getJobId()))
                .filter(a -> matchApp(a, query, jobList))
                .toList();
        return new Snapshot(jobList, apps, studentList, usersById);
    }

    private boolean matchStudent(Student s, Map<String, String> q) {
        if (!matchesFilter(q.get("school"), s.getSchool(), s.getSchoolId())) return false;
        if (!matchesFilter(q.get("center"), s.getCenter(), s.getCenterId())) return false;
        if (!matchesFilter(q.get("batch"), s.getBatch(), s.getBatchId())) return false;
        return true;
    }

    private boolean matchJob(Job j, Map<String, String> q) {
        String cr = q.get("crManager");
        if (cr != null && !cr.isBlank() && !cr.equals(j.getRecruiterId()) && !cr.equals(j.getCreatedBy())) {
            return false;
        }
        return true;
    }

    private boolean matchApp(Application a, Map<String, String> q, List<Job> jobList) {
        String segment = q.get("segment");
        if (segment != null && !segment.isBlank()) {
            Job job = jobList.stream().filter(j -> j.getId().equals(a.getJobId())).findFirst().orElse(null);
            String seg = firstNonBlank(a.getSegment(), job != null ? job.getSpecialization() : null, "");
            if (!seg.toLowerCase(Locale.ROOT).contains(segment.toLowerCase(Locale.ROOT))) return false;
        }
        Instant applied = a.getAppliedDate();
        if (applied != null) {
            LocalDate d = LocalDate.ofInstant(applied, ZoneId.systemDefault());
            String month = q.get("month");
            if (month != null && !month.isBlank()) {
                try {
                    if (d.getMonthValue() != Integer.parseInt(month)) return false;
                } catch (NumberFormatException ignored) {
                    return true;
                }
            } else {
                String quarter = q.get("quarter");
                if (quarter != null && !quarter.isBlank()) {
                    int m = d.getMonthValue();
                    String key = upper(quarter).replaceAll("[^Q0-9]", "");
                    int qtr = key.startsWith("Q2") ? 2 : key.startsWith("Q3") ? 3 : key.startsWith("Q4") ? 4 : 1;
                    int appQ = ((m - 1) / 3) + 1;
                    if (appQ != qtr) return false;
                }
            }
        }
        return true;
    }

    private boolean matchesFilter(String raw, String name, String id) {
        if (raw == null || raw.isBlank()) return true;
        Set<String> wanted = Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toSet());
        if (wanted.isEmpty()) return true;
        return wanted.stream().anyMatch(w ->
                (name != null && name.equalsIgnoreCase(w)) || (id != null && id.equalsIgnoreCase(w)));
    }

    private boolean isPosted(Job j) {
        return Boolean.TRUE.equals(j.getIsPosted()) || "POSTED".equalsIgnoreCase(j.getStatus());
    }

    private String deriveJobDriveStatus(Job job) {
        String st = upper(job.getStatus());
        if (job.getArchivedAt() != null || "ARCHIVED".equals(st)) return "CLOSED";
        if ("REJECTED".equals(st)) return "NOT_DELIVERABLE";
        if ("DRAFT".equals(st) || (!Boolean.TRUE.equals(job.getIsPosted()) && !"POSTED".equals(st))) return "YET_TO_START";
        if ("IN_REVIEW".equals(st)) return "HOLD";
        if (Boolean.TRUE.equals(job.getIsPosted()) && Boolean.TRUE.equals(job.getIsActive())) return "ACTIVE";
        if (Boolean.TRUE.equals(job.getIsPosted())) return "IN_PROCESS";
        return "HOLD";
    }

    private Pipeline derivePipeline(Application app) {
        if (app.getPipelineStatus() != null && !app.getPipelineStatus().isBlank()) {
            return new Pipeline(upper(app.getPipelineStatus()),
                    app.getPipelineSubStatus() != null ? upper(app.getPipelineSubStatus()) : null);
        }
        String status = upper(app.getStatus());
        String screening = upper(app.getScreeningStatus());
        String interview = upper(app.getInterviewStatus());
        if (PLACED.contains(status) || PLACED.contains(interview)) {
            return new Pipeline("CLOSED", "CLOSED_WITH_SELECTION");
        }
        if ("REJECTED".equals(status) || "REJECTED".equals(interview)) {
            return new Pipeline("CLOSED", "CLOSED_WITH_REJECTION");
        }
        if ("NO_SHOW".equals(status) || "NO_SHOW".equals(interview)) {
            return new Pipeline("CLOSED", "NO_SHOW");
        }
        if (List.of("REJECTED", "SCREEN_REJECT", "SCREENING_REJECTED", "TEST_REJECTED").contains(screening)) {
            return new Pipeline("CLOSED", "SCREEN_REJECT");
        }
        if (SHORTLIST.contains(status) || "TEST_SELECTED".equals(screening) || "INTERVIEW_ELIGIBLE".equals(screening)) {
            return new Pipeline("IN_PROCESS", "SHORTLISTED");
        }
        if ("WITHDRAWN".equals(status)) {
            return new Pipeline("CLOSED", "CLOSED_WITH_REJECTION");
        }
        if ("APPLIED".equals(status) || status.isEmpty()) {
            return new Pipeline("ACTIVE", "PENDING");
        }
        return new Pipeline("IN_PROCESS", null);
    }

    private String deriveSegment(Job job, Student student) {
        if (job != null && job.getSpecialization() != null && !job.getSpecialization().isBlank()) return job.getSpecialization().trim();
        if (job != null && job.getQualification() != null && !job.getQualification().isBlank()) return job.getQualification().trim();
        if (student != null && student.getSchool() != null && !student.getSchool().isBlank()) return student.getSchool().trim();
        return "General";
    }

    private Map<String, Object> managerCard(String id, String name, String adminStatus, ManagerAgg m) {
        Map<String, Object> card = new LinkedHashMap<>();
        card.put("id", id);
        card.put("name", name);
        card.put("adminStatus", adminStatus);
        card.put("adminStatusLabel", statusLabel(adminStatus));
        card.put("count", m.jdsPunched);
        card.put("breakdown", List.of(
                Map.of("label", "Admin Status", "value", statusLabel(adminStatus), "color", statusColor(adminStatus)),
                item("Companies Onboarded", m.companies.size(), "green"),
                item("Applications Shared", m.applicationsShared, "blue"),
                item("Students Placed", m.studentsPlaced, "green"),
                item("Interviews Scheduled", m.scheduledKeys.size(), "blue"),
                item("Transitions", m.transitions, "green"),
                item("In Process", m.inProcess, "blue"),
                item("Closed Drives", m.closedDrives, "gray"),
                item("Hold", m.hold, "amber"),
                item("Yet to Start", m.yetToStart, "amber")
        ));
        return card;
    }

    private static Map<String, Object> item(String label, Object count, String color) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("label", label);
        m.put("count", count);
        m.put("color", color);
        return m;
    }

    private static String statusLabel(String status) {
        return switch (upper(status)) {
            case "ACTIVE" -> "Active";
            case "PENDING" -> "Pending";
            case "BLOCKED" -> "Blocked";
            case "REJECTED" -> "Rejected";
            case "INACTIVE" -> "Inactive";
            case "" -> "Unknown";
            default -> status == null ? "Unknown" : status;
        };
    }

    private static String statusColor(String status) {
        return switch (upper(status)) {
            case "ACTIVE" -> "green";
            case "PENDING" -> "amber";
            case "BLOCKED", "REJECTED" -> "red";
            default -> "gray";
        };
    }

    private static String statusOf(User u) {
        return u == null ? "" : u.getStatus();
    }

    private static String upper(String s) {
        return s == null ? "" : s.trim().toUpperCase(Locale.ROOT);
    }

    private static String firstNonBlank(String... vals) {
        if (vals == null) return "";
        for (String v : vals) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return "";
    }

    private record Pipeline(String status, String sub) {}

    private record Snapshot(List<Job> jobs, List<Application> apps, List<Student> students, Map<String, User> usersById) {}

    private static final class ManagerAgg {
        final String userId;
        final String recruiterId;
        int jdsPunched;
        final Set<String> companies = new HashSet<>();
        final Set<String> jobs = new HashSet<>();
        int applicationsShared;
        int studentsPlaced;
        final Set<String> scheduledKeys = new HashSet<>();
        int transitions;
        int inProcess;
        int hold;
        int yetToStart;
        int closedDrives;

        ManagerAgg(String userId, String recruiterId) {
            this.userId = userId;
            this.recruiterId = recruiterId;
        }
    }

    private static final class MomAgg {
        final String crManagerId;
        final String crManager;
        final String segment;
        int goal;
        int closedDrives;
        final Set<String> companies = new HashSet<>();
        final Set<String> jobs = new HashSet<>();
        int transitions;
        int yetToStart;
        int hold;
        int inProcess;
        int notApplied;
        int notDeliverable;

        MomAgg(String crManagerId, String crManager, String segment) {
            this.crManagerId = crManagerId;
            this.crManager = crManager;
            this.segment = segment;
        }
    }
}
