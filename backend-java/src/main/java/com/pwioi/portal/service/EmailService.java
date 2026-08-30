package com.pwioi.portal.service;

import com.pwioi.portal.config.AppProperties;
import com.pwioi.portal.entity.Announcement;
import com.pwioi.portal.entity.Application;
import com.pwioi.portal.entity.Assessment;
import com.pwioi.portal.entity.Job;
import com.pwioi.portal.entity.Student;
import com.pwioi.portal.exception.EmailSendException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.US);
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a", Locale.US);

    private final JavaMailSender mailSender;
    private final AppProperties props;
    private final EmailTemplateLoader templates;

    public EmailService(JavaMailSender mailSender, AppProperties props, EmailTemplateLoader templates) {
        this.mailSender = mailSender;
        this.props = props;
        this.templates = templates;
    }

    public boolean isConfigured() {
        if (mailSender instanceof JavaMailSenderImpl impl) {
            return notBlank(impl.getHost()) && notBlank(impl.getUsername()) && notBlank(impl.getPassword());
        }
        return true;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void logMailStatus() {
        if (isConfigured()) {
            JavaMailSenderImpl impl = (JavaMailSenderImpl) mailSender;
            log.info("Email SMTP ready host={} port={} user={}", impl.getHost(), impl.getPort(), impl.getUsername());
            try {
                impl.testConnection();
                log.info("Email SMTP connection verified");
            } catch (Exception e) {
                log.error("Email SMTP connection failed: {}", e.getMessage());
            }
        } else {
            log.error("Email is NOT configured. Set SMTP_HOST/EMAIL_HOST, SMTP_USER/EMAIL_USER and SMTP_PASS/EMAIL_PASS in backend/.env");
        }
    }

    public void sendOtp(String email, String otp) {
        String html = templates.render("01-otp-verification", Map.of("otp", otp));
        sendHtmlRequired(email, "Your PWIOI Portal Verification Code",
                html, "Your verification code is: " + otp + ". This code will expire in 10 minutes.");
    }

    public void sendPasswordResetOtp(String email, String otp) {
        String frontend = frontend();
        String resetUrl = frontend + "/reset-password?email=" + url(email);
        String html = templates.render("05-password-reset", Map.of(
                "resetPasswordUrl", resetUrl,
                "otp", otp
        ));
        sendHtmlRequired(email, "Password Reset - PWIOI Portal",
                html, "Your password reset code is: " + otp + ". Use this link to reset: " + resetUrl);
    }

    @Async
    public void send(String to, String subject, String body) {
        try {
            sendMime(to, subject, null, body == null ? "" : body, false);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendJobPostedNotification(Job job, String recruiterEmail, String recruiterName) {
        if (!notBlank(recruiterEmail)) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("recruiterName", nz(recruiterName, "Recruiter"));
        data.put("jobTitle", nz(job.getJobTitle(), "Position"));
        data.put("companyName", companyName(job));
        data.put("location", nz(job.getLocation(), "N/A"));
        data.put("salary", salary(job));
        data.put("jobType", nz(job.getJobType(), "Full-time"));
        data.put("postedDate", formatDate(job.getPostedAt() == null ? Instant.now() : job.getPostedAt()));
        data.put("viewJobUrl", frontend() + "/dashboard/recruiter?tab=jobs&jobId=" + job.getId());
        String html = templates.render("02-job-posted-notification", data);
        sendQuiet(recruiterEmail, "Job Posted: " + job.getJobTitle() + " at " + companyName(job), html,
                "Your job posting \"" + job.getJobTitle() + "\" has been approved and posted.");
    }

    @Async
    public void sendNewJobNotification(Student student, Job job) {
        if (student == null || !notBlank(student.getEmail()) || Boolean.TRUE.equals(student.getEmailNotificationsDisabled())) {
            return;
        }
        String description = stripHtml(job.getDescription());
        if (description.length() > 300) description = description.substring(0, 300) + "...";
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentName", nz(student.getFullName(), "Student"));
        data.put("jobTitle", nz(job.getJobTitle(), "Position"));
        data.put("companyName", companyName(job));
        data.put("jobType", nz(job.getJobType(), "Full-time"));
        data.put("remoteType", remoteType(job));
        data.put("location", nz(first(job.getLocation(), job.getCompanyLocation()), "Not specified"));
        data.put("salary", salary(job));
        data.put("deadlineDate", job.getApplicationDeadline() == null ? "N/A" : formatDate(job.getApplicationDeadline()));
        data.put("driveDate", job.getDriveDate() == null ? "" : formatDate(job.getDriveDate()));
        data.put("description", description);
        data.put("jobUrl", frontend() + "/dashboard/student?tab=jobs&jobId=" + job.getId());
        String html = templates.render("13-new-job-alert-student", data);
        sendQuiet(student.getEmail(), "New Opportunity: " + job.getJobTitle() + " at " + companyName(job), html,
                "A new job opportunity matching your profile has been posted: " + job.getJobTitle());
    }

    @Async
    public void sendApplicationConfirmation(Student student, Job job) {
        if (student == null || !notBlank(student.getEmail())) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userName", nz(student.getFullName(), "Student"));
        data.put("companyName", companyName(job));
        data.put("jobTitle", nz(job.getJobTitle(), "Position"));
        data.put("location", nz(job.getLocation(), "N/A"));
        data.put("appliedDate", formatDate(Instant.now()));
        data.put("dashboardUrl", frontend() + "/dashboard/student?tab=applications");
        String html = templates.render("03-application-notification", data);
        sendQuiet(student.getEmail(), "Application Confirmation: " + job.getJobTitle(), html,
                "Your application for " + job.getJobTitle() + " at " + companyName(job) + " has been received.");
    }

    @Async
    public void sendApplicationStatusUpdate(Student student, Job job, Application application) {
        if (student == null || !notBlank(student.getEmail()) || application == null) return;
        Map<String, String> info = statusCopy(application.getStatus());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("statusTitle", info.get("title"));
        data.put("statusSubtitle", info.get("message"));
        data.put("studentName", nz(student.getFullName(), "Student"));
        data.put("jobTitle", nz(job.getJobTitle(), "Position"));
        data.put("companyName", companyName(job));
        data.put("statusBadge", nz(application.getStatus(), "UPDATED"));
        data.put("appliedDate", application.getAppliedDate() == null ? "N/A" : formatDate(application.getAppliedDate()));
        data.put("interviewDate", application.getInterviewDate() == null ? "N/A" : formatDate(application.getInterviewDate()));
        data.put("recruiterNotes", nz(application.getNotes(), "No specific notes from the recruiter."));
        data.put("portalUrl", frontend() + "/student");
        String html = templates.render("04-application-status-update", data);
        sendQuiet(student.getEmail(), info.get("title") + " - " + job.getJobTitle() + " at " + companyName(job), html,
                info.get("message"));
    }

    @Async
    public void sendGenericNotification(String email, String subject, String title, String userName, String message) {
        if (!notBlank(email)) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("notificationType", "Notification");
        data.put("date", formatDate(Instant.now()));
        data.put("title", nz(title, subject));
        data.put("userName", nz(userName, "User"));
        data.put("message", nz(message, subject));
        data.put("panelMessage", nz(message, ""));
        data.put("actionText", "View in Dashboard");
        data.put("actionUrl", frontend() + "/dashboard");
        data.put("iconText", "N");
        data.put("supportUrl", frontend() + "/support");
        data.put("privacyUrl", frontend() + "/privacy");
        String html = templates.render("14-generic-notification", data);
        sendQuiet(email, subject, html, message);
    }

    @Async
    public void sendAnnouncement(String email, String recipientName, Announcement announcement) {
        if (!notBlank(email) || announcement == null) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("announcementTitle", nz(announcement.getTitle(), "Announcement"));
        data.put("recipientName", nz(recipientName, "Student"));
        data.put("announcementContent", nz(announcement.getDescription(), ""));
        data.put("calloutPoint", "Important update from the placement portal.");
        data.put("actionText", notBlank(announcement.getLink()) ? "Check Full Details" : "Go to Dashboard");
        data.put("actionUrl", notBlank(announcement.getLink()) ? announcement.getLink() : frontend() + "/dashboard");
        data.put("validUntil", formatDate(Instant.now().plusSeconds(86400L * 30)));
        data.put("announcementQuote", "Your career journey is our priority.");
        data.put("senderName", "Office of Career Services");
        data.put("senderOrg", "PW Institute of Innovation");
        String html = templates.render("12-announcement-email", data);
        sendQuiet(email, "📢 " + announcement.getTitle(), html, announcement.getDescription());
    }

    @Async
    public void sendEndorsementRequest(String teacherEmail, String teacherName, String studentName,
                                       String enrollmentId, String magicLink, Instant expiresAt) {
        if (!notBlank(teacherEmail)) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("teacherName", nz(teacherName, "Professor"));
        data.put("studentName", nz(studentName, "Student"));
        data.put("studentEnrollmentId", nz(enrollmentId, "N/A"));
        data.put("magicLink", magicLink);
        data.put("expiresAt", formatDateTime(expiresAt));
        String html = templates.render("06-endorsement-request", data);
        sendQuiet(teacherEmail, "Endorsement Request from " + nz(studentName, "a student"), html,
                nz(studentName, "A student") + " requested an endorsement. Open: " + magicLink);
    }

    @Async
    public void sendStudentQueryResponse(String email, String studentName, String querySubject, String ticketStatus,
                                         String adminResponse, String studentQuery, String ticketId) {
        if (!notBlank(email)) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentName", nz(studentName, "Student"));
        data.put("querySubject", nz(querySubject, "Your query"));
        data.put("ticketStatus", nz(ticketStatus, "Resolved"));
        data.put("adminResponseTime", formatDateTime(Instant.now()));
        data.put("adminResponseText", nz(adminResponse, ""));
        data.put("studentQueryText", nz(studentQuery, ""));
        data.put("conversationUrl", frontend() + "/dashboard/student?tab=queries");
        data.put("ticketId", nz(ticketId, ""));
        String html = templates.render("15-student-query-response", data);
        sendQuiet(email, "Response to your query: " + querySubject, html, adminResponse);
    }

    @Async
    public void sendAssessmentNotification(Student student, Assessment assessment) {
        if (student == null || !notBlank(student.getEmail()) || assessment == null) return;
        String typeLabel = "MOCK_TEST".equals(assessment.getType()) ? "Mock Test"
                : "MOCK_INTERVIEW_AUTO".equals(assessment.getType()) ? "Asynch Interview" : "Live 1:1 Interview";
        sendGenericNotification(student.getEmail(), "New Assessment: " + assessment.getTitle(),
                "New Assessment: " + assessment.getTitle(), nz(student.getFullName(), "Student"),
                "A new " + typeLabel.toLowerCase(Locale.ROOT) + " has been assigned to you: " + assessment.getTitle()
                        + " (" + (assessment.getDuration() == null ? 60 : assessment.getDuration()) + " minutes).");
    }

    @Async
    public void sendScreeningRequest(String recruiterEmail, String recruiterName, String jobTitle, String company,
                                     int applicationCount, Instant deadline, String screeningUrl) {
        if (!notBlank(recruiterEmail)) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("recruiterName", nz(recruiterName, "Recruiter"));
        data.put("jobTitle", nz(jobTitle, "Position"));
        data.put("companyName", nz(company, "Company"));
        data.put("applicationCount", String.valueOf(applicationCount));
        data.put("deadlineDate", formatDate(deadline));
        data.put("screeningPortalUrl", screeningUrl);
        data.put("expiryDays", "7");
        String html = templates.render("09-screening-request", data);
        sendQuiet(recruiterEmail, "Action Required: Screening for " + jobTitle + " at " + company, html, screeningUrl);
    }

    @Async
    public void sendInterviewerInvite(String interviewerEmail, String interviewerName, String jobTitle,
                                      String companyName, String magicLink) {
        if (!notBlank(interviewerEmail)) return;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("interviewerName", nz(interviewerName, "Interviewer"));
        data.put("jobTitle", nz(jobTitle, "Position"));
        data.put("companyName", nz(companyName, "Company"));
        data.put("magicLink", magicLink);
        data.put("expiryDays", "7");
        String html = templates.render("10-interviewer-invite", data);
        sendQuiet(interviewerEmail, "Invitation: Interview session for " + jobTitle + " at " + companyName,
                html, magicLink);
    }

    @Async
    public void sendInterviewSlotScheduled(String studentEmail, String studentName, String jobTitle, String companyName,
                                           Instant scheduledAt, String room, String meetingLink, String instructions,
                                           String deliveryMode) {
        if (!notBlank(studentEmail)) return;
        boolean online = "ONLINE".equalsIgnoreCase(nz(deliveryMode, "OFFLINE"));
        String when = scheduledAt == null ? "See placement portal" : formatDateTime(scheduledAt);
        String locationLine = online
                ? (notBlank(meetingLink) ? "Join link: " + meetingLink : "Meeting link will appear in your portal shortly.")
                : (notBlank(room) ? "Venue / room: " + room : "Venue details are in your portal.");
        String subject = (online ? "Online interview scheduled — " : "Interview scheduled — ") + jobTitle;
        String html = "<p>Hello " + nz(studentName, "Student") + ",</p>"
                + "<p>Your interview for <strong>" + nz(jobTitle, "this role") + "</strong>"
                + (notBlank(companyName) ? " at <strong>" + companyName + "</strong>" : "") + " is scheduled.</p>"
                + "<p><strong>When:</strong> " + when + "</p>"
                + "<p><strong>" + (online ? "Online" : "Location") + ":</strong> " + locationLine + "</p>"
                + (notBlank(instructions) ? "<p><strong>Instructions:</strong> " + instructions + "</p>" : "")
                + (online && notBlank(meetingLink) ? "<p><a href=\"" + meetingLink + "\">Join interview</a></p>" : "")
                + "<p><a href=\"" + frontend() + "/student?tab=applications\">Open application tracker</a></p>";
        sendQuiet(studentEmail, subject, html, subject + " " + when);
    }

    private void sendHtmlRequired(String to, String subject, String html, String text) {
        if (!isConfigured()) {
            throw new EmailSendException("Email is not configured. Check SMTP_HOST/SMTP_USER/SMTP_PASS in backend/.env");
        }
        try {
            sendMime(to, subject, html, text, true);
            log.info("Email sent to {} subject={}", to, subject);
        } catch (EmailSendException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
            throw new EmailSendException("Failed to send email: " + e.getMessage(), e);
        }
    }

    private void sendQuiet(String to, String subject, String html, String text) {
        try {
            if (!isConfigured()) {
                log.error("Email skipped (SMTP not configured) to={} subject={}", to, subject);
                return;
            }
            sendMime(to, subject, html, text, true);
            log.info("Email sent to {} subject={}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    private void sendMime(String to, String subject, String html, String text, boolean htmlBody) throws Exception {
        if (!notBlank(to)) {
            throw new EmailSendException("Recipient email is empty");
        }
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        helper.setFrom(fromAddress());
        helper.setTo(InternetAddress.parse(to, false));
        helper.setSubject(subject == null ? "" : subject);
        if (htmlBody && notBlank(html)) {
            helper.setText(nz(text, stripHtml(html)), html);
        } else {
            helper.setText(nz(text, ""), false);
        }
        mailSender.send(message);
    }

    private InternetAddress fromAddress() throws UnsupportedEncodingException {
        String raw = first(props.getEmailFrom(), smtpUser());
        if (!notBlank(raw)) {
            raw = "PWIOI Portal <noreply@pwioi.com>";
        }
        try {
            InternetAddress[] parsed = InternetAddress.parse(raw, false);
            if (parsed.length > 0) {
                if (!notBlank(parsed[0].getPersonal()) && raw.toLowerCase(Locale.ROOT).startsWith("pwioi")) {
                    parsed[0].setPersonal("PWIOI Portal", StandardCharsets.UTF_8.name());
                }
                return parsed[0];
            }
        } catch (Exception ignored) {
            // fall through
        }
        String user = smtpUser();
        return new InternetAddress(notBlank(user) ? user : "noreply@pwioi.com", "PWIOI Portal", StandardCharsets.UTF_8.name());
    }

    private String smtpUser() {
        return mailSender instanceof JavaMailSenderImpl impl ? impl.getUsername() : "";
    }

    private String frontend() {
        String url = props.getFrontendUrl();
        return notBlank(url) ? url.replaceAll("/$", "") : "http://localhost:5173";
    }

    private static String companyName(Job job) {
        return nz(job.getCompanyName(), "Company");
    }

    private static String salary(Job job) {
        return first(job.getSalary(), job.getCtc(), job.getSalaryRange(), "Competitive");
    }

    private static String remoteType(Job job) {
        String mode = job.getWorkMode();
        if (mode == null) return "On-site";
        if (mode.toUpperCase(Locale.ROOT).contains("REMOTE")) return "Remote";
        if (mode.toUpperCase(Locale.ROOT).contains("HYBRID")) return "Hybrid";
        return mode;
    }

    private static Map<String, String> statusCopy(String status) {
        String key = status == null ? "" : status.toUpperCase(Locale.ROOT);
        return switch (key) {
            case "SHORTLISTED" -> Map.of("title", "Congratulations! You've been shortlisted!",
                    "message", "Great news! Your application has been shortlisted. The recruiter will contact you soon for the next steps.");
            case "INTERVIEWED" -> Map.of("title", "Interview Scheduled",
                    "message", "Your interview has been scheduled. Please check your dashboard for details.");
            case "OFFERED" -> Map.of("title", "Congratulations! You've received an offer!",
                    "message", "Congratulations! You have received an offer for this position. Please check your dashboard for details.");
            case "SELECTED" -> Map.of("title", "Congratulations! You've been selected!",
                    "message", "Congratulations! You have been selected for this position. The recruiter will contact you with next steps.");
            case "REJECTED" -> Map.of("title", "Application Update",
                    "message", "Thank you for your interest. Unfortunately, your application has not been selected for this position.");
            case "JOB_REMOVED" -> Map.of("title", "Job Position Removed",
                    "message", "The job position you applied for has been removed by the company.");
            default -> Map.of("title", "Application Status Updated",
                    "message", "Your application status has been updated to " + nz(status, "updated") + ".");
        };
    }

    private static String formatDate(Instant instant) {
        if (instant == null) return "N/A";
        return DATE.format(instant.atZone(ZoneId.systemDefault()));
    }

    private static String formatDateTime(Instant instant) {
        if (instant == null) return "N/A";
        return DATE_TIME.format(instant.atZone(ZoneId.systemDefault()));
    }

    private static String stripHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
    }

    private static String url(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String nz(String value, String fallback) {
        return notBlank(value) ? value : fallback;
    }

    private static String first(String... values) {
        if (values == null) return "";
        for (String v : values) {
            if (notBlank(v)) return v;
        }
        return "";
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    public void sendToMany(Collection<String> emails, String subject, String html, String text) {
        if (emails == null) return;
        for (String email : emails) {
            sendQuiet(email, subject, html, text);
        }
    }
}
