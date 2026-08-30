package com.pwioi.portal.service;

import com.pwioi.portal.entity.Application;
import com.pwioi.portal.entity.InterviewSession;
import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.entity.StudentQuery;
import com.pwioi.portal.entity.User;
import com.pwioi.portal.repository.ApplicationRepository;
import com.pwioi.portal.repository.CompanyRepository;
import com.pwioi.portal.repository.InterviewSessionRepository;
import com.pwioi.portal.repository.JobRepository;
import com.pwioi.portal.repository.StudentQueryRepository;
import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AdminDashboardService {
    private static final List<String> PLACED = List.of("SELECTED", "ACCEPTED", "OFFERED");
    private static final List<String> SHORTLIST = List.of("SHORTLISTED", "INTERVIEWED", "SELECTED", "ACCEPTED", "OFFERED");
    private static final List<String> SCREENING_QUALIFIED =
            List.of("TEST_SELECTED", "INTERVIEW_ELIGIBLE", "SCREENING_SELECTED", "SHORTLISTED");
    private static final List<String> INTERVIEWED =
            List.of("INTERVIEWED", "SELECTED", "ACCEPTED", "OFFERED");
    private static final List<String> PENDING_QUERY = List.of("OPEN", "PENDING", "UNRESOLVED");

    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final StudentRepository students;
    private final UserRepository users;
    private final CompanyRepository companies;
    private final StudentQueryRepository queries;
    private final InterviewSessionRepository sessions;

    public AdminDashboardService(
            JobRepository jobs,
            ApplicationRepository applications,
            StudentRepository students,
            UserRepository users,
            CompanyRepository companies,
            StudentQueryRepository queries,
            InterviewSessionRepository sessions) {
        this.jobs = jobs;
        this.applications = applications;
        this.students = students;
        this.users = users;
        this.companies = companies;
        this.queries = queries;
        this.sessions = sessions;
    }

    public Map<String, Object> dashboard(Map<String, String> query) {
        Map<String, User> usersById = users.findAll().stream().collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        List<Student> scopedStudents = students.findAll().stream()
                .filter(s -> matchStudent(s, query))
                .toList();
        Set<String> studentIds = scopedStudents.stream().map(Student::getId).collect(Collectors.toSet());
        List<Application> apps = applications.findAll().stream()
                .filter(a -> a.getStudentId() == null || studentIds.contains(a.getStudentId()))
                .toList();
        List<Job> allJobs = jobs.findAll();
        long posted = allJobs.stream().filter(this::isPosted).count();
        long activeStudents = scopedStudents.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(statusOf(usersById.get(s.getUserId()))))
                .count();
        long blocked = scopedStudents.stream()
                .filter(s -> "BLOCKED".equalsIgnoreCase(statusOf(usersById.get(s.getUserId()))))
                .count();
        long pending = scopedStudents.stream()
                .filter(s -> "PENDING".equalsIgnoreCase(statusOf(usersById.get(s.getUserId()))))
                .count();
        long rejected = scopedStudents.stream()
                .filter(s -> "REJECTED".equalsIgnoreCase(statusOf(usersById.get(s.getUserId()))))
                .count();
        long pendingQueries = queries.findAll().stream()
                .filter(q -> PENDING_QUERY.contains(upper(q.getStatus())))
                .count();
        Set<String> placedIds = apps.stream()
                .filter(a -> PLACED.contains(upper(a.getStatus())) || PLACED.contains(upper(a.getInterviewStatus())))
                .map(Application::getStudentId)
                .collect(Collectors.toSet());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalJobsPosted", posted);
        stats.put("activeRecruiters", companies.count());
        stats.put("activeStudents", activeStudents);
        stats.put("totalStudents", scopedStudents.size());
        stats.put("blockedStudents", blocked);
        stats.put("pendingStudents", pending);
        stats.put("rejectedStudents", rejected);
        stats.put("pendingQueries", pendingQueries);
        stats.put("totalApplications", apps.size());
        stats.put("placedStudents", placedIds.size());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stats", stats);
        out.put("myStats", funnel(scopedStudents, apps, usersById));
        out.put("activeDrives", activeDrives(allJobs, apps));
        out.put("chartData", emptyCharts());
        return out;
    }

    private Map<String, Object> funnel(List<Student> scoped, List<Application> apps, Map<String, User> usersById) {
        long eligible = scoped.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(statusOf(usersById.get(s.getUserId()))))
                .count();
        Map<String, Student> byId = scoped.stream().collect(Collectors.toMap(Student::getId, s -> s, (a, b) -> a));
        Map<String, boolean[]> stagesByStudent = new HashMap<>();
        Map<String, Set<String>> schoolApplied = new HashMap<>();
        for (Application app : apps) {
            boolean[] flags = stageFlags(app);
            boolean[] cur = stagesByStudent.computeIfAbsent(app.getStudentId(), k -> new boolean[5]);
            for (int i = 0; i < 5; i++) cur[i] = cur[i] || flags[i];
            Student st = byId.get(app.getStudentId());
            String school = st != null && st.getSchool() != null ? st.getSchool() : "Unknown";
            if (flags[0]) schoolApplied.computeIfAbsent(school, k -> new HashSet<>()).add(app.getStudentId());
        }
        int applied = 0, shortlisted = 0, interviewed = 0, offered = 0, joined = 0;
        for (boolean[] f : stagesByStudent.values()) {
            if (f[0]) applied++;
            if (f[1]) shortlisted++;
            if (f[2]) interviewed++;
            if (f[3]) offered++;
            if (f[4]) joined++;
        }
        List<Map<String, Object>> stages = List.of(
                stage("applied", "Applied", applied, eligible, eligible),
                stage("shortlisted", "Shortlisted", shortlisted, eligible, applied),
                stage("interviewed", "Interviewed", interviewed, eligible, shortlisted),
                stage("offered", "Offered", offered, eligible, interviewed),
                stage("joined", "Joined", joined, eligible, offered)
        );
        return Map.of("eligible", eligible, "stages", stages);
    }

    private List<Map<String, Object>> activeDrives(List<Job> allJobs, List<Application> apps) {
        Map<String, List<Application>> byJob = apps.stream()
                .filter(a -> a.getJobId() != null)
                .collect(Collectors.groupingBy(Application::getJobId));
        Map<String, InterviewSession> sessionByJob = sessions.findAll().stream()
                .filter(s -> s.getJobId() != null)
                .collect(Collectors.toMap(InterviewSession::getJobId, s -> s, (a, b) -> a));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Job job : allJobs) {
            if (!Boolean.TRUE.equals(job.getIsPosted()) || !Boolean.TRUE.equals(job.getIsActive()) || job.getArchivedAt() != null) {
                continue;
            }
            String driveStatus = deriveJobDriveStatus(job);
            if (!List.of("ACTIVE", "IN_PROCESS", "HOLD").contains(driveStatus)) continue;
            List<Application> jobApps = byJob.getOrDefault(job.getId(), List.of());
            long shortlisted = jobApps.stream().filter(this::isShortlisted).count();
            Instant interviewDate = jobApps.stream()
                    .map(Application::getInterviewDate)
                    .filter(d -> d != null)
                    .min(Instant::compareTo)
                    .orElse(null);
            InterviewSession sess = sessionByJob.get(job.getId());
            if (sess != null && sess.getStartedAt() != null) interviewDate = sess.getStartedAt();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", job.getId());
            row.put("company", job.getCompanyName() != null ? job.getCompanyName() : "—");
            row.put("role", job.getJobTitle() != null ? job.getJobTitle() : "—");
            row.put("applications", jobApps.size());
            row.put("shortlisted", shortlisted);
            row.put("interviewDate", interviewDate);
            row.put("status", driveStatus);
            rows.add(row);
            if (rows.size() >= 50) break;
        }
        return rows;
    }

    private Map<String, Object> emptyCharts() {
        Map<String, Object> emptyXy = Map.of("labels", List.of(), "values", List.of());
        Map<String, Object> school = Map.of("performance", emptyXy, "applications", emptyXy);
        Map<String, Object> charts = new LinkedHashMap<>();
        charts.put("placementTrend", Map.of("labels", List.of(), "datasets", List.of()));
        charts.put("recruiterActivity", null);
        charts.put("queryVolume", List.of());
        charts.put("schoolPerformance", Map.of("SOT", school, "SOM", school, "SOH", school));
        return charts;
    }

    private boolean[] stageFlags(Application app) {
        String status = upper(app.getStatus());
        String screening = upper(app.getScreeningStatus());
        String interview = upper(app.getInterviewStatus());
        boolean applied = true;
        boolean shortlisted = SCREENING_QUALIFIED.contains(screening)
                || SHORTLIST.contains(status)
                || SHORTLIST.contains(interview);
        boolean interviewed = (app.getLastRoundReached() != null && app.getLastRoundReached() > 0)
                || "INTERVIEWED".equals(status)
                || interview.startsWith("REJECTED_IN_ROUND_")
                || INTERVIEWED.contains(interview)
                || INTERVIEWED.contains(status);
        boolean offered = PLACED.contains(status) || PLACED.contains(interview) || "OFFERED".equals(status);
        boolean joined = "JOINED".equals(status);
        return new boolean[] {applied, shortlisted, interviewed, offered, joined};
    }

    private boolean isShortlisted(Application app) {
        String status = upper(app.getStatus());
        String screening = upper(app.getScreeningStatus());
        String interview = upper(app.getInterviewStatus());
        return SHORTLIST.contains(status) || SHORTLIST.contains(interview) || "TEST_SELECTED".equals(screening)
                || "INTERVIEW_ELIGIBLE".equals(screening);
    }

    private Map<String, Object> stage(String key, String label, int count, long eligible, long previous) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key", key);
        m.put("label", label);
        m.put("count", count);
        m.put("pctOfEligible", eligible > 0 ? Math.round(count * 1000.0 / eligible) / 10.0 : 0);
        m.put("drop", Math.max(0, previous - count));
        m.put("breakdown", Map.of("schools", List.of(), "centers", List.of(), "batches", List.of()));
        return m;
    }

    private boolean matchStudent(Student s, Map<String, String> q) {
        if (q == null) return true;
        if (!matches(q.get("school"), s.getSchool(), s.getSchoolId())) return false;
        if (!matches(q.get("center"), s.getCenter(), s.getCenterId())) return false;
        if (!matches(q.get("batch"), s.getBatch(), s.getBatchId())) return false;
        return true;
    }

    private boolean matches(String raw, String name, String id) {
        if (raw == null || raw.isBlank()) return true;
        return Arrays.stream(raw.split(",")).map(String::trim).anyMatch(w ->
                w.equalsIgnoreCase(name) || w.equalsIgnoreCase(id));
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

    private static String statusOf(User u) {
        return u == null || u.getStatus() == null ? "" : u.getStatus();
    }

    private static String upper(String s) {
        return s == null ? "" : s.trim().toUpperCase(Locale.ROOT);
    }
}
