package com.pwioi.portal.controller;

import com.pwioi.portal.coding.Judge0Service;
import com.pwioi.portal.security.CurrentUser;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/code")
public class CodeController {
    private final Judge0Service judge0;

    public CodeController(Judge0Service judge0) {
        this.judge0 = judge0;
    }

    @PostMapping("/run")
    public Map<String, Object> run(@RequestBody Map<String, Object> body) {
        CurrentUser.require();
        return judge0.run(body);
    }

    @PostMapping("/evaluate")
    public Map<String, Object> evaluate(@RequestBody Map<String, Object> body) {
        CurrentUser.require();
        return judge0.run(body);
    }
}
