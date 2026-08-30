#!/usr/bin/env python3
from pathlib import Path

JAVA = Path(__file__).resolve().parents[1] / "src/main/java/com/pwioi/portal"


def w(rel, content):
    p = JAVA / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content.strip() + "\n")


w("controller/PublicController.java", """
package com.pwioi.portal.controller;
import com.pwioi.portal.service.StudentService;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/public")
public class PublicController {
    private final StudentService students;
    public PublicController(StudentService students) { this.students = students; }
    @GetMapping("/profile/{publicProfileId}")
    public Object profile(@PathVariable String publicProfileId) { return students.publicProfile(publicProfileId); }
}
""")

w("controller/ContactController.java", """
package com.pwioi.portal.controller;
import com.pwioi.portal.service.EmailService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/contact")
public class ContactController {
    private final EmailService email;
    public ContactController(EmailService email) { this.email = email; }
    @PostMapping
    public Map<String, Object> submit(@RequestBody Map<String, String> body) {
        email.send("admissions@pwioi.com", "Contact: " + body.getOrDefault("subject", "Website"),
                body.getOrDefault("name","") + " <" + body.getOrDefault("email","") + ">\\n" + body.getOrDefault("message",""));
        return Map.of("success", true, "message", "Message received");
    }
}
""")

w("service/AcademicService.java", """
package com.pwioi.portal.service;
import com.pwioi.portal.entity.*;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.*;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import java.util.List; import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class AcademicService {
    private final SchoolRepository schools; private final CenterRepository centers; private final BatchRepository batches;
    public AcademicService(SchoolRepository schools, CenterRepository centers, BatchRepository batches) {
        this.schools = schools; this.centers = centers; this.batches = batches;
    }
    public List<School> schools() { return schools.findAll(); }
    public List<Center> centers() { return centers.findAll(); }
    public List<Batch> batches() { return batches.findAll(); }
    @Transactional public School createSchool(Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        School s = new School(); s.setName(String.valueOf(b.get("name"))); s.setCode(b.get("code")==null?null:b.get("code").toString()); s.setStatus("ACTIVE");
        return schools.save(s);
    }
    @Transactional public School updateSchool(String id, Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        School s = schools.findById(id).orElseThrow(() -> ApiException.notFound("School"));
        if (b.get("name")!=null) s.setName(b.get("name").toString());
        if (b.get("status")!=null) s.setStatus(b.get("status").toString());
        return schools.save(s);
    }
    @Transactional public void deleteSchool(String id) { CurrentUser.requireRole(Roles.SUPER_ADMIN); schools.deleteById(id); }
    @Transactional public Center createCenter(Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Center c = new Center(); c.setName(String.valueOf(b.get("name"))); c.setLocation(b.get("location")==null?null:b.get("location").toString()); c.setStatus("ACTIVE");
        return centers.save(c);
    }
    @Transactional public Center updateCenter(String id, Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Center c = centers.findById(id).orElseThrow(() -> ApiException.notFound("Center"));
        if (b.get("name")!=null) c.setName(b.get("name").toString());
        return centers.save(c);
    }
    @Transactional public void deleteCenter(String id) { CurrentUser.requireRole(Roles.SUPER_ADMIN); centers.deleteById(id); }
    @Transactional public Batch createBatch(Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Batch x = new Batch(); x.setYear(String.valueOf(b.get("year"))); x.setLabel(b.get("label")==null?null:b.get("label").toString()); x.setStatus("ACTIVE");
        return batches.save(x);
    }
    @Transactional public Batch updateBatch(String id, Map<String, Object> b) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        Batch x = batches.findById(id).orElseThrow(() -> ApiException.notFound("Batch"));
        if (b.get("year")!=null) x.setYear(b.get("year").toString());
        return batches.save(x);
    }
    @Transactional public void deleteBatch(String id) { CurrentUser.requireRole(Roles.SUPER_ADMIN); batches.deleteById(id); }
}
""")

