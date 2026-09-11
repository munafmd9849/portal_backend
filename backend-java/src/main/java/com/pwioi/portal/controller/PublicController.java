package com.pwioi.portal.controller;
import com.pwioi.portal.service.StudentService;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/public")
public class PublicController {
    private final StudentService students;
    public PublicController(StudentService students) { this.students = students; }
    @GetMapping("/profile/{publicProfileId}")
    public Object profile(@PathVariable String publicProfileId) { return students.publicProfile(publicProfileId); }
}
