package com.pwioi.portal.controller;

import com.pwioi.portal.service.ApplicationService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {
    private final ApplicationService applications;

    public ApplicationController(ApplicationService applications) {
        this.applications = applications;
    }

    @GetMapping
    public Object all() { return applications.all(); }

    @GetMapping("/student")
    public Object mine() { return applications.mine(); }

    @GetMapping("/student/interview-history")
    public Object interviewHistory() { return applications.interviewHistory(); }

    @PostMapping("/jobs/{jobId}")
    public Object apply(@PathVariable String jobId, @RequestBody(required = false) Map<String, Object> body) {
        return applications.apply(jobId, body == null ? Map.of() : body);
    }

    @PatchMapping("/{applicationId}/status")
    public Object status(@PathVariable String applicationId, @RequestBody Map<String, Object> body) {
        return applications.updateStatus(applicationId, body);
    }

    @PostMapping("/{applicationId}/withdraw")
    public Object withdraw(@PathVariable String applicationId) { return applications.withdraw(applicationId); }

    @PostMapping("/{applicationId}/offer-response")
    public Object offer(@PathVariable String applicationId, @RequestBody Map<String, Object> body) {
        return applications.offerResponse(applicationId, body);
    }

    @PostMapping("/{applicationId}/revoke")
    public Object revoke(@PathVariable String applicationId, @RequestBody(required = false) Map<String, Object> body) {
        return applications.revoke(applicationId, body == null ? Map.of() : body);
    }

    @PostMapping("/{applicationId}/restore")
    public Object restore(@PathVariable String applicationId) { return applications.restore(applicationId); }
}
