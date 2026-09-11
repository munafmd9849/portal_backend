package com.pwioi.portal.service;

import com.pwioi.portal.config.AppProperties;
import com.pwioi.portal.entity.Application;
import com.pwioi.portal.entity.Company;
import com.pwioi.portal.entity.InterviewRound;
import com.pwioi.portal.entity.InterviewSession;
import com.pwioi.portal.entity.InterviewSlot;
import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.RoundEvaluation;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.ApplicationRepository;
import com.pwioi.portal.repository.CompanyRepository;
import com.pwioi.portal.repository.InterviewRoundRepository;
import com.pwioi.portal.repository.InterviewSessionRepository;
import com.pwioi.portal.repository.InterviewSlotRepository;
import com.pwioi.portal.repository.JobRepository;
import com.pwioi.portal.repository.RoundEvaluationRepository;
import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.PortalPrincipal;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.util.JobEligibility;
import com.pwioi.portal.util.Jsons;
import com.pwioi.portal.websocket.PortalSocketService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {
    private final ApplicationRepository applications;
    private final JobRepository jobs;
    private final StudentRepository students;
    private final CompanyRepository companies;
    private final InterviewSessionRepository sessions;
    private final InterviewRoundRepository rounds;
    private final RoundEvaluationRepository evaluations;
    private final InterviewSlotRepository slots;
    private final PortalSocketService sockets;
    private final AppProperties props;
    private final EmailService email;
    private final Jsons jsons;

    public ApplicationService(ApplicationRepository applications, JobRepository jobs, StudentRepository students,
                              CompanyRepository companies, InterviewSessionRepository sessions,
                              InterviewRoundRepository rounds, RoundEvaluationRepository evaluations,
                              InterviewSlotRepository slots, PortalSocketService sockets, AppProperties props,
                              EmailService email, Jsons jsons) {
        this.applications = applications;
        this.jobs = jobs;
        this.students = students;
        this.companies = companies;
        this.sessions = sessions;
        this.rounds = rounds;
        this.evaluations = evaluations;
        this.slots = slots;
        this.sockets = sockets;
        this.props = props;
        this.email = email;
        this.jsons = jsons;
    }

    public List<Application> all() {
        CurrentUser.requireRole(Roles.ADMIN);
        return applications.findAll();
    }

    public List<Map<String, Object>> mine() {
        CurrentUser.requireRole(Roles.STUDENT, Roles.ADMIN, Roles.SUPER_ADMIN);
        String sid = resolveStudentId();
        if (sid == null) return List.of();
        return formatStudentApplications(applications.findByStudentIdOrderByAppliedDateDesc(sid), false);
    }

    public List<Map<String, Object>> interviewHistory() {
        CurrentUser.requireRole(Roles.STUDENT);
        String sid = resolveStudentId();
        if (sid == null) return List.of();
        return formatStudentApplications(applications.findByStudentIdOrderByAppliedDateDesc(sid), true);
    }

    @Transactional
    public Application apply(String jobId, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        String studentId = CurrentUser.require().getStudentId();
        if (studentId == null) throw ApiException.badRequest("Student profile required");
        Student student = students.findById(studentId).orElseThrow();
        Job job = jobs.findById(jobId).orElseThrow(() -> ApiException.notFound("Job"));
        if (!Boolean.TRUE.equals(job.getIsPosted()) || !Boolean.TRUE.equals(job.getIsActive())) {
            throw ApiException.badRequest("Job is not open");
        }
        if (!JobEligibility.hasCompleteProfile(student)) {
            throw ApiException.forbidden("Complete your profile (name, email, school, center, batch) before applying.");
        }
        if (!JobEligibility.meetsJobEligibility(student, job)) {
            throw ApiException.badRequest(
                    "Your profile does not meet this job's CGPA, YOP, or backlogs requirement. Update Edit Profile and try again.");
        }
        if (job.getApplicationDeadline() != null && job.getApplicationDeadline().isBefore(Instant.now())) {
            throw ApiException.badRequest("Application deadline has passed");
        }
        if (applications.findByStudentIdAndJobId(studentId, jobId).isPresent()) {
            throw ApiException.badRequest("Already applied");
        }
        long activeOffers = applications.findByStudentId(studentId).stream()
                .filter(a -> "OFFERED".equals(a.getStatus()) || "OFFER_ACCEPTED".equals(a.getStatus()))
                .count();
        if (activeOffers >= props.getPlacement().getMaxActiveOffers()) {
            throw ApiException.forbidden("Placement policy: max active offers reached");
        }
        Application a = new Application();
        a.setStudentId(studentId);
        a.setJobId(jobId);
        a.setCompanyId(job.getCompanyId());
        a.setStatus("APPLIED");
        a.setAppliedDate(Instant.now());
        a.setScreeningStatus("APPLIED");
        a.setCustomAnswers(body.get("customAnswers") == null ? "{}" : String.valueOf(body.get("customAnswers")));
        a.setApplicationSource("PORTAL");
        Application saved = applications.save(a);
        student.setStatsApplied((student.getStatsApplied() == null ? 0 : student.getStatsApplied()) + 1);
        students.save(student);
        sockets.emit("applications:" + CurrentUser.require().getId(), "application:created", Map.of("id", saved.getId()));
        email.sendApplicationConfirmation(student, job);
        return saved;
    }

    @Transactional
    public Application updateStatus(String id, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER);
        Application a = applications.findById(id).orElseThrow(() -> ApiException.notFound("Application"));
        if (body.get("status") != null) {
            a.setPreviousStatus(a.getStatus());
            a.setStatus(body.get("status").toString());
        }
        if (body.get("pipelineStatus") != null) a.setPipelineStatus(body.get("pipelineStatus").toString());
        if (body.get("notes") != null) a.setNotes(body.get("notes").toString());
        if (body.get("offerCtc") != null) a.setOfferCtc(body.get("offerCtc").toString());
        Application saved = applications.save(a);
        sockets.emit("applications:" + a.getStudentId(), "application:updated", Map.of("id", saved.getId(), "status", saved.getStatus()));
        students.findById(saved.getStudentId()).ifPresent(student ->
                jobs.findById(saved.getJobId()).ifPresent(job -> email.sendApplicationStatusUpdate(student, job, saved)));
        return saved;
    }

    @Transactional
    public Application withdraw(String id) {
        CurrentUser.requireRole(Roles.STUDENT);
        Application a = applications.findById(id).orElseThrow(() -> ApiException.notFound("Application"));
        if (!a.getStudentId().equals(CurrentUser.require().getStudentId())) {
            throw ApiException.forbidden("Forbidden");
        }
        a.setPreviousStatus(a.getStatus());
        a.setStatus("WITHDRAWN");
        return applications.save(a);
    }

    @Transactional
    public Application offerResponse(String id, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.STUDENT);
        Application a = applications.findById(id).orElseThrow(() -> ApiException.notFound("Application"));
        String action = String.valueOf(body.getOrDefault("action", "")).toUpperCase();
        if ("ACCEPT".equals(action)) a.setStatus("OFFER_ACCEPTED");
        else if ("REJECT".equals(action) || "DECLINE".equals(action)) a.setStatus("OFFER_DECLINED");
        else throw ApiException.badRequest("action must be ACCEPT or REJECT");
        return applications.save(a);
    }

    @Transactional
    public Application revoke(String id, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN);
        Application a = applications.findById(id).orElseThrow(() -> ApiException.notFound("Application"));
        a.setPreviousStatus(a.getStatus());
        a.setStatus("REVOKED");
        a.setRevokedBy(CurrentUser.require().getId());
        a.setRevokedAt(Instant.now());
        a.setRevokedReason(String.valueOf(body.getOrDefault("reason", "")));
        return applications.save(a);
    }

    @Transactional
    public Application restore(String id) {
        CurrentUser.requireRole(Roles.ADMIN);
        Application a = applications.findById(id).orElseThrow(() -> ApiException.notFound("Application"));
        a.setStatus(a.getPreviousStatus() != null ? a.getPreviousStatus() : "APPLIED");
        a.setRevokedBy(null);
        a.setRevokedAt(null);
        return applications.save(a);
    }

    public List<Application> byJob(String jobId) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER, Roles.SUPER_ADMIN);
        return applications.findByJobId(jobId);
    }

    private String resolveStudentId() {
        PortalPrincipal p = CurrentUser.require();
        if (p.getStudentId() != null) return p.getStudentId();
        return students.findByUserId(p.getId()).map(Student::getId).orElse(null);
    }

    private List<Map<String, Object>> formatStudentApplications(List<Application> apps, boolean history) {
        if (apps.isEmpty()) return List.of();

        Set<String> jobIds = new HashSet<>();
        Set<String> appIds = new HashSet<>();
        Set<String> companyIds = new HashSet<>();
        for (Application a : apps) {
            if (a.getJobId() != null) jobIds.add(a.getJobId());
            if (a.getId() != null) appIds.add(a.getId());
            if (a.getCompanyId() != null) companyIds.add(a.getCompanyId());
        }

        Map<String, Job> jobMap = new HashMap<>();
        if (!jobIds.isEmpty()) {
            for (Job job : jobs.findAllById(jobIds)) {
                jobMap.put(job.getId(), job);
                if (job.getCompanyId() != null) companyIds.add(job.getCompanyId());
            }
        }
        Map<String, Company> companyMap = new HashMap<>();
        if (!companyIds.isEmpty()) {
            for (Company c : companies.findAllById(companyIds)) {
                companyMap.put(c.getId(), c);
            }
        }

        Map<String, InterviewSession> sessionByJob = new HashMap<>();
        Map<String, List<InterviewRound>> roundsBySession = new HashMap<>();
        if (!jobIds.isEmpty()) {
            List<InterviewSession> sessionList = sessions.findByJobIdIn(jobIds);
            Set<String> sessionIds = new HashSet<>();
            for (InterviewSession s : sessionList) {
                sessionByJob.put(s.getJobId(), s);
                sessionIds.add(s.getId());
            }
            if (!sessionIds.isEmpty()) {
                for (InterviewRound r : rounds.findBySessionIdIn(sessionIds)) {
                    roundsBySession.computeIfAbsent(r.getSessionId(), k -> new ArrayList<>()).add(r);
                }
                for (List<InterviewRound> list : roundsBySession.values()) {
                    list.sort(Comparator.comparing(r -> r.getRoundNumber() == null ? 0 : r.getRoundNumber()));
                }
            }
        }

        Map<String, List<RoundEvaluation>> evalsByApp = new HashMap<>();
        Map<String, InterviewRound> roundById = new HashMap<>();
        for (List<InterviewRound> list : roundsBySession.values()) {
            for (InterviewRound r : list) roundById.put(r.getId(), r);
        }
        if (!appIds.isEmpty()) {
            for (RoundEvaluation e : evaluations.findByApplicationIdIn(appIds)) {
                evalsByApp.computeIfAbsent(e.getApplicationId(), k -> new ArrayList<>()).add(e);
                if (e.getRoundId() != null && !roundById.containsKey(e.getRoundId())) {
                    rounds.findById(e.getRoundId()).ifPresent(r -> roundById.put(r.getId(), r));
                }
            }
        }

        Map<String, List<InterviewSlot>> slotsByApp = new HashMap<>();
        if (!history && !appIds.isEmpty()) {
            for (InterviewSlot slot : slots.findByApplicationIdIn(appIds)) {
                slotsByApp.computeIfAbsent(slot.getApplicationId(), k -> new ArrayList<>()).add(slot);
            }
            for (List<InterviewSlot> list : slotsByApp.values()) {
                list.sort(Comparator.comparing(InterviewSlot::getScheduledAt, Comparator.nullsLast(Comparator.naturalOrder())));
            }
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Application a : apps) {
            Job job = jobMap.get(a.getJobId());
            Company company = companyMap.get(a.getCompanyId());
            if (company == null && job != null) company = companyMap.get(job.getCompanyId());
            InterviewSession session = sessionByJob.get(a.getJobId());
            List<InterviewRound> sessionRounds = session == null
                    ? List.of()
                    : roundsBySession.getOrDefault(session.getId(), List.of());
            List<RoundEvaluation> appEvals = evalsByApp.getOrDefault(a.getId(), List.of());
            if (history) {
                out.add(toHistoryView(a, job, company, session, sessionRounds, appEvals, roundById));
            } else {
                out.add(toListView(a, job, company, session, sessionRounds, appEvals, roundById,
                        slotsByApp.getOrDefault(a.getId(), List.of())));
            }
        }
        return out;
    }

    private Map<String, Object> toListView(Application a, Job job, Company company, InterviewSession session,
                                           List<InterviewRound> sessionRounds, List<RoundEvaluation> appEvals,
                                           Map<String, InterviewRound> roundById, List<InterviewSlot> appSlots) {
        String screeningStatus = a.getScreeningStatus() == null ? "APPLIED" : a.getScreeningStatus();
        boolean hasSession = session != null;
        boolean hasStarted = (a.getLastRoundReached() != null && a.getLastRoundReached() > 0)
                || !appEvals.isEmpty()
                || (session != null && ("COMPLETED".equals(session.getStatus()) || "ONGOING".equals(session.getStatus()))
                && !sessionRounds.isEmpty());
        Map<String, Object> tracking = trackingFields(a, screeningStatus, hasSession, hasStarted, session, sessionRounds);
        String currentStage = String.valueOf(tracking.get("currentStage"));
        Map<String, Object> primary = primaryStatus(String.valueOf(tracking.get("finalStatus")), currentStage, a.getStatus());

        Map<String, Object> jobView = job == null ? new LinkedHashMap<>() : new LinkedHashMap<>(jsons.toMap(job));
        jobView.put("jobTitle", job == null ? "Unknown Position" : job.getJobTitle());
        jobView.put("company", company);

        Map<String, Object> companyView = company == null ? Map.of("name", "Unknown Company") : jsons.toMap(company);

        List<Map<String, Object>> slotViews = new ArrayList<>();
        String jobMode = job == null || job.getInterviewMode() == null ? "OFFLINE" : job.getInterviewMode();
        for (InterviewSlot slot : appSlots) {
            String delivery = "HYBRID".equalsIgnoreCase(jobMode)
                    ? (slot.getSlotDeliveryMode() == null ? "OFFLINE" : slot.getSlotDeliveryMode().toUpperCase())
                    : jobMode.toUpperCase();
            InterviewRound round = slot.getRoundId() == null ? null : roundById.get(slot.getRoundId());
            Map<String, Object> sv = new LinkedHashMap<>();
            sv.put("id", slot.getId());
            sv.put("scheduledAt", slot.getScheduledAt());
            sv.put("room", slot.getRoom());
            sv.put("meetingLink", "ONLINE".equals(delivery) ? slot.getMeetingLink() : null);
            sv.put("meetingProvider", slot.getMeetingProvider());
            sv.put("joinInstructions", slot.getJoinInstructions());
            sv.put("deliveryMode", delivery);
            sv.put("status", slot.getStatus());
            sv.put("studentJoinedAt", slot.getStudentJoinedAt());
            if (round == null) {
                sv.put("round", null);
            } else {
                Map<String, Object> rv = new LinkedHashMap<>();
                rv.put("roundNumber", round.getRoundNumber());
                rv.put("name", round.getName());
                sv.put("round", rv);
            }
            slotViews.add(sv);
        }

        Map<String, Object> out = new LinkedHashMap<>(jsons.toMap(a));
        out.put("company", companyView);
        out.put("job", jobView);
        out.put("screeningStatus", screeningStatus);
        out.put("screeningRemarks", a.getScreeningRemarks());
        out.put("screeningStatusText", primary.get("label"));
        out.put("currentStage", currentStage);
        out.put("primaryStatus", primary);
        out.put("tracker", Map.of("currentStage", currentStage, "primaryStatus", primary, "details", tracking));
        out.put("finalStatus", tracking.get("finalStatus"));
        out.put("rejectedIn", tracking.get("rejectedIn"));
        Map<String, Object> interviewStatus = new LinkedHashMap<>();
        interviewStatus.put("hasSession", hasSession);
        interviewStatus.put("statusText", Boolean.TRUE.equals(primary.get("final")) ? null : currentStage);
        interviewStatus.put("lastRoundStatus", null);
        interviewStatus.put("lastRoundReached", tracking.get("lastRoundReached"));
        out.put("interviewStatus", interviewStatus);
        out.put("interviewSlots", slotViews);
        return out;
    }

    private Map<String, Object> toHistoryView(Application a, Job job, Company company, InterviewSession session,
                                              List<InterviewRound> sessionRounds, List<RoundEvaluation> appEvals,
                                              Map<String, InterviewRound> roundById) {
        String screeningStatus = a.getScreeningStatus() == null ? "APPLIED" : a.getScreeningStatus();
        String screeningStatusText = switch (screeningStatus) {
            case "RESUME_REJECTED", "SCREENING_REJECTED" -> "Rejected in Resume Screening";
            case "TEST_REJECTED" -> "Rejected in Screening Test";
            case "TEST_SELECTED", "INTERVIEW_ELIGIBLE" -> "Qualified for Interview";
            case "RESUME_SELECTED", "SCREENING_SELECTED" -> "Resume Selected";
            default -> "Applied (Screening Pending)";
        };

        String lastRoundReachedName = null;
        String lastEvaluationStatus = null;
        int highestRoundNumber = -1;
        List<String> roundsReached = new ArrayList<>();
        for (RoundEvaluation evaluation : appEvals) {
            InterviewRound round = roundById.get(evaluation.getRoundId());
            if (round == null) continue;
            int n = round.getRoundNumber() == null ? 0 : round.getRoundNumber();
            if (n > highestRoundNumber) {
                highestRoundNumber = n;
                lastRoundReachedName = round.getName();
                lastEvaluationStatus = evaluation.getStatus();
            }
            if (round.getName() != null && !roundsReached.contains(round.getName())) {
                roundsReached.add(round.getName());
            }
        }
        if (lastRoundReachedName == null && a.getLastRoundReached() != null && a.getLastRoundReached() > 0) {
            for (InterviewRound r : sessionRounds) {
                if (a.getLastRoundReached().equals(r.getRoundNumber())) {
                    lastRoundReachedName = r.getName();
                    break;
                }
            }
        }

        String finalStatus = a.getStatus();
        boolean isCracked = false;
        boolean isRejected = false;
        if ("SELECTED".equals(a.getInterviewStatus())) {
            isCracked = true;
            finalStatus = "SELECTED";
        } else if (a.getInterviewStatus() != null && a.getInterviewStatus().startsWith("REJECTED_IN_ROUND_")) {
            isRejected = true;
            finalStatus = "REJECTED";
        } else if ("SELECTED".equals(lastEvaluationStatus)) {
            int maxRound = sessionRounds.stream()
                    .mapToInt(r -> r.getRoundNumber() == null ? 0 : r.getRoundNumber())
                    .max().orElse(-1);
            if (highestRoundNumber == maxRound && maxRound >= 0) {
                isCracked = true;
                finalStatus = "SELECTED";
            }
        } else if ("REJECTED".equals(lastEvaluationStatus)) {
            isRejected = true;
            finalStatus = "REJECTED";
        } else if ("SELECTED".equals(a.getStatus()) || "OFFERED".equals(a.getStatus())) {
            isCracked = true;
        } else if ("REJECTED".equals(a.getStatus())) {
            isRejected = true;
        }

        Map<String, Object> jobView = job == null ? new LinkedHashMap<>() : new LinkedHashMap<>(jsons.toMap(job));
        jobView.put("jobTitle", job == null ? "" : job.getJobTitle());

        Map<String, Object> interviewHistory;
        if (session == null) {
            interviewHistory = Map.of("hasInterview", false);
        } else {
            boolean shared = Boolean.TRUE.equals(session.getShareResultsWithStudents());
            List<Map<String, Object>> roundViews = new ArrayList<>();
            for (InterviewRound r : sessionRounds) {
                Map<String, Object> rv = new LinkedHashMap<>();
                rv.put("name", r.getName());
                rv.put("roundNumber", r.getRoundNumber());
                rv.put("status", r.getStatus());
                rv.put("criteria", null);
                roundViews.add(rv);
            }
            List<Map<String, Object>> evalViews = new ArrayList<>();
            for (RoundEvaluation e : appEvals) {
                InterviewRound round = roundById.get(e.getRoundId());
                Map<String, Object> ev = new LinkedHashMap<>();
                ev.put("roundName", round == null ? "Round" : (round.getName() == null ? "Round " + round.getRoundNumber() : round.getName()));
                ev.put("roundNumber", round == null ? null : round.getRoundNumber());
                ev.put("marks", null);
                ev.put("remarks", shared ? e.getRemarks() : null);
                ev.put("status", shared ? e.getStatus() : null);
                ev.put("evaluatedAt", shared ? e.getCreatedAt() : null);
                evalViews.add(ev);
            }
            interviewHistory = new LinkedHashMap<>();
            interviewHistory.put("interviewId", session.getId());
            interviewHistory.put("hasInterview", true);
            interviewHistory.put("resultsSharedWithStudent", shared);
            interviewHistory.put("rounds", roundViews);
            interviewHistory.put("lastRoundReached", lastRoundReachedName);
            interviewHistory.put("roundsReached", roundsReached);
            interviewHistory.put("evaluations", evalViews);
            interviewHistory.put("isCracked", isCracked);
            interviewHistory.put("isRejected", isRejected);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", a.getId());
        out.put("studentId", a.getStudentId());
        out.put("jobId", a.getJobId());
        out.put("companyId", a.getCompanyId());
        out.put("status", finalStatus);
        out.put("appliedDate", a.getAppliedDate());
        out.put("interviewDate", a.getInterviewDate());
        out.put("screeningStatus", screeningStatus);
        out.put("screeningStatusText", screeningStatusText);
        out.put("company", company);
        out.put("job", jobView);
        out.put("interviewHistory", interviewHistory);
        return out;
    }

    private static Map<String, Object> trackingFields(Application a, String screening, boolean hasSession,
                                                      boolean hasStarted, InterviewSession session,
                                                      List<InterviewRound> sessionRounds) {
        String interview = a.getInterviewStatus() == null ? null : a.getInterviewStatus().trim().toUpperCase();
        String status = a.getStatus() == null ? null : a.getStatus().toUpperCase();
        String finalStatus = "ONGOING";
        if ("SELECTED".equals(interview) || "SELECTED".equals(status)) finalStatus = "SELECTED";
        else if (interview != null && interview.startsWith("REJECTED_IN_ROUND_")) finalStatus = "REJECTED";
        else if ("RESUME_REJECTED".equals(screening) || "SCREENING_REJECTED".equals(screening) || "TEST_REJECTED".equals(screening)) finalStatus = "REJECTED";
        else if ("REJECTED".equals(status)) finalStatus = "REJECTED";
        else if ("WITHDRAWN".equals(status)) finalStatus = "WITHDRAWN";
        else if ("REVOKED".equals(status) || "REVOKED_BY_ADMIN".equals(status)) finalStatus = "REVOKED";

        String rejectedIn = null;
        if ("REJECTED".equals(finalStatus)) {
            if ("RESUME_REJECTED".equals(screening) || "SCREENING_REJECTED".equals(screening)) rejectedIn = "Screening";
            else if ("TEST_REJECTED".equals(screening)) rejectedIn = "Test";
            else if (interview != null && interview.startsWith("REJECTED_IN_ROUND_")) {
                rejectedIn = "Round " + interview.substring("REJECTED_IN_ROUND_".length());
            }
        }

        String currentStage = "Applied";
        int dbLast = a.getLastRoundReached() == null ? 0 : a.getLastRoundReached();
        if ("SELECTED".equals(finalStatus)) currentStage = "Selected (Final)";
        else if ("REJECTED".equals(finalStatus)) {
            if ("Screening".equals(rejectedIn)) currentStage = "Rejected in Screening";
            else if ("Test".equals(rejectedIn)) currentStage = "Rejected in Test";
            else if (rejectedIn != null && rejectedIn.startsWith("Round ")) currentStage = "Rejected in Interview " + rejectedIn;
            else currentStage = "Rejected";
        } else if ("RESUME_SELECTED".equals(screening) || "SCREENING_SELECTED".equals(screening)) {
            currentStage = "Screening Qualified";
        } else if ("TEST_SELECTED".equals(screening) || "INTERVIEW_ELIGIBLE".equals(screening)) {
            boolean allEnded = !sessionRounds.isEmpty() && sessionRounds.stream().allMatch(r -> "ENDED".equals(r.getStatus()));
            boolean sessionCompleted = session != null && "COMPLETED".equals(session.getStatus());
            if (hasSession && hasStarted) {
                currentStage = (allEnded || sessionCompleted) ? "Interview Completed" : "Interview Round " + Math.max(1, dbLast + 1);
            } else {
                currentStage = "Qualified for Interview";
            }
        }

        int lastRoundOut = 0;
        if ("SELECTED".equals(finalStatus) || (interview != null && interview.startsWith("REJECTED_IN_ROUND_"))) {
            lastRoundOut = dbLast;
        } else if (hasSession && hasStarted && ("TEST_SELECTED".equals(screening) || "INTERVIEW_ELIGIBLE".equals(screening) || "SCREENING_SELECTED".equals(screening))) {
            lastRoundOut = Math.max(1, dbLast + 1);
        }

        Map<String, Object> tracking = new LinkedHashMap<>();
        tracking.put("currentStage", currentStage);
        tracking.put("finalStatus", finalStatus);
        tracking.put("rejectedIn", rejectedIn);
        tracking.put("lastRoundReached", lastRoundOut);
        return tracking;
    }

    private static Map<String, Object> primaryStatus(String finalStatus, String currentStage, String status) {
        Map<String, Object> p = new LinkedHashMap<>();
        if ("SELECTED".equals(finalStatus)) {
            p.put("label", "Selected");
            p.put("code", "SELECTED");
            p.put("variant", "success");
            p.put("final", true);
        } else if ("REJECTED".equals(finalStatus)) {
            p.put("label", "Rejected");
            p.put("code", "REJECTED");
            p.put("variant", "danger");
            p.put("final", true);
        } else if ("WITHDRAWN".equals(finalStatus) || "WITHDRAWN".equalsIgnoreCase(status)) {
            p.put("label", "Withdrawn");
            p.put("code", "WITHDRAWN");
            p.put("variant", "neutral");
            p.put("final", true);
        } else if ("REVOKED".equals(finalStatus) || "REVOKED_BY_ADMIN".equalsIgnoreCase(status)) {
            p.put("label", "Revoked by Admin");
            p.put("code", "REVOKED_BY_ADMIN");
            p.put("variant", "neutral");
            p.put("final", true);
        } else {
            p.put("label", currentStage == null ? "Applied" : currentStage);
            p.put("code", "APPLIED");
            p.put("variant", "neutral");
            p.put("final", false);
        }
        return p;
    }
}
