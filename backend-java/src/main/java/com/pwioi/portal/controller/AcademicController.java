package com.pwioi.portal.controller;
import com.pwioi.portal.service.AcademicService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/academic")
public class AcademicController {
    private final AcademicService academic;
    public AcademicController(AcademicService academic) { this.academic = academic; }
    @GetMapping("/schools") public Object schools() { return academic.schools(); }
    @PostMapping("/schools") public Object cs(@RequestBody Map<String, Object> b) { return academic.createSchool(b); }
    @PatchMapping("/schools/{id}") public Object us(@PathVariable String id, @RequestBody Map<String, Object> b) { return academic.updateSchool(id, b); }
    @DeleteMapping("/schools/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void ds(@PathVariable String id) { academic.deleteSchool(id); }
    @GetMapping("/centers") public Object centers() { return academic.centers(); }
    @PostMapping("/centers") public Object cc(@RequestBody Map<String, Object> b) { return academic.createCenter(b); }
    @PatchMapping("/centers/{id}") public Object uc(@PathVariable String id, @RequestBody Map<String, Object> b) { return academic.updateCenter(id, b); }
    @DeleteMapping("/centers/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void dc(@PathVariable String id) { academic.deleteCenter(id); }
    @GetMapping("/batches") public Object batches() { return academic.batches(); }
    @PostMapping("/batches") public Object cb(@RequestBody Map<String, Object> b) { return academic.createBatch(b); }
    @PatchMapping("/batches/{id}") public Object ub(@PathVariable String id, @RequestBody Map<String, Object> b) { return academic.updateBatch(id, b); }
    @DeleteMapping("/batches/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void db(@PathVariable String id) { academic.deleteBatch(id); }
}
