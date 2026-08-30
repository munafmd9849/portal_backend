package com.pwioi.portal.controller;

import com.pwioi.portal.security.CurrentUser;
import com.pwioi.portal.security.Roles;
import com.pwioi.portal.service.SuperAdminService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/super-admin")
public class SuperAdminController {
    private final SuperAdminService superAdmins;

    public SuperAdminController(SuperAdminService superAdmins) {
        this.superAdmins = superAdmins;
    }

    @GetMapping("/admins")
    public Object listAdmins() {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.listAdmins();
    }

    @PostMapping("/admins")
    public ResponseEntity<Object> createAdmin(@RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return ResponseEntity.status(HttpStatus.CREATED).body(superAdmins.createAdmin(body));
    }

    @PatchMapping("/admins/{userId}")
    public Object updateAdmin(@PathVariable String userId, @RequestBody Map<String, Object> body) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.updateAdmin(userId, body);
    }

    @PatchMapping("/admins/{userId}/disable")
    public Object disableAdmin(@PathVariable String userId) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.disableAdmin(userId, CurrentUser.require().getId());
    }

    @PatchMapping("/admins/{userId}/enable")
    public Object enableAdmin(@PathVariable String userId) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.enableAdmin(userId);
    }

    @GetMapping("/admins/{userId}/performance")
    public Object performance(@PathVariable String userId) {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.performance(userId);
    }

    @GetMapping("/stats")
    public Object stats() {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.stats();
    }

    @GetMapping("/stats/summary")
    public Object statsSummary() {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.statsSummary();
    }

    @GetMapping("/analytics/overview")
    public Object analytics() {
        CurrentUser.requireRole(Roles.SUPER_ADMIN);
        return superAdmins.stats();
    }
}
