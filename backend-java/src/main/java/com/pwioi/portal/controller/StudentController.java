package com.pwioi.portal.controller;

import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.StudentService;
import com.pwioi.portal.util.Jsons;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService students;

    public StudentController(StudentService students) {
        this.students = students;
    }

    @GetMapping("/profile")
    public Object profile() { return students.getProfile(); }

    @PutMapping("/profile")
    public Object updateProfile(@RequestBody Map<String, Object> body) { return students.updateProfile(body); }

    @GetMapping
    public Object all(@RequestParam Map<String, String> query) { return students.listForAdmin(query); }

    @PatchMapping("/{studentId}/block")
    public Object block(@PathVariable String studentId, @RequestBody Map<String, Object> body) {
        return students.block(studentId, body);
    }

    @GetMapping("/skills")
    public Object skills() { return students.listSkills(); }

    @PostMapping("/skills")
    public Object addSkill(@RequestBody Map<String, Object> body) { return students.addSkill(body); }

    @DeleteMapping("/skills/{skillId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSkill(@PathVariable String skillId) { students.deleteSkill(skillId); }

    @PostMapping("/education")
    public Object addEdu(@RequestBody Map<String, Object> body) { return students.addEducation(body); }

    @PutMapping("/education/{educationId}")
    public Object updEdu(@PathVariable String educationId, @RequestBody Map<String, Object> body) {
        return students.updateEducation(educationId, body);
    }

    @DeleteMapping("/education/{educationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delEdu(@PathVariable String educationId) { students.deleteEducation(educationId); }

    @PostMapping("/experience")
    public Object addExp(@RequestBody Map<String, Object> body) { return students.addExperience(body); }

    @PutMapping("/experience/{experienceId}")
    public Object updExp(@PathVariable String experienceId, @RequestBody Map<String, Object> body) {
        return students.updateExperience(experienceId, body);
    }

    @DeleteMapping("/experience/{experienceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delExp(@PathVariable String experienceId) { students.deleteExperience(experienceId); }

    @PostMapping("/projects")
    public Object addProject(@RequestBody Map<String, Object> body) { return students.addProject(body); }

    @PutMapping("/projects/{projectId}")
    public Object updProject(@PathVariable String projectId, @RequestBody Map<String, Object> body) {
        return students.updateProject(projectId, body);
    }

    @DeleteMapping("/projects/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delProject(@PathVariable String projectId) { students.deleteProject(projectId); }

    @PostMapping("/generate-project-content")
    public Object genProject(@RequestBody Map<String, Object> body) { return students.generateProjectContent(body); }

    @PostMapping("/achievements")
    public Object addAch(@RequestBody Map<String, Object> body) { return students.addAchievement(body); }

    @DeleteMapping("/achievements/{achievementId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delAch(@PathVariable String achievementId) { students.deleteAchievement(achievementId); }

    @PostMapping(value = "/resume", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object uploadResume(
            @RequestParam(value = "resume", required = false) MultipartFile resume,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        MultipartFile chosen = resume != null && !resume.isEmpty() ? resume : file;
        return students.uploadResume(chosen, title);
    }

    @GetMapping("/resumes")
    public Object resumes() { return students.listResumes(); }

    @GetMapping("/resume/{resumeId}/view-url")
    public Object resumeViewUrl(@PathVariable String resumeId) { return students.resumeViewUrl(resumeId); }

    @DeleteMapping("/resume/{resumeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delResume(@PathVariable String resumeId) { students.deleteResume(resumeId); }

    @PatchMapping("/resume/{resumeId}/default")
    public Object defaultResume(@PathVariable String resumeId) { return students.setDefaultResume(resumeId); }

    @PostMapping(value = "/profile-image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public Object uploadPhoto(@RequestParam("profileImage") MultipartFile file) {
        return students.uploadProfileImage(file);
    }

    @DeleteMapping("/profile-image")
    public Object deletePhoto() { return students.deleteProfileImage(); }

    @PostMapping("/resume/ats-analysis")
    public Object ats(@RequestBody Map<String, Object> body) { return students.atsAnalysis(body); }

    @PostMapping("/resume/optimize")
    public Object optimize(@RequestBody Map<String, Object> body) { return students.optimizeResume(body); }

    @PostMapping("/public-profile/generate")
    public Object pubGen() { return students.generatePublicProfile(); }

    @PostMapping("/public-profile/regenerate")
    public Object pubRegen() { return students.generatePublicProfile(); }

    @GetMapping("/public-profile/settings")
    public Object publicSettings() { return students.getPublicProfileSettings(); }

    @PatchMapping("/public-profile/settings")
    public Object updatePublicSettings(@RequestBody Map<String, Object> body) {
        return students.updatePublicProfileSettings(body);
    }
}