w("controller/AcademicController.java", """
package com.pwioi.portal.controller;
import com.pwioi.portal.service.AcademicService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/academic")
public class AcademicController {
    private final AcademicService academic;
    public AcademicController(AcademicService academic) { this.academic = academic; }
    @GetMapping("/schools") public Object schools() { return academic.schools(); }
    @PostMapping("/schools") public Object cs(@RequestBody Map<String, Object> b) { return academic.createSchool(b); }
    @PatchMapping("/schools/{id}") public Object us(@PathVariable String id, @RequestBody Map<String, Object> b) { return academic.updateSchool(id, b); }
    @DeleteMapping("/schools/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void ds(@PathVariable String id) { academic.deleteSchool(id); }
    @GetMapping("/centers") public Object centers() { return academic.centers(); }
    @PostMapping("/centers") public Object cc(@RequestBody Map<String, Object> b) { return academic.createCenter(b); }
    @PatchMapping("/centers/{id}") public Object uc(@PathVariable String id, @RequestBody Map<String, Object> b) { return academic.updateCenter(id, b); }
    @DeleteMapping("/centers/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void dc(@PathVariable String id) { academic.deleteCenter(id); }
    @GetMapping("/batches") public Object batches() { return academic.batches(); }
    @PostMapping("/batches") public Object cb(@RequestBody Map<String, Object> b) { return academic.createBatch(b); }
    @PatchMapping("/batches/{id}") public Object ub(@PathVariable String id, @RequestBody Map<String, Object> b) { return academic.updateBatch(id, b); }
    @DeleteMapping("/batches/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void db(@PathVariable String id) { academic.deleteBatch(id); }
}
""")

w("controller/NotificationController.java", """
package com.pwioi.portal.controller;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.NotificationService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;
    public NotificationController(NotificationService notifications) { this.notifications = notifications; }
    @GetMapping public Object list() {
        return notifications.listFor(CurrentUser.require().getId()).stream().map(notifications::payload).toList();
    }
    @PatchMapping("/mark-all-read") public Map<String, Object> allRead() {
        notifications.markAllRead(CurrentUser.require().getId()); return Map.of("success", true);
    }
    @PatchMapping("/{notificationId}/read") public Object read(@PathVariable String notificationId) {
        return notifications.payload(notifications.markRead(CurrentUser.require().getId(), notificationId));
    }
    @DeleteMapping("/{notificationId}") public Map<String, Object> del(@PathVariable String notificationId) {
        notifications.delete(CurrentUser.require().getId(), notificationId); return Map.of("success", true);
    }
    @PostMapping public Object create(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER);
        return notifications.create(String.valueOf(body.get("userId")), String.valueOf(body.get("title")),
                String.valueOf(body.get("body")), Map.of());
    }
}
""")

