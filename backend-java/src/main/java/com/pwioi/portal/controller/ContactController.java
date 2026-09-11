package com.pwioi.portal.controller;
import com.pwioi.portal.service.EmailService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/contact")
public class ContactController {
    private final EmailService email;
    public ContactController(EmailService email) { this.email = email; }
    @PostMapping
    public Map<String, Object> submit(@RequestBody Map<String, String> body) {
        email.send("admissions@pwioi.com", "Contact: " + body.getOrDefault("subject", "Website"),
                body.getOrDefault("name","") + " <" + body.getOrDefault("email","") + ">\n" + body.getOrDefault("message",""));
        return Map.of("success", true, "message", "Message received");
    }
}
