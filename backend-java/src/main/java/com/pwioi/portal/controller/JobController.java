package com.pwioi.portal.controller;

import com.pwioi.portal.service.JobService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/jobs")
public class JobController {
    private final JobService jobs;

    public JobController(JobService jobs) {
        this.jobs = jobs;
    }

    @GetMapping("/targeted")
    public Object targeted() { return jobs.targeted(); }

    @GetMapping
    public Object list(@RequestParam Map<String, String> query) { return jobs.list(query); }

    @GetMapping("/{jobId}")
    public Object get(@PathVariable String jobId) {
        return Map.of("success", true, "data", jobs.get(jobId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Object create(@RequestBody Map<String, Object> body) {
        return Map.of(
                "success", true,
                "message", "Job created successfully. It has been sent for review and will appear in the \"In Review\" section.",
                "data", jobs.create(body)
        );
    }

    @PutMapping("/{jobId}")
    public Object update(@PathVariable String jobId, @RequestBody Map<String, Object> body) {
        return jobs.update(jobId, body);
    }

    @PatchMapping("/{jobId}/recruiter-note")
    public Object note(@PathVariable String jobId, @RequestBody Map<String, Object> body) {
        return jobs.recruiterNote(jobId, body);
    }

    @PostMapping("/{jobId}/post")
    public Object post(@PathVariable String jobId, @RequestBody(required = false) Map<String, Object> body) {
        return jobs.post(jobId, body == null ? Map.of() : body);
    }

    @PostMapping("/{jobId}/approve")
    public Object approve(@PathVariable String jobId) { return jobs.approve(jobId); }

    @PostMapping("/{jobId}/reject")
    public Object reject(@PathVariable String jobId, @RequestBody(required = false) Map<String, Object> body) {
        return jobs.reject(jobId, body == null ? Map.of() : body);
    }

    @DeleteMapping("/{jobId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String jobId) { jobs.delete(jobId); }
}