# Generic remaining feature controller covering all other Node prefixes
w("controller/PortalFeatureController.java", """
package com.pwioi.portal.controller;

import com.pwioi.portal.ai.AiService;
import com.pwioi.portal.entity.*;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.*;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.ApplicationService;
import com.pwioi.portal.service.CloudinaryService;
import com.pwioi.portal.util.Jsons;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/**
 * Remaining Node API surface: queries, admin-requests, recruiters, interviews,
 * calendar, endorsements, placement AI, assessments, mocks, CMS, search, etc.
 */
@RestController
public class PortalFeatureController {
    private final StudentQueryRepository queries;
    private final AdminRequestRepository adminRequests;
    private final RecruiterRepository recruiters;
    private final RecruiterMouDocumentRepository mous;
    private final AnnouncementRepository announcements;
    private final EndorsementRepository endorsements;
    private final EndorsementTokenRepository endorsementTokens;
    private final InterviewSessionRepository interviewSessions;
    private final InterviewRoundRepository rounds;
    private final InterviewSlotRepository slots;
    private final InterviewerInviteRepository invites;
    private final AssessmentRepository assessments;
    private final AssessmentQuestionRepository questions;
    private final AssessmentSessionRepository sessions;
    private final AssessmentAssignmentRepository assignments;
    private final MockInterviewDriveRepository mockDrives;
    private final MockInterviewSlotRepository mockSlots;
    private final AiMockInterviewRepository aiMocks;
    private final AiMockInterviewEnrollmentRepository aiEnrollments;
    private final CmsSectionRepository cms;
    private final SuccessStoryRepository stories;
    private final SearchIndexMetaRepository search;
    private final UserRepository users;
    private final AdminRepository admins;
    private final ApplicationRepository applications;
    private final JobRepository jobs;
    private final AuditLogRepository auditLogs;
    private final InterviewPrepSessionRepository prepSessions;
    private final ApplicationService applicationService;
    private final AiService ai;
    private final Jsons jsons;
    private final CloudinaryService cloudinary;

    public PortalFeatureController(
            StudentQueryRepository queries, AdminRequestRepository adminRequests, RecruiterRepository recruiters,
            RecruiterMouDocumentRepository mous, AnnouncementRepository announcements,
            EndorsementRepository endorsements, EndorsementTokenRepository endorsementTokens,
            InterviewSessionRepository interviewSessions, InterviewRoundRepository rounds,
            InterviewSlotRepository slots, InterviewerInviteRepository invites,
            AssessmentRepository assessments, AssessmentQuestionRepository questions,
            AssessmentSessionRepository sessions, AssessmentAssignmentRepository assignments,
            MockInterviewDriveRepository mockDrives, MockInterviewSlotRepository mockSlots,
            AiMockInterviewRepository aiMocks, AiMockInterviewEnrollmentRepository aiEnrollments,
            CmsSectionRepository cms, SuccessStoryRepository stories, SearchIndexMetaRepository search,
            UserRepository users, AdminRepository admins, ApplicationRepository applications, JobRepository jobs,
            AuditLogRepository auditLogs, InterviewPrepSessionRepository prepSessions,
            ApplicationService applicationService, AiService ai, Jsons jsons, CloudinaryService cloudinary) {
        this.queries = queries; this.adminRequests = adminRequests; this.recruiters = recruiters;
        this.mous = mous; this.announcements = announcements; this.endorsements = endorsements;
        this.endorsementTokens = endorsementTokens; this.interviewSessions = interviewSessions;
        this.rounds = rounds; this.slots = slots; this.invites = invites; this.assessments = assessments;
        this.questions = questions; this.sessions = sessions; this.assignments = assignments;
        this.mockDrives = mockDrives; this.mockSlots = mockSlots; this.aiMocks = aiMocks;
        this.aiEnrollments = aiEnrollments; this.cms = cms; this.stories = stories; this.search = search;
        this.users = users; this.admins = admins; this.applications = applications; this.jobs = jobs;
        this.auditLogs = auditLogs; this.prepSessions = prepSessions; this.applicationService = applicationService;
        this.ai = ai; this.jsons = jsons; this.cloudinary = cloudinary;
    }

    // ----- queries -----
    @PostMapping("/api/queries")
    public Object createQuery(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT, Roles.RECRUITER);
        StudentQuery q = new StudentQuery();
        q.setStudentId(CurrentUser.require().getId());
        q.setType(String.valueOf(body.getOrDefault("type", "question")));
        q.setSubject(String.valueOf(body.get("subject")));
        q.setMessage(String.valueOf(body.get("message")));
        q.setStatus("OPEN");
        return queries.save(q);
    }
    @GetMapping("/api/queries")
    public Object myQueries() {
        CurrentUser.requireRole(Roles.STUDENT, Roles.RECRUITER);
        return queries.findByStudentId(CurrentUser.require().getId());
    }
    @GetMapping("/api/queries/admin")
    public Object allQueries() { CurrentUser.requireRole(Roles.ADMIN); return queries.findAll(); }
    @PatchMapping("/api/queries/{queryId}/respond")
    public Object respondQuery(@PathVariable String queryId, @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        StudentQuery q = queries.findById(queryId).orElseThrow(() -> ApiException.notFound("Query"));
        q.setResponse(String.valueOf(body.get("response")));
        q.setStatus("RESOLVED");
        q.setRespondedBy(CurrentUser.require().getId());
        q.setRespondedAt(Instant.now());
        return queries.save(q);
    }

    // ----- admin requests -----
    @PostMapping("/api/admin-requests")
    public Object createAdminRequest(@RequestBody Map<String, Object> body) {
        AdminRequest r = new AdminRequest();
        r.setUserId(CurrentUser.require().getId());
        r.setEmail(CurrentUser.require().getUsername());
        r.setReason(body.get("reason")==null?null:body.get("reason").toString());
        r.setStatus("PENDING");
        r.setRequestedAt(Instant.now());
        return adminRequests.save(r);
    }
    @GetMapping("/api/admin-requests")
    public Object allAdminRequests() { CurrentUser.requireRole(Roles.ADMIN); return adminRequests.findAll(); }
    @GetMapping("/api/admin-requests/pending")
    public Object pendingAdminRequests() {
        CurrentUser.requireRole(Roles.ADMIN);
        return adminRequests.findAll().stream().filter(r -> "PENDING".equals(r.getStatus())).toList();
    }
    @PatchMapping("/api/admin-requests/{requestId}/approve")
    public Object approveAdmin(@PathVariable String requestId) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        AdminRequest r = adminRequests.findById(requestId).orElseThrow(() -> ApiException.notFound("Request"));
        r.setStatus("APPROVED"); r.setApprovedAt(Instant.now()); r.setApprovedBy(CurrentUser.require().getId());
        User u = users.findById(r.getUserId()).orElseThrow();
        u.setRole(Roles.ADMIN); u.setStatus("ACTIVE"); users.save(u);
        if (admins.findByUserId(u.getId()).isEmpty()) {
            Admin a = new Admin(); a.setUserId(u.getId()); a.setName(u.getDisplayName()); a.setRole(Roles.ADMIN);
            admins.save(a);
        }
        return adminRequests.save(r);
    }
    @PatchMapping("/api/admin-requests/{requestId}/reject")
    public Object rejectAdmin(@PathVariable String requestId) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        AdminRequest r = adminRequests.findById(requestId).orElseThrow(() -> ApiException.notFound("Request"));
        r.setStatus("REJECTED"); r.setRejectedAt(Instant.now()); r.setRejectedBy(CurrentUser.require().getId());
        return adminRequests.save(r);
    }

    // ----- recruiters -----
    @GetMapping("/api/recruiters/directory")
    public Object recruiterDir() { CurrentUser.requireRole(Roles.ADMIN); return recruiters.findAll(); }
    @GetMapping("/api/recruiters/dashboard-stats")
    public Object recStats() {
        CurrentUser.requireRole(Roles.RECRUITER);
        String rid = CurrentUser.require().getRecruiterId();
        long jobCount = rid == null ? 0 : jobs.findByRecruiterId(rid).size();
        return Map.of("jobs", jobCount);
    }
    @GetMapping("/api/recruiters/mou")
    public Object listMou() { CurrentUser.requireRole(Roles.RECRUITER, Roles.ADMIN); return mous.findAll(); }
    @PostMapping("/api/recruiters/mou")
    public Object uploadMou(@RequestParam("file") MultipartFile file) {
        CurrentUser.requireRole(Roles.RECRUITER, Roles.ADMIN);
        Map<String, Object> up = cloudinary.upload(file, "mou", "raw");
        RecruiterMouDocument d = new RecruiterMouDocument();
        d.setRecruiterId(CurrentUser.require().getRecruiterId());
        d.setFileUrl(String.valueOf(up.get("secure_url")));
        d.setPublicId(String.valueOf(up.get("public_id")));
        d.setFileName(file.getOriginalFilename());
        return mous.save(d);
    }

    // ----- announcements -----
    @GetMapping("/api/announcements")
    public Object listAnn() { CurrentUser.requireRole(Roles.ADMIN); return announcements.findAll(); }
    @PostMapping("/api/announcements")
    public Object createAnn(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        Announcement a = new Announcement();
        a.setTitle(String.valueOf(body.get("title")));
        a.setDescription(String.valueOf(body.get("description")));
        a.setCreatedBy(CurrentUser.require().getId());
        return announcements.save(a);
    }

    // ----- endorsements -----
    @GetMapping("/api/endorsements/student")
    public Object myEndorsements() {
        CurrentUser.requireRole(Roles.STUDENT);
        return endorsements.findByStudentId(CurrentUser.require().getStudentId());
    }
    @PostMapping("/api/endorsements/request")
    public Object requestEndorsement(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        EndorsementToken t = new EndorsementToken();
        t.setStudentId(CurrentUser.require().getStudentId());
        t.setEmail(String.valueOf(body.get("email")));
        t.setToken(UUID.randomUUID().toString());
        t.setExpiresAt(Instant.now().plusSeconds(86400 * 14));
        t.setUsed(false);
        t.setTeacherName(body.get("teacherName")==null?null:body.get("teacherName").toString());
        return endorsementTokens.save(t);
    }
    @GetMapping("/api/endorsements/{token}")
    public Object getByToken(@PathVariable String token) {
        return endorsementTokens.findByToken(token).orElseThrow(() -> ApiException.notFound("Token"));
    }
    @PostMapping("/api/endorsements/submit/{token}")
    public Object submitEndorsement(@PathVariable String token, @RequestBody Map<String, Object> body) {
        EndorsementToken t = endorsementTokens.findByToken(token).orElseThrow(() -> ApiException.notFound("Token"));
        if (Boolean.TRUE.equals(t.getUsed()) || t.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("Token expired or used");
        }
        Endorsement e = new Endorsement();
        e.setStudentId(t.getStudentId()); e.setTokenId(t.getId());
        e.setEndorserName(String.valueOf(body.get("endorserName")));
        e.setEndorserEmail(String.valueOf(body.get("endorserEmail")));
        e.setEndorserRole(String.valueOf(body.get("endorserRole")));
        e.setOrganization(String.valueOf(body.getOrDefault("organization", "")));
        e.setRelationship(String.valueOf(body.getOrDefault("relationship", "")));
        e.setMessage(String.valueOf(body.get("message")));
        e.setSkills(body.get("skills")==null?"[]":jsons.toJson(body.get("skills")));
        e.setConsent(Boolean.TRUE.equals(body.get("consent")));
        t.setUsed(true); t.setUsedAt(Instant.now());
        endorsementTokens.save(t);
        return endorsements.save(e);
    }

    // ----- interviews (scheduling) -----
    @GetMapping({"/api/admin/interview-scheduling/session/{jobId}", "/api/interview-sessions/session/{jobId}", "/api/admin/interview-scheduling/{jobId}"})
    public Object getSession(@PathVariable String jobId) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER);
        return interviewSessions.findByJobId(jobId).orElseGet(() -> {
            InterviewSession s = new InterviewSession();
            s.setJobId(jobId); s.setStatus("NOT_STARTED"); s.setCreatedBy(CurrentUser.require().getId());
            return interviewSessions.save(s);
        });
    }
    @PostMapping({"/api/admin/interview-scheduling/session", "/api/interview-sessions/session"})
    public Object createSession(@RequestBody Map<String, Object> body) {
        return getSession(String.valueOf(body.get("jobId")));
    }
    @RequestMapping(path="/api/admin/interview", method={RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE})
    public Object deprecatedInterview() {
        throw new ApiException(HttpStatus.GONE, "Use /api/admin/interview-scheduling");
    }

    // ----- placement AI -----
    @PostMapping("/api/placement/ai")
    public Object placementAi(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        String prompt = "Placement guidance for a student. Profile/question: " + jsons.toJson(body);
        return Map.of("success", true, "guidance", ai.generate(prompt));
    }
    @GetMapping("/api/placement/question-bank")
    public Object qbank() { CurrentUser.requireRole(Roles.STUDENT); return Map.of("questions", List.of()); }
    @GetMapping("/api/placement/question-bank/meta")
    public Object qmeta() { CurrentUser.requireRole(Roles.STUDENT); return Map.of("topics", List.of("DSA","HR","System Design")); }
    @PostMapping("/api/placement/question-bank/generate")
    public Object qgen(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        return Map.of("questions", ai.generateJson("Generate 5 interview questions as JSON array for: " + jsons.toJson(body)));
    }
    @GetMapping("/api/placement/interview-prep/meta")
    public Object prepMeta() { CurrentUser.requireRole(Roles.STUDENT); return Map.of("types", List.of("HR","TECHNICAL","BEHAVIORAL")); }
    @PostMapping("/api/placement/interview-prep/sessions")
    public Object startPrep(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        InterviewPrepSession s = new InterviewPrepSession();
        s.setStudentId(CurrentUser.require().getStudentId());
        s.setRole(String.valueOf(body.getOrDefault("role", "SDE")));
        s.setDifficulty(String.valueOf(body.getOrDefault("difficulty", "MEDIUM")));
        s.setInterviewType(String.valueOf(body.getOrDefault("interviewType", "MIXED")));
        s.setStatus("IN_PROGRESS");
        return prepSessions.save(s);
    }
    @GetMapping("/api/placement/interview-prep/sessions")
    public Object prepSessions() {
        CurrentUser.requireRole(Roles.STUDENT);
        return prepSessions.findByStudentId(CurrentUser.require().getStudentId());
    }
    @PostMapping("/api/placement/interview-prep/analyze")
    public Object prepAnalyze(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        return Map.of("analysis", ai.generateJson("Analyze interview readiness: " + jsons.toJson(body)));
    }

    // ----- assessments -----
    @GetMapping("/api/assessments/all")
    public Object allAssessments() { CurrentUser.requireRole(Roles.ADMIN); return assessments.findAll(); }
    @PostMapping("/api/assessments/create")
    public Object createAssessment(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        Assessment a = new Assessment();
        a.setTitle(String.valueOf(body.get("title")));
        a.setDescription(body.get("description")==null?null:body.get("description").toString());
        a.setType(String.valueOf(body.getOrDefault("type", "MIXED")));
        a.setDifficulty(String.valueOf(body.getOrDefault("difficulty", "MEDIUM")));
        a.setDuration(body.get("duration") instanceof Number n ? n.intValue() : 60);
        a.setStatus("DRAFT"); a.setConfig("{}");
        return assessments.save(a);
    }
    @GetMapping("/api/assessments/details/{id}")
    public Object assessmentDetails(@PathVariable String id) {
        Assessment a = assessments.findById(id).orElseThrow(() -> ApiException.notFound("Assessment"));
        Map<String, Object> m = new LinkedHashMap<>(jsons.toMap(a));
        m.put("questions", questions.findByAssessmentId(id));
        return m;
    }
    @GetMapping("/api/assessments/my-assignments")
    public Object myAssessments() {
        CurrentUser.requireRole(Roles.STUDENT);
        String sid = CurrentUser.require().getStudentId();
        return assignments.findByStudentId(sid);
    }
    @PostMapping("/api/assessments/session/start/{assessmentId}")
    public Object startSession(@PathVariable String assessmentId) {
        CurrentUser.requireRole(Roles.STUDENT);
        String sid = CurrentUser.require().getStudentId();
        return sessions.findByAssessmentIdAndStudentId(assessmentId, sid).orElseGet(() -> {
            AssessmentSession s = new AssessmentSession();
            s.setAssessmentId(assessmentId); s.setStudentId(sid); s.setStatus("IN_PROGRESS");
            s.setStartTime(Instant.now()); s.setRiskLevel("LOW");
            return sessions.save(s);
        });
    }
    @PostMapping("/api/assessments/session/complete/{sessionId}")
    public Object completeSession(@PathVariable String sessionId, @RequestBody(required=false) Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        AssessmentSession s = sessions.findById(sessionId).orElseThrow(() -> ApiException.notFound("Session"));
        s.setStatus("SUBMITTED"); s.setEndTime(Instant.now());
        if (body != null && body.get("responses") != null) s.setResponses(jsons.toJson(body.get("responses")));
        return sessions.save(s);
    }
    @PostMapping("/api/assessments/{id}/publish")
    public Object publishAssessment(@PathVariable String id) {
        CurrentUser.requireRole(Roles.ADMIN);
        Assessment a = assessments.findById(id).orElseThrow(() -> ApiException.notFound("Assessment"));
        a.setStatus("PUBLISHED"); return assessments.save(a);
    }
    @DeleteMapping("/api/assessments/{id}")
    public Map<String, Object> deleteAssessment(@PathVariable String id) {
        CurrentUser.requireRole(Roles.ADMIN); assessments.deleteById(id); return Map.of("success", true);
    }

    // ----- mock interviews -----
    @GetMapping("/api/mock-interviews/all")
    public Object mockAll() { CurrentUser.requireRole(Roles.ADMIN); return mockDrives.findAll(); }
    @PostMapping("/api/mock-interviews/create")
    public Object mockCreate(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        MockInterviewDrive d = new MockInterviewDrive();
        d.setTitle(String.valueOf(body.get("title")));
        d.setCategory(String.valueOf(body.getOrDefault("category", "TECHNICAL")));
        d.setDate(Instant.now()); d.setStartTime(Instant.now()); d.setEndTime(Instant.now().plusSeconds(3600));
        d.setSlotDuration(body.get("slotDuration") instanceof Number n ? n.intValue() : 15);
        d.setStatus("DRAFT");
        return mockDrives.save(d);
    }
    @GetMapping("/api/mock-interviews/my-sessions")
    public Object myMocks() {
        CurrentUser.requireRole(Roles.STUDENT);
        return mockSlots.findByStudentId(CurrentUser.require().getStudentId());
    }
    @GetMapping("/api/mock-interviews/slot/{slotId}")
    public Object mockSlot(@PathVariable String slotId) {
        return mockSlots.findById(slotId).orElseThrow(() -> ApiException.notFound("Slot"));
    }

    // ----- AI mock interviews -----
    @GetMapping("/api/ai-mock-interviews")
    public Object aiMockList() { CurrentUser.requireRole(Roles.ADMIN); return aiMocks.findAll(); }
    @PostMapping("/api/ai-mock-interviews")
    public Object aiMockCreate(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        AiMockInterview a = new AiMockInterview();
        a.setTitle(String.valueOf(body.get("title")));
        a.setInterviewType(String.valueOf(body.getOrDefault("interviewType", "MIXED")));
        a.setSessionMode(String.valueOf(body.getOrDefault("sessionMode", "GUIDED")));
        a.setStartDate(Instant.now()); a.setEndDate(Instant.now().plusSeconds(86400 * 14));
        a.setStatus("DRAFT");
        return aiMocks.save(a);
    }
    @GetMapping("/api/ai-mock-interviews/my-interviews")
    public Object myAiMocks() {
        CurrentUser.requireRole(Roles.STUDENT);
        return aiEnrollments.findByStudentId(CurrentUser.require().getStudentId());
    }

    // ----- CMS / stories / search -----
    @GetMapping("/api/cms/public/landing")
    public Object cmsPublic() {
        return cms.findAll().stream().filter(s -> "PUBLISHED".equals(s.getStatus()) && "landing".equals(s.getPageSlug())).toList();
    }
    @GetMapping("/api/cms/sections")
    public Object cmsSections() { CurrentUser.requireRole(Roles.ADMIN); return cms.findAll(); }
    @PostMapping("/api/cms/sections")
    public Object cmsUpsert(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        CmsSection s = new CmsSection();
        s.setSectionKey(String.valueOf(body.get("sectionKey")));
        s.setTitle(body.get("title")==null?null:body.get("title").toString());
        s.setBody(body.get("body")==null?null:body.get("body").toString());
        s.setStatus(String.valueOf(body.getOrDefault("status", "DRAFT")));
        s.setMeta("{}");
        return cms.save(s);
    }
    @GetMapping("/api/success-stories/public")
    public Object storiesPublic() {
        return stories.findAll().stream().filter(s -> "PUBLISHED".equals(s.getStatus())).toList();
    }
    @GetMapping("/api/success-stories")
    public Object storiesAdmin() { CurrentUser.requireRole(Roles.ADMIN); return stories.findAll(); }
    @PostMapping("/api/success-stories")
    public Object createStory(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        SuccessStory s = new SuccessStory();
        s.setType(String.valueOf(body.getOrDefault("type", "STUDENT_SUCCESS")));
        s.setTitle(String.valueOf(body.get("title")));
        s.setDescription(body.get("description")==null?null:body.get("description").toString());
        s.setStatus("DRAFT"); s.setImages("[]"); s.setTags("[]");
        return stories.save(s);
    }
    @GetMapping("/api/search")
    public Object search(@RequestParam(required=false) String q) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER);
        if (q == null || q.isBlank()) return List.of();
        String needle = q.toLowerCase();
        return search.findAll().stream().filter(s -> s.getKeywords() != null && s.getKeywords().toLowerCase().contains(needle)).toList();
    }
    @GetMapping("/api/search/meta")
    public Object searchMeta() { CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER); return Map.of("ready", true); }

    // ----- admin dashboards -----
    @GetMapping("/api/admin/dashboard")
    public Object dashboard() {
        CurrentUser.requireRole(Roles.ADMIN);
        return Map.of(
                "students", users.findByRole(Roles.STUDENT).size(),
                "recruiters", users.findByRole(Roles.RECRUITER).size(),
                "jobs", jobs.count(),
                "applications", applications.count()
        );
    }
    @GetMapping("/api/admin/jobs/{jobId}/applications")
    public Object adminApps(@PathVariable String jobId) { return applicationService.byJob(jobId); }
    @GetMapping("/api/admin/audit-logs")
    public Object audit() { CurrentUser.requireRole(Roles.SUPER_ADMIN); return auditLogs.findAll(); }
    @GetMapping("/api/admin/placements")
    public Object placements() {
        CurrentUser.requireRole(Roles.ADMIN);
        return applications.findAll().stream().filter(a -> a.getStatus() != null && a.getStatus().contains("OFFER")).toList();
    }

    // ----- super admin -----
    @GetMapping("/api/super-admin/admins")
    public Object listAdmins() { CurrentUser.requireRole(Roles.SUPER_ADMIN); return users.findByRole(Roles.ADMIN); }
    @PostMapping("/api/super-admin/admins")
    public Object createAdmin(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        User u = new User();
        u.setEmail(String.valueOf(body.get("email")).toLowerCase());
        u.setPasswordHash(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(10).encode(String.valueOf(body.getOrDefault("password", "ChangeMe123!"))));
        u.setRole(Roles.ADMIN); u.setStatus("ACTIVE"); u.setSessionVersion(0);
        u = users.save(u);
        Admin a = new Admin(); a.setUserId(u.getId()); a.setName(body.get("name")==null?u.getEmail():body.get("name").toString());
        a.setRole(Roles.ADMIN); admins.save(a);
        return u;
    }
    @GetMapping("/api/super-admin/stats")
    public Object saStats() {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return Map.of("users", users.count(), "jobs", jobs.count(), "applications", applications.count());
    }
    @GetMapping("/api/super-admin/analytics/overview")
    public Object analytics() { return saStats(); }

    @GetMapping("/api/webrtc/turn-ice-servers")
    public Object turn() {
        CurrentUser.require();
        return Map.of("iceServers", List.of(Map.of("urls", "stun:stun.l.google.com:19302")));
    }
}
""")

print("wrote remaining domain files")
