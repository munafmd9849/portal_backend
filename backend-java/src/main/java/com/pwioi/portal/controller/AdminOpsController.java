package com.pwioi.portal.controller;

import com.pwioi.portal.repository.StudentRepository;
import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.JobOpportunitiesService;
import com.pwioi.portal.service.StudentService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminOpsController {
    private final StudentRepository students;
    private final JobOpportunitiesService jobOpportunities;
    private final StudentService studentService;

    public AdminOpsController(StudentRepository students, JobOpportunitiesService jobOpportunities,
                              StudentService studentService) {
        this.students = students;
        this.jobOpportunities = jobOpportunities;
        this.studentService = studentService;
    }

    @GetMapping("/api/admin/readiness/summary")
    public Object readinessSummary() {
        CurrentUser.requireRole(Roles.ADMIN);
        return Map.of("totalStudents", students.count(), "ready", 0, "notReady", students.count());
    }

    @GetMapping("/api/admin/readiness/students")
    public Object readinessStudents() {
        CurrentUser.requireRole(Roles.ADMIN);
        return students.findAll();
    }

    @GetMapping("/api/admin/job-opportunities/overview")
    public Object joOverview(@RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.overview(query);
    }

    @GetMapping("/api/admin/job-opportunities/breakdown/{cardKey}")
    public Object joBreakdown(@PathVariable String cardKey, @RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.breakdown(cardKey, query);
    }

    @GetMapping("/api/admin/job-opportunities/cr-managers")
    public Object joCrManagers(@RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.crManagers(query);
    }

    @GetMapping("/api/admin/job-opportunities/mom-table")
    public Object joMom(@RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.momTable(query);
    }

    @GetMapping("/api/admin/job-opportunities/filter-options")
    public Object joFilters() {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.filterOptions();
    }

    @GetMapping("/api/admin/control-tower/all")
    public Object controlTower(@RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.controlTowerAll(query);
    }

    @GetMapping("/api/admin/control-tower/filters")
    public Object ctFilters() {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.controlTowerFilters();
    }

    @GetMapping("/api/admin/control-tower/job-opportunities")
    public Object ctJobs(@RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.controlTowerAll(query).get("jobOpportunities");
    }

    @GetMapping("/api/admin/control-tower/students")
    public Object ctStudents() {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.studentAnalytics();
    }

    @GetMapping("/api/admin/control-tower/career-services")
    public Object ctCareer() {
        CurrentUser.requireRole(Roles.ADMIN);
        return jobOpportunities.careerServicesAnalytics();
    }

    @GetMapping("/api/admin/resume-ats")
    public Object resumeAts() {
        CurrentUser.requireRole(Roles.ADMIN);
        return students.findAll();
    }

    @GetMapping("/api/admin/student-directory")
    public Object directory(@RequestParam Map<String, String> query) {
        CurrentUser.requireRole(Roles.ADMIN);
        return studentService.listForAdmin(query);
    }

    @GetMapping("/api/admin/placement-calendar/events")
    public Object calEvents() {
        CurrentUser.requireRole(Roles.ADMIN, Roles.RECRUITER);
        return List.of();
    }

    @GetMapping("/api/calendar/status")
    public Object calStatus() {
        CurrentUser.require();
        return Map.of("connected", false);
    }

    @GetMapping("/api/google/calendar/status")
    public Object gcalStatus() {
        CurrentUser.require();
        return Map.of("connected", false);
    }

    @GetMapping("/api/google/calendar/oauth-url")
    public Object gcalUrl() {
        CurrentUser.require();
        return Map.of("url", "");
    }
}
