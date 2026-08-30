package com.pwioi.portal.service;

import com.pwioi.portal.ai.AiService;
import com.pwioi.portal.entity.*;
import com.pwioi.portal.exception.ApiException;
import com.pwioi.portal.repository.*;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.PortalPrincipal;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.util.Jsons;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StudentService {
    private final StudentRepository students;
    private final SkillRepository skills;
    private final EducationRepository education;
    private final ExperienceRepository experiences;
    private final ProjectRepository projects;
    private final AchievementRepository achievements;
    private final StudentResumeFileRepository resumes;
    private final UserRepository users;
    private final CertificationRepository certifications;
    private final CodingProfileRepository codingProfiles;
    private final CloudinaryService cloudinary;
    private final AiService ai;
    private final Jsons jsons;

    public StudentService(StudentRepository students, SkillRepository skills, EducationRepository education,
                          ExperienceRepository experiences, ProjectRepository projects,
                          AchievementRepository achievements, StudentResumeFileRepository resumes,
                          UserRepository users, CertificationRepository certifications,
                          CodingProfileRepository codingProfiles, CloudinaryService cloudinary, AiService ai, Jsons jsons) {
        this.students = students;
        this.skills = skills;
        this.education = education;
        this.experiences = experiences;
        this.projects = projects;
        this.achievements = achievements;
        this.resumes = resumes;
        this.users = users;
        this.certifications = certifications;
        this.codingProfiles = codingProfiles;
        this.cloudinary = cloudinary;
        this.ai = ai;
        this.jsons = jsons;
    }

    public Student requireMine() {
        PortalPrincipal p = CurrentUser.require();
        if (p.getStudentId() != null) {
            return students.findById(p.getStudentId()).orElseThrow(() -> ApiException.notFound("Student"));
        }
        return students.findByUserId(p.getId()).orElseThrow(() -> ApiException.notFound("Student"));
    }

    public Map<String, Object> getProfile() {
        Student s = requireMine();
        Map<String, Object> m = new LinkedHashMap<>(jsons.toMap(s));
        m.put("skills", skills.findByStudentId(s.getId()));
        m.put("education", education.findByStudentId(s.getId()));
        m.put("experiences", experiences.findByStudentId(s.getId()));
        m.put("projects", projects.findByStudentId(s.getId()));
        m.put("achievements", achievements.findByStudentId(s.getId()));
        m.put("certifications", certifications.findByStudentId(s.getId()));
        m.put("codingProfiles", codingProfiles.findByStudentId(s.getId()));
        m.put("resumes", resumes.findByStudentId(s.getId()));
        User user = users.findById(s.getUserId()).orElse(null);
        m.put("profilePhoto", user == null ? null : user.getProfilePhoto());
        m.put("emailVerified", user != null && (Boolean.TRUE.equals(user.getEmailVerified()) || user.getLastLoginAt() != null));
        return m;
    }

    public List<Skill> listSkills() {
        CurrentUser.requireRole(Roles.STUDENT, Roles.ADMIN, Roles.SUPER_ADMIN);
        PortalPrincipal p = CurrentUser.require();
        String studentId = p.getStudentId();
        if (studentId == null) {
            studentId = students.findByUserId(p.getId()).map(Student::getId).orElse(null);
        }
        if (studentId == null) {
            return List.of();
        }
        return skills.findByStudentIdOrderBySkillNameAsc(studentId);
    }

    public Map<String, Object> getPublicProfileSettings() {
        Student s = requireMine();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("publicProfileId", s.getPublicProfileId());
        out.put("showEmail", s.getPublicProfileShowEmail() == null || s.getPublicProfileShowEmail());
        out.put("showPhone", Boolean.TRUE.equals(s.getPublicProfileShowPhone()));
        return out;
    }

    @Transactional
    public Map<String, Object> updatePublicProfileSettings(Map<String, Object> body) {
        Student s = requireMine();
        if (body.get("showEmail") instanceof Boolean b) {
            s.setPublicProfileShowEmail(b);
        }
        if (body.get("showPhone") instanceof Boolean b) {
            s.setPublicProfileShowPhone(b);
        }
        students.save(s);
        return getPublicProfileSettings();
    }

    @Transactional
    public Student updateProfile(Map<String, Object> body) {
        Student s = requireMine();
        copy(body, s, "fullName", "phone", "enrollmentId", "cgpa", "backlogs", "batch", "center", "school",
                "branch", "batchId", "centerId", "schoolId", "bio", "headline", "summary", "city",
                "stateRegion", "jobFlexibility", "linkedin", "githubUrl", "youtubeUrl", "leetcode",
                "codeforces", "gfg", "hackerrank", "otherProfiles", "gender");
        if (body.get("cgpa") instanceof Number n) s.setCgpa(n.doubleValue());
        boolean complete = notBlank(s.getFullName()) && notBlank(s.getPhone()) && notBlank(s.getEnrollmentId())
                && notBlank(s.getSchool()) && notBlank(s.getCenter()) && notBlank(s.getBatch());
        if (complete) s.setProfileCompleted(true);
        return students.save(s);
    }

    public List<Student> allStudents() {
        CurrentUser.requireRole(Roles.ADMIN, Roles.SUPER_ADMIN);
        return students.findAll();
    }

    public Map<String, Object> listForAdmin(Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.SUPER_ADMIN);
        Map<String, User> usersById = users.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u, (a, b) -> a));
        String search = query == null ? "" : String.valueOf(query.getOrDefault("search", "")).trim().toLowerCase();
        String school = query == null ? null : query.get("school");
        String center = query == null ? null : query.get("center");
        String batch = query == null ? null : query.get("batch");
        String status = query == null ? null : query.get("status");
        int page = parsePositive(query == null ? null : query.get("page"), 1);
        int limit = Math.min(500, parsePositive(query == null ? null : query.get("limit"), 50));

        List<Student> filtered = students.findAll().stream()
                .filter(s -> matchesAcademic(school, s.getSchool(), s.getSchoolId()))
                .filter(s -> matchesAcademic(center, s.getCenter(), s.getCenterId()))
                .filter(s -> matchesAcademic(batch, s.getBatch(), s.getBatchId()))
                .filter(s -> {
                    if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) return true;
                    User u = usersById.get(s.getUserId());
                    String st = u == null || u.getStatus() == null ? "ACTIVE" : u.getStatus();
                    return status.equalsIgnoreCase(st);
                })
                .filter(s -> {
                    if (search.isBlank()) return true;
                    User u = usersById.get(s.getUserId());
                    return contains(s.getFullName(), search)
                            || contains(s.getEmail(), search)
                            || contains(s.getEnrollmentId(), search)
                            || (u != null && contains(u.getEmail(), search));
                })
                .sorted(Comparator.comparing(Student::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        int total = filtered.size();
        int from = Math.min((page - 1) * limit, total);
        List<Map<String, Object>> rows = filtered.subList(from, Math.min(from + limit, total)).stream()
                .map(s -> toAdminRow(s, usersById.get(s.getUserId())))
                .toList();

        long active = 0, blocked = 0, pending = 0, rejected = 0;
        for (Student s : students.findAll()) {
            User u = usersById.get(s.getUserId());
            String st = u == null || u.getStatus() == null ? "ACTIVE" : u.getStatus().toUpperCase();
            switch (st) {
                case "BLOCKED" -> blocked++;
                case "PENDING" -> pending++;
                case "REJECTED" -> rejected++;
                default -> active++;
            }
        }

        Map<String, Object> pagination = new LinkedHashMap<>();
        pagination.put("page", page);
        pagination.put("limit", limit);
        pagination.put("total", total);
        pagination.put("totalPages", Math.max(1, (int) Math.ceil(total / (double) limit)));

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalStudents", students.count());
        summary.put("activeStudents", active);
        summary.put("blockedStudents", blocked);
        summary.put("pendingStudents", pending);
        summary.put("rejectedStudents", rejected);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("students", rows);
        out.put("summary", summary);
        out.put("statusBreakdown", Map.of(
                "total", students.count(),
                "active", active,
                "blocked", blocked,
                "inactive", pending + rejected
        ));
        out.put("pagination", pagination);
        return out;
    }

    private Map<String, Object> toAdminRow(Student s, User u) {
        Map<String, Object> row = new LinkedHashMap<>(jsons.toMap(s));
        row.put("status", u == null || u.getStatus() == null ? "ACTIVE" : u.getStatus());
        row.put("emailVerified", u != null && Boolean.TRUE.equals(u.getEmailVerified()));
        row.put("blockInfo", u == null ? null : u.getBlockInfo());
        if (u != null) {
            Map<String, Object> user = new LinkedHashMap<>();
            user.put("id", u.getId());
            user.put("email", u.getEmail());
            user.put("role", u.getRole());
            user.put("status", u.getStatus());
            user.put("emailVerified", u.getEmailVerified());
            user.put("displayName", u.getDisplayName());
            user.put("createdAt", u.getCreatedAt());
            user.put("lastLoginAt", u.getLastLoginAt());
            user.put("blockInfo", u.getBlockInfo());
            row.put("user", user);
        }
        return row;
    }

    private static boolean matchesAcademic(String raw, String name, String id) {
        if (raw == null || raw.isBlank()) return true;
        return Arrays.stream(raw.split(",")).map(String::trim).anyMatch(w ->
                w.equalsIgnoreCase(name) || w.equalsIgnoreCase(id));
    }

    private static boolean contains(String value, String search) {
        return value != null && value.toLowerCase().contains(search);
    }

    private static int parsePositive(String raw, int fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return Math.max(1, Integer.parseInt(raw.trim()));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    @Transactional
    public Student block(String studentId, Map<String, Object> body) {
        CurrentUser.requireRole(Roles.ADMIN, Roles.SUPER_ADMIN);
        Student s = students.findById(studentId).orElseThrow(() -> ApiException.notFound("Student"));
        User u = users.findById(s.getUserId()).orElseThrow();
        boolean block = Boolean.TRUE.equals(body.get("blocked")) || "BLOCKED".equals(String.valueOf(body.get("status")));
        u.setStatus(block ? "BLOCKED" : "ACTIVE");
        u.setBlockInfo(body.get("reason") != null ? body.get("reason").toString() : u.getBlockInfo());
        users.save(u);
        return s;
    }

    @Transactional
    public Skill addSkill(Map<String, Object> body) {
        Student s = requireMine();
        Skill sk = new Skill();
        sk.setStudentId(s.getId());
        sk.setSkillName(String.valueOf(body.get("skillName")));
        if (body.get("rating") instanceof Number n) sk.setRating(n.intValue());
        else sk.setRating(1);
        return skills.save(sk);
    }

    @Transactional
    public void deleteSkill(String id) {
        Skill sk = skills.findById(id).orElseThrow(() -> ApiException.notFound("Skill"));
        assertOwner(sk.getStudentId());
        skills.delete(sk);
    }

    @Transactional
    public Education addEducation(Map<String, Object> body) {
        Education e = new Education();
        e.setStudentId(requireMine().getId());
        e.setDegree(str(body.get("degree")));
        e.setInstitution(str(body.get("institution")));
        if (body.get("startYear") instanceof Number n) e.setStartYear(n.intValue());
        if (body.get("endYear") instanceof Number n) e.setEndYear(n.intValue());
        e.setDescription(str(body.get("description")));
        return education.save(e);
    }

    @Transactional
    public Education updateEducation(String id, Map<String, Object> body) {
        Education e = education.findById(id).orElseThrow(() -> ApiException.notFound("Education"));
        assertOwner(e.getStudentId());
        if (body.containsKey("degree")) e.setDegree(str(body.get("degree")));
        if (body.containsKey("institution")) e.setInstitution(str(body.get("institution")));
        if (body.containsKey("description")) e.setDescription(str(body.get("description")));
        return education.save(e);
    }

    @Transactional
    public void deleteEducation(String id) {
        Education e = education.findById(id).orElseThrow(() -> ApiException.notFound("Education"));
        assertOwner(e.getStudentId());
        education.delete(e);
    }

    @Transactional
    public Experience addExperience(Map<String, Object> body) {
        Experience e = new Experience();
        e.setStudentId(requireMine().getId());
        e.setTitle(str(body.get("title")));
        e.setCompany(str(body.get("company")));
        e.setStart(str(body.get("start")));
        e.setEnd(str(body.get("end")));
        e.setDescription(str(body.get("description")));
        return experiences.save(e);
    }

    @Transactional
    public Experience updateExperience(String id, Map<String, Object> body) {
        Experience e = experiences.findById(id).orElseThrow(() -> ApiException.notFound("Experience"));
        assertOwner(e.getStudentId());
        copy(body, e, "title", "company", "start", "end", "description");
        return experiences.save(e);
    }

    @Transactional
    public void deleteExperience(String id) {
        Experience e = experiences.findById(id).orElseThrow(() -> ApiException.notFound("Experience"));
        assertOwner(e.getStudentId());
        experiences.delete(e);
    }

    @Transactional
    public Project addProject(Map<String, Object> body) {
        Project p = new Project();
        p.setStudentId(requireMine().getId());
        p.setTitle(str(body.get("title")));
        p.setDescription(str(body.get("description")));
        p.setTechnologies(body.get("technologies") == null ? "[]" : (body.get("technologies") instanceof String
                ? str(body.get("technologies")) : jsons.toJson(body.get("technologies"))));
        p.setGithubUrl(str(body.get("githubUrl")));
        p.setLiveUrl(str(body.get("liveUrl")));
        return projects.save(p);
    }

    @Transactional
    public Project updateProject(String id, Map<String, Object> body) {
        Project p = projects.findById(id).orElseThrow(() -> ApiException.notFound("Project"));
        assertOwner(p.getStudentId());
        copy(body, p, "title", "description", "githubUrl", "liveUrl");
        if (body.containsKey("technologies")) {
            Object t = body.get("technologies");
            p.setTechnologies(t instanceof String ? t.toString() : jsons.toJson(t));
        }
        return projects.save(p);
    }

    @Transactional
    public void deleteProject(String id) {
        Project p = projects.findById(id).orElseThrow(() -> ApiException.notFound("Project"));
        assertOwner(p.getStudentId());
        projects.delete(p);
    }

    public Map<String, Object> generateProjectContent(Map<String, Object> body) {
        String prompt = "Write a resume-ready project summary and 4 bullet points for: "
                + body.getOrDefault("title", "") + "\n" + body.getOrDefault("description", "")
                + "\nTechnologies: " + body.getOrDefault("technologies", "")
                + "\nReturn JSON {summary, bullets: string[], skills: string[]}.";
        String json = ai.generateJson(prompt);
        return Map.of("success", true, "content", json);
    }

    @Transactional
    public Achievement addAchievement(Map<String, Object> body) {
        Achievement a = new Achievement();
        a.setStudentId(requireMine().getId());
        a.setTitle(str(body.get("title")));
        a.setDescription(str(body.get("description")));
        a.setHasCertificate(Boolean.TRUE.equals(body.get("hasCertificate")));
        a.setCertificateUrl(str(body.get("certificateUrl")));
        return achievements.save(a);
    }

    @Transactional
    public void deleteAchievement(String id) {
        Achievement a = achievements.findById(id).orElseThrow(() -> ApiException.notFound("Achievement"));
        assertOwner(a.getStudentId());
        achievements.delete(a);
    }

    @Transactional
    public Map<String, Object> uploadResume(MultipartFile file, String title) {
        CurrentUser.requireRole(Roles.STUDENT);
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("No file uploaded. Please select a PDF file.");
        }
        if (file.getSize() > 5L * 1024 * 1024) {
            throw ApiException.badRequest("File size exceeds 5MB limit");
        }
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String contentType = file.getContentType() == null ? "" : file.getContentType();
        if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")
                && !"application/pdf".equalsIgnoreCase(contentType)) {
            throw ApiException.badRequest("Only PDF files are allowed for resumes");
        }
        Student s = requireMine();
        Map<String, Object> up = cloudinary.upload(file, "students/" + s.getUserId() + "/resumes", "raw");
        String url = String.valueOf(up.getOrDefault("secure_url", up.get("url")));
        StudentResumeFile row = new StudentResumeFile();
        row.setStudentId(s.getId());
        row.setUserId(s.getUserId());
        row.setFileUrl(url);
        row.setFileName(name.isBlank() ? "resume.pdf" : name);
        row.setFileSize((int) Math.min(file.getSize(), Integer.MAX_VALUE));
        row.setPublicId(String.valueOf(up.get("public_id")));
        row.setTitle(title == null || title.isBlank() ? row.getFileName() : title);
        row.setIsDefault(resumes.findByStudentId(s.getId()).isEmpty());
        row.setUploadedAt(Instant.now());
        resumes.save(row);
        if (Boolean.TRUE.equals(row.getIsDefault())) {
            s.setResumeUrl(row.getFileUrl());
            s.setResumeFileName(row.getFileName());
            s.setResumeUploadedAt(Instant.now());
            students.save(s);
        }
        return resumePayload(row);
    }

    public List<Map<String, Object>> listResumes() {
        return resumes.findByStudentId(requireMine().getId()).stream().map(this::resumePayload).toList();
    }

    public Map<String, Object> resumeViewUrl(String resumeId) {
        StudentResumeFile r = resumes.findById(resumeId).orElseThrow(() -> ApiException.notFound("Resume"));
        assertOwner(r.getStudentId());
        return Map.of("url", r.getFileUrl() == null ? "" : r.getFileUrl());
    }

    @Transactional
    public void deleteResume(String resumeId) {
        StudentResumeFile r = resumes.findById(resumeId).orElseThrow(() -> ApiException.notFound("Resume"));
        assertOwner(r.getStudentId());
        cloudinary.destroy(r.getPublicId(), "raw");
        resumes.delete(r);
    }

    @Transactional
    public Map<String, Object> setDefaultResume(String resumeId) {
        Student s = requireMine();
        StudentResumeFile chosen = resumes.findById(resumeId).orElseThrow(() -> ApiException.notFound("Resume"));
        assertOwner(chosen.getStudentId());
        for (StudentResumeFile r : resumes.findByStudentId(s.getId())) {
            r.setIsDefault(r.getId().equals(resumeId));
            resumes.save(r);
        }
        s.setResumeUrl(chosen.getFileUrl());
        s.setResumeFileName(chosen.getFileName());
        students.save(s);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("message", "Default resume updated successfully");
        out.put("resume", resumePayload(resumes.findById(resumeId).orElseThrow()));
        return out;
    }

    @Transactional
    public Map<String, Object> uploadProfileImage(MultipartFile file) {
        CurrentUser.requireRole(Roles.STUDENT);
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("No file uploaded");
        }
        Student s = requireMine();
        if (s.getProfileImagePublicId() != null) {
            cloudinary.destroy(s.getProfileImagePublicId(), "image");
        }
        Map<String, Object> up = cloudinary.upload(file, "students/" + s.getUserId() + "/profile", "image");
        String url = String.valueOf(up.getOrDefault("secure_url", up.get("url")));
        s.setProfileImageUrl(url);
        s.setProfileImagePublicId(String.valueOf(up.get("public_id")));
        students.save(s);
        users.findById(s.getUserId()).ifPresent(u -> {
            u.setProfilePhoto(url);
            users.save(u);
        });
        return Map.of("success", true, "profileImage", Map.of("url", url));
    }

    @Transactional
    public Map<String, Object> deleteProfileImage() {
        CurrentUser.requireRole(Roles.STUDENT);
        Student s = requireMine();
        cloudinary.destroy(s.getProfileImagePublicId(), "image");
        s.setProfileImageUrl(null);
        s.setProfileImagePublicId(null);
        students.save(s);
        return Map.of("success", true);
    }

    private Map<String, Object> resumePayload(StudentResumeFile row) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", row.getId());
        m.put("url", row.getFileUrl());
        m.put("fileUrl", row.getFileUrl());
        m.put("fileName", row.getFileName());
        m.put("fileSize", row.getFileSize());
        m.put("title", row.getTitle());
        m.put("isDefault", row.getIsDefault());
        m.put("uploadedAt", row.getUploadedAt());
        m.put("publicId", row.getPublicId());
        return m;
    }

    public Map<String, Object> atsAnalysis(Map<String, Object> body) {
        String prompt = "Score this resume for ATS (0-100) and list missing keywords. Resume:\n"
                + body.getOrDefault("text", "") + "\nJob:\n" + body.getOrDefault("jobDescription", "")
                + "\nReturn JSON {score, keywordsMissing, summary}.";
        return Map.of("success", true, "analysis", ai.generateJson(prompt));
    }

    public Map<String, Object> optimizeResume(Map<String, Object> body) {
        String prompt = "Optimize this resume for the job. Resume:\n" + body.getOrDefault("text", "")
                + "\nJob:\n" + body.getOrDefault("jobDescription", "")
                + "\nReturn JSON {optimizedText, changes}.";
        return Map.of("success", true, "result", ai.generateJson(prompt));
    }

    @Transactional
    public Map<String, Object> generatePublicProfile() {
        Student s = requireMine();
        if (s.getPublicProfileId() == null) {
            s.setPublicProfileId(UUID.randomUUID().toString().substring(0, 10));
            students.save(s);
        }
        return Map.of("publicProfileId", s.getPublicProfileId());
    }

    public Student publicProfile(String publicId) {
        return students.findByPublicProfileId(publicId).orElseThrow(() -> ApiException.notFound("Profile"));
    }

    private void assertOwner(String studentId) {
        if (!requireMine().getId().equals(studentId) && !Roles.isAdmin(CurrentUser.require().getRole())) {
            throw ApiException.forbidden("Forbidden");
        }
    }

    private static void copy(Map<String, Object> body, Object target, String... fields) {
        for (String f : fields) {
            if (!body.containsKey(f) || body.get(f) == null) continue;
            try {
                var m = target.getClass().getMethod("set" + Character.toUpperCase(f.charAt(0)) + f.substring(1), String.class);
                m.invoke(target, body.get(f).toString());
            } catch (Exception ignored) {
                // skip non-string
            }
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
