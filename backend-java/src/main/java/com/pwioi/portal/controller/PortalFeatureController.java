package com.pwioi.portal.controller;

import com.pwioi.portal.ai.AiService;
import com.pwioi.portal.entity.*;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.*;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.AdminDashboardService;
import com.pwioi.portal.service.ApplicationService;
import com.pwioi.portal.service.CloudinaryService;
import com.pwioi.portal.service.EmailService;
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
    private final AdminDashboardService dashboard;
    private final AiService ai;
    private final Jsons jsons;
    private final CloudinaryService cloudinary;
    private final EmailService email;
    private final StudentRepository studentsRepo;

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
            ApplicationService applicationService, AdminDashboardService dashboard,
            AiService ai, Jsons jsons, CloudinaryService cloudinary,
            EmailService email, StudentRepository studentsRepo) {
        this.queries = queries; this.adminRequests = adminRequests; this.recruiters = recruiters;
        this.mous = mous; this.announcements = announcements; this.endorsements = endorsements;
        this.endorsementTokens = endorsementTokens; this.interviewSessions = interviewSessions;
        this.rounds = rounds; this.slots = slots; this.invites = invites; this.assessments = assessments;
        this.questions = questions; this.sessions = sessions; this.assignments = assignments;
        this.mockDrives = mockDrives; this.mockSlots = mockSlots; this.aiMocks = aiMocks;
        this.aiEnrollments = aiEnrollments; this.cms = cms; this.stories = stories; this.search = search;
        this.users = users; this.admins = admins; this.applications = applications; this.jobs = jobs;
        this.auditLogs = auditLogs; this.prepSessions = prepSessions; this.applicationService = applicationService;
        this.dashboard = dashboard; this.ai = ai; this.jsons = jsons; this.cloudinary = cloudinary;
        this.email = email; this.studentsRepo = studentsRepo;
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
        StudentQuery saved = queries.save(q);
        String recipientEmail = null;
        String recipientName = "Student";
        if (q.getStudentId() != null) {
            var user = users.findById(q.getStudentId());
            if (user.isPresent()) {
                recipientEmail = user.get().getEmail();
                recipientName = user.get().getDisplayName() == null ? recipientEmail : user.get().getDisplayName();
            } else {
                var student = studentsRepo.findById(q.getStudentId()).or(() -> studentsRepo.findByUserId(q.getStudentId()));
                if (student.isPresent()) {
                    recipientEmail = student.get().getEmail();
                    recipientName = student.get().getFullName() == null ? recipientEmail : student.get().getFullName();
                }
            }
        }
        if (recipientEmail != null) {
            email.sendStudentQueryResponse(recipientEmail, recipientName, saved.getSubject(), saved.getStatus(),
                    saved.getResponse(), saved.getMessage(), saved.getId());
        }
        return saved;
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
    public Object listAnn() {
        CurrentUser.requireRole(Roles.ADMIN);
        List<Announcement> list = announcements.findAll().stream()
                .sorted(Comparator.comparing(Announcement::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        return Map.of("success", true, "announcements", list);
    }
    @PostMapping("/api/announcements")
    public Object createAnn(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        Announcement a = new Announcement();
        a.setTitle(String.valueOf(body.get("title")));
        a.setDescription(String.valueOf(body.get("description")));
        a.setLink(body.get("link") == null ? null : String.valueOf(body.get("link")));
        a.setTargetSchools(jsons.toJson(body.getOrDefault("targetSchools", List.of())));
        a.setTargetBatches(jsons.toJson(body.getOrDefault("targetBatches", List.of())));
        a.setTargetCenters(jsons.toJson(body.getOrDefault("targetCenters", List.of())));
        a.setCreatedBy(CurrentUser.require().getId());
        Announcement saved = announcements.save(a);
        for (Student student : studentsRepo.findAll()) {
            if (!matchesAnnouncement(student, saved)) continue;
            if (student.getEmail() == null || student.getEmail().isBlank()) continue;
            if (Boolean.TRUE.equals(student.getEmailNotificationsDisabled())) continue;
            email.sendAnnouncement(student.getEmail(), student.getFullName(), saved);
        }
        return saved;
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
        EndorsementToken saved = endorsementTokens.save(t);
        Student student = CurrentUser.require().getStudentId() == null ? null
                : studentsRepo.findById(CurrentUser.require().getStudentId()).orElse(null);
        String studentName = student == null || student.getFullName() == null ? "A student" : student.getFullName();
        String enrollment = student == null || student.getEnrollmentId() == null ? "N/A" : student.getEnrollmentId();
        String frontend = System.getProperty("FRONTEND_URL", "http://localhost:5173");
        if (frontend == null || frontend.isBlank()) frontend = "http://localhost:5173";
        String magic = frontend.replaceAll("/$", "") + "/endorsement/" + saved.getToken();
        email.sendEndorsementRequest(saved.getEmail(), saved.getTeacherName(), studentName, enrollment, magic, saved.getExpiresAt());
        return saved;
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
    @io.swagger.v3.oas.annotations.Hidden
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
        a.setStatus("PUBLISHED");
        Assessment saved = assessments.save(a);
        for (AssessmentAssignment assignment : assignments.findByAssessmentId(id)) {
            if (assignment.getStudentId() == null) continue;
            studentsRepo.findById(assignment.getStudentId()).ifPresent(student ->
                    email.sendAssessmentNotification(student, saved));
        }
        return saved;
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
    public Object dashboard(@RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return dashboard.dashboard(query);
    }
    @GetMapping("/api/admin/jobs/{jobId}/applications")
    public Object adminApps(@PathVariable String jobId) {
        CurrentUser.requireRole(Roles.ADMIN);
        return applicationService.byJob(jobId);
    }
    @GetMapping("/api/admin/audit-logs")
    public Object audit() { CurrentUser.requireRole(Roles.SUPER_ADMIN); return auditLogs.findAll(); }
    @GetMapping("/api/admin/placements")
    public Object placements() {
        CurrentUser.requireRole(Roles.ADMIN);
        return applications.findAll().stream().filter(a -> a.getStatus() != null && a.getStatus().contains("OFFER")).toList();
    }

    @GetMapping("/api/webrtc/turn-ice-servers")
    public Object turn() {
        CurrentUser.require();
        return Map.of("iceServers", List.of(Map.of("urls", "stun:stun.l.google.com:19302")));
    }

    private boolean matchesAnnouncement(Student student, Announcement announcement) {
        return matchesTarget(announcement.getTargetSchools(), student.getSchool(), student.getSchoolId())
                && matchesTarget(announcement.getTargetCenters(), student.getCenter(), student.getCenterId())
                && matchesTarget(announcement.getTargetBatches(), student.getBatch(), student.getBatchId());
    }

    private boolean matchesTarget(String json, String name, String id) {
        List<Object> raw = jsons.fromJsonList(json);
        if (raw.isEmpty() || raw.stream().anyMatch(v -> "ALL".equalsIgnoreCase(String.valueOf(v)))) {
            return true;
        }
        return raw.stream().anyMatch(v -> String.valueOf(v).equalsIgnoreCase(name) || String.valueOf(v).equals(id));
    }
}
