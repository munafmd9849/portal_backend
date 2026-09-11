package com.pwioi.portal.controller;

import com.pwioi.portal.coding.Judge0Service;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    private final Judge0Service judge0;

    public HealthController(Judge0Service judge0) {
        this.judge0 = judge0;
    }

    @GetMapping("/")
    public Map<String, Object> root() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", "PWIOI Placement Portal API");
        m.put("stack", "Spring Boot");
        m.put("docs", "/api-docs");
        return m;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", "ok");
        m.put("judge0", judge0.status());
        return m;
    }
}
